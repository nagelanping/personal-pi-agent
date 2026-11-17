import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import {
  type Component,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";

const RESPONSE_TIMESTAMP_ENTRY = "response-timestamp";

// Read the persisted entry format, not the optional package's internal modules.
interface AgentSummaryData {
  commands?: number;
  reads?: number;
  edits?: number;
  others?: number;
  failed?: number;
  durationMs?: number;
}

const SUMMARY_FIELDS = [
  ["commands", "ran ", "command", "s"],
  ["reads", "read ", "file", "s"],
  ["edits", "edited ", "file", "s"],
  ["others", "", "other tool", "s"],
  ["failed", "", "failed", ""],
] as const;

function summarySegments(data: AgentSummaryData) {
  const segments: { text: string; tone: "success" | "failed" }[] = [];
  for (const [key, verb, noun, plural] of SUMMARY_FIELDS) {
    const count = data[key];
    if (
      typeof count !== "number" ||
      !Number.isSafeInteger(count) ||
      count <= 0
    ) {
      continue;
    }
    const text = `${verb}${count} ${noun}${count === 1 ? "" : plural}`;
    segments.push({
      text:
        segments.length === 0
          ? text.charAt(0).toUpperCase() + text.slice(1)
          : text,
      tone: key === "failed" ? "failed" : "success",
    });
  }
  return segments;
}

function formatDuration(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 1000) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface ResponseTimestampData {
  endedAt: number;
}

function quoteLine(body: string, theme: Theme): Component {
  return {
    invalidate() {},
    render(width: number): string[] {
      if (width <= 0) return [];
      return wrapTextWithAnsi(body, Math.max(1, width - 4)).map((line) =>
        truncateToWidth(` ${theme.fg("mdQuoteBorder", "│")} ${line}`, width),
      );
    },
  };
}

export default function (pi: ExtensionAPI): void {
  const localTime = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  let pendingTimestamp: ResponseTimestampData | undefined;

  const flushTimestamp = (): void => {
    if (!pendingTimestamp) return;
    pi.appendEntry(RESPONSE_TIMESTAMP_ENTRY, pendingTimestamp);
    pendingTimestamp = undefined;
  };

  pi.registerEntryRenderer<ResponseTimestampData>(
    RESPONSE_TIMESTAMP_ENTRY,
    (entry, _options, theme) => {
      const endedAt = entry.data?.endedAt;
      if (typeof endedAt !== "number" || !Number.isFinite(endedAt)) {
        return undefined;
      }
      const date = new Date(endedAt);
      if (Number.isNaN(date.getTime())) return undefined;
      return quoteLine(
        theme.style(localTime.format(date), { fg: "mdQuote", italic: true }),
        theme,
      );
    },
  );

  pi.on("message_end", (event) => {
    if (event.message.role !== "assistant") return;
    pendingTimestamp = { endedAt: Date.now() };
  });

  // message_end runs before reply persistence. These boundaries run after it,
  // without waiting for tool execution, and keep restored transcript order intact.
  pi.on("tool_execution_start", flushTimestamp);
  pi.on("turn_end", flushTimestamp);
  pi.on("session_shutdown", () => {
    pendingTimestamp = undefined;
  });

  // Pi uses the first matching entry renderer; load this before pi-cc-extensions.
  pi.registerEntryRenderer<AgentSummaryData>(
    "agent-summary",
    (entry, _options, theme) => {
      const data = entry.data;
      if (!data) return undefined;
      const segments = summarySegments(data);
      if (segments.length === 0) return undefined;
      const quote = (text: string) =>
        theme.style(text, { fg: "mdQuote", italic: true });
      // Render ANSI directly: Markdown strips the count colors.
      const counts = segments
        .map(({ text, tone }) =>
          text
            .split(/(\d+)/)
            .map((part, index) =>
              index === 1
                ? theme.style(part, {
                    fg: tone === "failed" ? "error" : "success",
                    italic: true,
                  })
                : quote(part),
            )
            .join(""),
        )
        .join(quote(", "));
      const duration = formatDuration(data.durationMs);
      const body = counts + (duration ? quote(` · ${duration}`) : "");
      return quoteLine(body, theme);
    },
  );
}
