import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";
import {
  summaryMarkdown,
  type AgentSummaryData,
} from "../npm/node_modules/pi-cc-extensions/extensions/feature/agent-summary/core.ts";

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
      const line = summaryMarkdown(entry.data as AgentSummaryData, {
        success: theme.getFgAnsi("success"),
        failed: theme.getFgAnsi("error"),
      });
      if (!line) return undefined;
      const timestamp = localTime.format(new Date(entry.timestamp));
      return new Markdown(
        `${line.slice(0, -1)} · ${timestamp}*`,
        1,
        0,
        getMarkdownTheme(),
      );
    },
  );
}
