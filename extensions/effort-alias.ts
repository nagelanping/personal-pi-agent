import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  let unsubscribe: (() => void) | undefined;

  pi.on("session_start", (_event, ctx) => {
    unsubscribe?.();
    if (ctx.mode !== "tui") return;

    // Built-in commands run before input events, so rewrite before submission.
    unsubscribe = ctx.ui.onTerminalInput((data) => {
      if (!matchesKey(data, "enter")) return;
      const text = ctx.ui.getEditorText();
      if (/^\/effort(?= |$)/.test(text)) {
        ctx.ui.setEditorText(text.replace(/^\/effort/, "/thinking"));
      }
    });
  });

  pi.on("session_shutdown", () => {
    unsubscribe?.();
    unsubscribe = undefined;
  });
}
