## Git and GitHub Prompt

Apply the always-on rules in `SKILL.md` first. Read this file completely for commit messages, pull requests, issues, review comments, discussions, and maintainer replies.

### Execution order

1. Read the staged or supplied diff, observed behavior, verification output, and repository templates.
2. Freeze issue references, breaking-change markers, commands, measured results, compatibility facts, and explicit decisions.
3. Apply the existing Git and GitHub workflow below.
4. Apply the upstream Voice guidance below.
5. Compare every claim with the diff or supplied evidence. Remove claims that were not verified.

### Protected content

Do not claim a fix, test result, benchmark, compatibility guarantee, cause, consensus, or delivery date without evidence or authority. Keep facts, inference, and unknowns separate.

### Domain workflow

Follow the repository's commit, issue, and PR templates when present.

#### Commit messages

##### Draft mode

State the change in the subject using the repository's established tense and format, adding the component name when it helps retrieval. In the body, explain why the change was needed, what behavior changed, and any migration or compatibility effect; omit the body when the subject is sufficient.
Describe the actual diff without claiming tests, fixes, performance gains, or compatibility that were not verified. Do not add generated signatures, promotional language, or a file-by-file narration unless required.

##### Revision mode

Compare the message with the staged or supplied diff, preserving issue references and breaking-change markers.
Remove vague subjects such as `update code`, `improve system`, and `various fixes`. Split unrelated claims in the message rather than presenting an unrelated diff as one coherent change.

#### Pull requests

##### Draft mode

Use only the sections that carry information:

1. concise title describing the behavior change;
2. context or problem;
3. exact change;
4. verification performed and its result;
5. risk, compatibility, rollout, or follow-up only when applicable.

Prefer `Tested: <command/result>` over “thoroughly tested.” If not tested, say so directly with the reason.

##### Revision mode

Remove restatements of the title, inflated impact, exhaustive file tours, and boilerplate checklists with no evidence. Keep decisions, trade-offs, known limits, screenshots, benchmarks, migration steps, and reproducible checks.
Ensure the title and summary match the final diff rather than the initial plan.

#### Issues, reviews, and discussions

Lead with the observed behavior or requested decision. Separate reproduction, expected result, actual result, environment, and impact when those fields exist.
Distinguish confirmed facts from inference, and write `原因未查明。` when investigation has not established a cause. Quote the relevant code or error rather than characterizing the author or intent.

In review comments, state the location, consequence, and a concrete fix or question without praise padding or rhetorical questions.
In maintainer replies, answer the request directly, stating acceptance, rejection, missing information, or the next action without canned gratitude. Do not promise timelines or future work without authority.

#### Examples

Weak commit subject:

`Improve robustness and streamline configuration handling`

Direct commit subject:

`Reject config files without a port`

Weak review comment:

`Could we perhaps consider a more robust approach here?`

Direct review comment:

`This catch block discards the parse error, so callers receive an empty config. Return the error or wrap it with the file path.`

#### Corporate and process jargon

Prohibited by default in commit messages, PRs, issues, and maintainer replies:

`leverage`, `utilize`, `initiate`, `finalize`, `remediate`, `facilitate`, `operationalize`, `institutionalize`, `streamline`, `synergy`, `seamless`, `holistic`, `actionable`, `proactive`, `paradigm`, `bandwidth`, `value-add`, `deliverable`, `workstream`, `touchpoint`, `buy-in`, `circle back`, `touch base`, `drill down`, `deep dive`, `moving forward`, `best practice`, `playbook`, `low-hanging fruit`, `win-win`, `move the needle`, `boil the ocean`, `raise the bar`, `push the envelope`, `hit the ground running`, `think outside the box`

Common replacements:

| Trigger             | Prefer when accurate                 |
| ------------------- | ------------------------------------ |
| leverage / utilize  | use                                  |
| initiate / commence | start                                |
| finalize            | finish, approve, publish             |
| remediate           | fix, remove, correct                 |
| facilitate          | allow, help, enable                  |
| streamline          | remove steps, reduce time, simplify  |
| actionable          | name the action                      |
| holistic            | name the included parts              |
| synergy             | combined effect, interaction         |
| bandwidth           | time, staff hours, capacity          |
| deliverable         | report, file, draft, result          |
| best practice       | name the rule or supporting evidence |

#### Final check

- The text matches the diff or observed behavior.
- Verification claims name the check and result.
- Facts, inferences, and unknowns are separate.
- The requested action is explicit.
- No filler, praise padding, generated signature, or unsupported promise remains.

---

### Upstream Voice Guidance

Write each message in plain words and short sentences because a human reader will rely on it. Do not use the prohibited words or AI-tell phrases from `SKILL.md` or this file; replace any match with the simplest accurate term.

---

### Additional before-and-after examples

Weak PR verification:

> This change has been thoroughly tested and should work seamlessly across environments.

Direct PR verification:

> Tested: `npm test` (128 tests passed). Windows was not tested.

Weak issue report:

> The new release is completely broken and probably has a race condition.

Direct issue report:

> Version 2.4 exits with code 1 when two uploads start concurrently. Reproduction steps are below. 原因未查明。

Weak maintainer reply:

> Thanks for bringing this to our attention! We will definitely look into this as soon as possible.

Direct maintainer reply:

> Please provide the full error and the output of `tool --version`. No maintainer is assigned yet.

