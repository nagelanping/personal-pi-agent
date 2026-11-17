import {
  CustomEditor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { fuzzyFilter } from "@earendil-works/pi-tui";

const alias = "/effort";
const target = "/thinking";

function rewriteCommand(text: string): string {
  const trimmed = text.trim();
  // Match the built-in dispatcher's literal-space separator and trimming.
  return trimmed === alias || trimmed.startsWith(`${alias} `)
    ? target + trimmed.slice(alias.length)
    : text;
}

export default function (pi: ExtensionAPI) {
  // The input hook runs too late to invoke TUI built-ins. If an editor bypasses
  // our submit wrapper, consume the alias rather than send it to the model.
  pi.on("input", (event, ctx) => {
    if (ctx.mode !== "tui" || rewriteCommand(event.text) === event.text) return;
    ctx.ui.notify(
      "/effort could not reach the built-in dispatcher. Use /thinking instead.",
      "warning",
    );
    return { action: "handled" };
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const previous = ctx.ui.getEditorComponent();
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      let editor =
        previous?.(tui, theme, keybindings) ??
        new CustomEditor(tui, theme, keybindings);
      let owner: object | null = editor;
      let descriptor: PropertyDescriptor | undefined;
      while (owner && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(owner, "onSubmit");
        if (!descriptor) owner = Object.getPrototypeOf(owner);
      }
      // Do not replace accessors: their setters may wire a child editor.
      // Non-configurable data properties cannot intercept Pi's later assignment.
      if (
        owner !== editor &&
        !Object.isExtensible(editor) &&
        (!descriptor || "value" in descriptor)
      ) {
        ctx.ui.notify(
          "Custom editor cannot accept onSubmit; using the standard editor for safe submission.",
          "warning",
        );
        editor = new CustomEditor(tui, theme, keybindings);
      } else if (
        descriptor &&
        (!("value" in descriptor) ||
          !descriptor.configurable ||
          !descriptor.writable)
      ) {
        const writable =
          "value" in descriptor ? descriptor.writable : Boolean(descriptor.set);
        if (writable) {
          ctx.ui.notify(
            "/effort is unavailable with this custom editor. Use /thinking instead.",
            "warning",
          );
          return editor;
        }
        // Pi unconditionally assigns onSubmit after the factory returns. A
        // read-only editor would throw even without interception.
        ctx.ui.notify(
          "Custom editor has read-only onSubmit; using the standard editor for safe submission.",
          "warning",
        );
        editor = new CustomEditor(tui, theme, keybindings);
      }
      const wrap = (handler: typeof editor.onSubmit) =>
        handler &&
        ((text: string) => handler.call(editor, rewriteCommand(text)));
      let onSubmit = wrap(editor.onSubmit);
      // Pi assigns onSubmit after the factory returns. Rewrite only actual
      // submissions, after keybindings, paste handling and autocomplete.
      Object.defineProperty(editor, "onSubmit", {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get: () => onSubmit,
        set: (handler: typeof onSubmit) => {
          // Capture this assignment, not the mutable slot: later extensions may
          // save the getter result and wrap it again.
          onSubmit = wrap(handler);
        },
      });
      return editor;
    });

    // Built-ins have no public invocation API. Reuse their argument completion
    // provider too, so model-specific thinking levels stay owned by Pi.
    ctx.ui.addAutocompleteProvider((current) => {
      const aliasItem = {
        value: alias.slice(1),
        label: alias.slice(1),
        description: "Alias for /thinking",
      };
      return {
        triggerCharacters: current.triggerCharacters,
        async getSuggestions(lines, line, col, options) {
          const text = (lines[line] ?? "").slice(0, col).trimStart();
          if (!options.force && text.startsWith(`${alias} `)) {
            const rewritten = [...lines];
            rewritten[line] = (lines[line] ?? "").replace(alias, target);
            return current.getSuggestions(
              rewritten,
              line,
              col + target.length - alias.length,
              options,
            );
          }

          const suggestions = await current.getSuggestions(
            lines,
            line,
            col,
            options,
          );
          if (options.force || !/^\/[^ /]*$/.test(text)) return suggestions;
          const items = fuzzyFilter(
            [aliasItem],
            text.slice(1),
            (item) => item.value,
          );
          if (
            items.length === 0 ||
            suggestions?.items.some((item) => item.value === alias.slice(1))
          ) {
            return suggestions;
          }
          return {
            prefix: suggestions?.prefix ?? text,
            items: [...(suggestions?.items ?? []), ...items],
          };
        },
        applyCompletion(lines, line, col, item, prefix) {
          if (item !== aliasItem)
            return current.applyCompletion(lines, line, col, item, prefix);
          // Our item replaces the whole slash token, independently of the
          // replacement prefix used by other providers in the same result.
          const before = (lines[line] ?? "").slice(0, col);
          const start = col - before.trimStart().length;
          const completed = [...lines];
          completed[line] =
            before.slice(0, start) +
            alias +
            " " +
            (lines[line] ?? "").slice(col);
          return {
            lines: completed,
            cursorLine: line,
            cursorCol: start + alias.length + 1,
          };
        },
        shouldTriggerFileCompletion: (lines, line, col) =>
          current.shouldTriggerFileCompletion?.(lines, line, col) ?? true,
      };
    });
    // Pi clears editor factories and autocomplete wrappers on runtime teardown.
  });
}
