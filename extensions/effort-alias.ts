import {
  CustomEditor,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

const target = "/thinking";
const alias = "/effort";

export default function (pi: ExtensionAPI) {
  let submit: CustomEditor["onSubmit"];

  pi.registerCommand(alias.slice(1), {
    description: "Alias for /thinking",
    async handler(args, ctx) {
      if (ctx.mode !== "tui") return;
      if (!submit) {
        ctx.ui.notify(
          "/effort is unavailable. Run /reload and try again.",
          "error",
        );
        return;
      }
      await submit(args ? `${target} ${args}` : target);
    },
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    // Pi has no public built-in command API. It assigns its native submit
    // callback to every custom editor, so capture it without keeping the slot.
    const previous = ctx.ui.getEditorComponent();
    let probe: CustomEditor | undefined;
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      probe = new CustomEditor(tui, theme, keybindings);
      return probe;
    });
    submit = probe?.onSubmit;
    ctx.ui.setEditorComponent(previous);

    // Reuse /thinking's argument suggestions for the current model.
    ctx.ui.addAutocompleteProvider((current) => ({
      triggerCharacters: current.triggerCharacters,
      getSuggestions(lines, line, col, options) {
        const text = lines[line] ?? "";
        if (
          options.force ||
          !text.slice(0, col).trimStart().startsWith(`${alias} `)
        ) {
          return current.getSuggestions(lines, line, col, options);
        }
        const rewritten = [...lines];
        rewritten[line] = text.replace(alias, target);
        return current.getSuggestions(
          rewritten,
          line,
          col + target.length - alias.length,
          options,
        );
      },
      applyCompletion: (lines, line, col, item, prefix) =>
        current.applyCompletion(lines, line, col, item, prefix),
      shouldTriggerFileCompletion: (lines, line, col) =>
        current.shouldTriggerFileCompletion?.(lines, line, col) ?? true,
    }));
  });
}
