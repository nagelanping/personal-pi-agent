## Code and Code-Style Prompt

Apply the always-on rules in `SKILL.md` first. Read this file completely when the task includes source code, tests, identifiers, comments, docstrings, diagnostics, or code review.

### Execution order

1. Read the surrounding code and repository instructions.
2. Freeze behavior, public contracts, identifiers outside scope, security controls, compatibility constraints, and test expectations.
3. Apply the existing domain workflow below.
4. Apply the complete upstream Clean Code guidance below. Its tool-specific trigger metadata is omitted because Pi does not execute that rule format; the operational prompt is retained.
5. Run the smallest relevant repository check and compare the result with the requested scope.

### Protected content

Do not change runtime behavior merely to improve style. Do not weaken validation, error handling, type safety, security, accessibility, compatibility, or data-loss protection. Keep public names stable unless renaming is requested.

### Domain workflow

Repository conventions and formatters take priority.

#### Draft mode

1. Read the surrounding code before writing. Reuse its naming, error, logging, typing, and test patterns.
2. Prefer the standard library, native platform feature, or existing project helper. Do not add an abstraction, dependency, option, or layer for a hypothetical future use.
3. Name values for their domain role and functions for their effect or result. Avoid `data`, `thing`, `helper`, `manager`, `processData`, and similar placeholders when a specific name is available.
4. Make ownership, side effects, and failure behavior visible. Do not swallow errors or hide uncertainty with unsafe casts and assertions.
5. Comment why a constraint or non-obvious decision exists. Do not narrate the next line or leave commented-out code.
6. Use docstrings for public contracts and non-obvious behavior, not for paraphrasing a signature.
7. Write diagnostics that state the failed operation and useful context without exposing secrets. Avoid conversational filler and blame.
8. Keep the change scoped to the requested behavior. Do not bundle unrelated cleanup.

#### Revision mode

1. Preserve behavior unless the user asks for a behavior change.
2. Trace callers before changing a shared name, contract, or error path.
3. Remove generated-looking boilerplate only when it adds no contract, safety, compatibility, or maintenance value.
4. Replace generic names with project-domain names. Keep public identifiers stable unless renaming is in scope.
5. Delete comments that restate code. Update comments that no longer match behavior.
6. Simplify nested or duplicated logic at the shared root cause. Do not spread equivalent guards across callers.
7. Run the smallest relevant formatter, type check, lint, or test already used by the repository.

#### Code comments and docstrings

- Bad: `// Loop through the users and process each user.`
- Better: omit it, or explain the constraint: `// Preserve input order because the API returns results positionally.`
- Bad: `This robust helper seamlessly handles a wide range of inputs.`
- Better: state accepted inputs, output, and failure cases.
- Bad: `Something went wrong.`
- Better: `Failed to parse config at {path}: missing "port".`

#### Final check

- The diff contains no speculative framework or duplicate helper.
- Names use one term per concept and match nearby code.
- Comments explain constraints, not syntax.
- Error paths are explicit and actionable.
- Validation covers the changed behavior without unrelated tests.

---

### Upstream Clean Code Guidance

Write code the next reader can change without guessing. Make behavior, ownership, and failure modes visible. Apply this to every file you write or edit.

A trigger fired. Fix the violation, then retry:

#### Type safety

- `any`: replace with a precise type. Use `unknown` and narrow with guards or a schema parse when the shape is not known. Never use `any` to silence the compiler.
- `@ts-ignore` / `@ts-nocheck`: remove. Fix the underlying type error, or use `@ts-expect-error` when the error is known and will disappear with the fix.
- Non-null assertion (`!`): replace with a runtime check that narrows the type or throws a descriptive error. Do not assert what the code has not verified.
- `debugger`: remove. It stops execution and ships by accident.
- `console.log` / `console.debug`: remove debug output. If logging is intentional, use the project logger; keep `console.error` and `console.warn` for real failures.
- `!!`: use `Boolean(x)` or plain truthiness. Double negation hides intent.
- `parseInt(x)` with one argument: pass the radix (`parseInt(x, 10)`), or use `Number(x)` when the input is already numeric. A missing radix guesses at base 10 and breaks on `0x` or `08`.

#### Errors

- Never swallow an error. An empty catch block, a catch that holds only comments, or an empty `.catch()` handler hides a failure. Every failure needs a decision: handle it, wrap it with context, re-raise it, or return a typed failure. If ignoring a failure is deliberate, log it, say why in a comment, and keep the reason observable.
- Never use a bare `except:`. Name the exceptions you expect. Do not follow an except clause with `pass` or `...`.
- Catch the specific exception the call can raise. A bare `catch {}`, `except Exception`, `recover()`, or `rescue Exception` swallows bugs and keeps the program running on broken state.
- A catch that only rethrows (`catch (e) { throw e; }`) adds nothing. Add context (`throw new WrappedError(e)`) or handle the error.

#### Names

- Give every name a purpose in the local domain. Prefer `resolveInvoiceRecipient` over `handleData`, `remainingRetryBudget` over `count`, `timeoutMs` over `t`.
- Rename single-letter names. Conventional loop indices (`i`, `j`, `k`), coordinates (`x`, `y`), and event params (`e`) may stay.
- Replace generic names (`data`, `item`, `tmp`, `helper`, `manager`, `util`) with domain names.
- Name booleans as predicates (`isSessionExpired`). Name functions for their effect or returned result.
- One concept, one term. Use the same word for the same idea everywhere.

#### Magic numbers

- Extract bare literals into named constants. The name must say why the value exists: `MAX_RETRIES`, `FIVE_SECONDS_MS`.
- `0` and `1` in boundary checks are fine. HTTP and status codes are fine when named.

#### Dead code

- Delete statements that follow a `return`, `throw`, or `raise` — they never run.
- Delete commented-out code. Version control keeps history; a comment explains why, not what was removed.
- Remove `if (true)` scaffolding and `if (false)` branches.
- Delete duplicate object keys; the first entry is shadowed.
- Do not leave unused variables or unreachable branches behind when you edit.

#### State and equality

- Mutable default argument: use `None` (or a sentinel) and build the list, dict, or set inside the function. Never share one container across calls.
- Global state: pass values in and out instead of mutating globals. Replace `global x` and `window.x =` with parameters and return values. Keep package-level values read-only.
- `var`: use `let` or `const` in JavaScript; prefer `:=` for locals in Go.
- Loose equality: use `===` and `!==`. Keep `== null` only when you mean "null or undefined".

#### Comments

- Delete comments that restate the code. Say why, never what.
- Read each comment against the code below it. If the comment is stale or wrong, fix the comment or fix the code.
- Remove TODO, FIXME, HACK, and XXX markers. Do the work now, or move the note to the issue tracker. A finished change carries no markers.
- Remove leftover debug calls: console.log, console.debug, debugger, breakpoint(), todo!().
- Remove `.only(` from tests (`it.only`, `describe.only`, `test.only`). It skips the rest of the suite and ships by accident.
- Remove block-level `eslint-disable` comments. Fix the lint error, or keep a line-scoped disable with a reason on the same line.

#### What triggers cannot see

Check these yourself on the lines you touch: long functions, deep nesting, duplication, unclear data flow, hidden side effects. Keep units focused on one job. Functions with many parameters: bundle related arguments into one options object. Make errors useful: keep the context, hide secrets, and let the caller decide what happens next. Keep the edit minimal. Do not fold unrelated renames or cleanups into the same change.

If a trigger fires, fix it and retry.

---

### Additional before-and-after examples

Bad diagnostic:

`Something went wrong.`

Direct diagnostic:

`Failed to parse config at {path}: missing "port".`

Bad comment:

`// Loop through the users and process each user.`

Direct comment when the constraint matters:

`// Preserve input order because the API returns results positionally.`

Otherwise, omit the comment.

Bad name:

`processData(items)`

Direct name when the function resolves invoice recipients:

`resolveInvoiceRecipients(invoices)`

Use the repository's actual domain term; do not copy the example name into unrelated code.
