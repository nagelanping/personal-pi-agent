import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import {
  summarySegments,
  type AgentSummaryData,
} from "../npm/node_modules/pi-cc-extensions/extensions/feature/agent-summary/core.ts";
import { formatDuration } from "../npm/node_modules/pi-cc-extensions/extensions/utils/format.ts";

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

  // Pi uses the first matching entry renderer; load this before pi-cc-extensions.
  pi.registerEntryRenderer<AgentSummaryData>(
    "agent-summary",
    (entry, _options, theme) => {
      const data = entry.data as AgentSummaryData;
      const segments = summarySegments(data);
      if (segments.length === 0) return undefined;
      const timestamp = localTime.format(new Date(entry.timestamp));
      const quote = (text: string) => theme.style(text, { fg: "mdQuote", italic: true });
      // Render ANSI directly: Markdown strips the count colors.
      const counts = segments.map(({ text, tone }) =>
        text.split(/(\d+)/).map((part, index) => index === 1
          ? theme.style(part, { fg: tone === "failed" ? "error" : "success", italic: true })
          : quote(part)).join(""),
      ).join(quote(", "));
      const duration = formatDuration(data.durationMs);
      const body = counts + quote(`${duration ? ` · ${duration}` : ""} · ${timestamp}`);
      return {
        invalidate() {},
        render(width: number): string[] {
          return wrapTextWithAnsi(body, Math.max(1, width - 4)).map((line) =>
            truncateToWidth(` ${theme.fg("mdQuoteBorder", "│")} ${line}`, width),
          );
        },
      };
    },
  );
}
