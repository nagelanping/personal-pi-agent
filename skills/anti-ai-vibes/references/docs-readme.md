## Documentation and README Prompt

Apply the always-on rules in `SKILL.md` first. Read this file completely for README files, API documentation, guides, changelogs, release notes, architecture documents, and project documentation.

### Execution order

1. Read the repository, relevant implementation, existing documentation conventions, and user-supplied facts.
2. Freeze commands, paths, configuration keys, defaults, links, supported versions, warnings, and compatibility claims.
3. Apply the existing documentation workflow below.
4. Apply the upstream Simple English guidance below.
5. Verify examples and claims against the repository. Mark missing facts as unknown; do not complete them by guesswork.

### Protected content

Do not alter commands, options, paths, defaults, version bounds, links, API behavior, side effects, permissions, recovery steps, or known limitations merely to make prose smoother.

### Domain workflow

Match the repository's existing terminology and Markdown conventions.

#### Draft mode

Start with what the project or component does, adding intended users and scope only when they affect use. Put the shortest working path before background material: prerequisites, install, minimal example, and expected result.
Organize headings around reader tasks or stable concepts, avoiding generic sections such as `Overview` when a specific heading is clearer. Use tables only for genuine comparison or repeated fields, with neutral headers such as `Option`, `Default`, `Effect`, `Status`, and `Result`.

Use exact commands, paths, configuration keys, defaults, and supported versions; do not replace missing facts with plausible text. Keep examples runnable and consistent with the current API, preferring one representative example over several near-duplicates.
Explain limits, side effects, destructive steps, required permissions, and recovery near the relevant command. State project status factually, replacing claims such as “production-ready,” “powerful,” or “seamless” with tested capabilities and known limits.

#### Revision mode

1. Verify names, commands, links, defaults, and examples against the repository before changing prose.
2. Keep valid technical detail. Remove duplicate introductions, repeated conclusions, filler transitions, marketing claims, and paragraphs that only restate headings.
3. Move prerequisites and warnings to the step where the reader needs them.
4. Convert dense prose to a list only when the items are parallel. Do not turn every paragraph into bullets.
5. Preserve established terms across README, CLI help, configuration, and code. Do not invent friendlier aliases.
6. Do not expand scope. If the source lacks a required fact, mark it unknown or ask; do not infer it.

#### Preferred patterns

- `Run <command>. It creates <artifact> at <path>.`
- `<option>` controls `<behavior>`. Default: `<value>`.
- `This command deletes <scope>. Back up <data> before running it.`
- `原因未查明。` for an unresolved cause; list confirmed symptoms separately.

Avoid:

- “Welcome to…”, “Let’s dive in”, “This comprehensive guide will walk you through…”.
- Feature tours before the minimal use path.
- Empty adjectives, emoji decoration, and badges that do not convey maintained status.
- Repeating the same information in the introduction, feature list, and conclusion.

#### Promotional claims

Prohibited by default unless the text supplies a defined comparison and evidence:

`state-of-the-art`, `cutting-edge`, `game-changing`, `groundbreaking`, `revolutionary`, `transformative`, `innovative`, `pioneering`, `world-class`, `best-in-class`, `industry-leading`, `market-leading`, `enterprise-grade`, `production-ready`, `mission-critical`, `future-proof`, `unparalleled`, `unmatched`, `unrivaled`, `powerful`, `seamless`, `effortless`, `frictionless`, `bulletproof`, `rock-solid`, `battle-tested`, `comprehensive`, `robust`, `significant impact`, `dramatically`, `exponential`, `redefining`, `revolutionizing`, `unleashing`, `unlocking`, `empowering`

Replace value judgments with the tested property and its bound.

- Weak: `a robust, production-ready pipeline`
- Direct: `The pipeline processed 10,000 records without an error in the reported test.`
- Weak: `a groundbreaking improvement`
- Direct: `Accuracy increased from 0.71 to 0.76 on Dataset A.`
- If no measurement exists: delete the claim.

#### Final check

- A new reader can find the first successful command quickly.
- Commands and examples match the current repository.
- Warnings appear before the risky action.
- Claims describe verified behavior rather than product value.
- Each section answers a distinct reader question.

---

### Upstream Simple English Guidance

Write in Simplified Technical English (STE-100) for a human reader. Use the shortest accurate word, short sentences, and one idea per sentence.
Avoid unexplained jargon, corporate phrasing, AI-tell phrases, and figurative language. Lead with the conclusion, give the context needed to understand it, and use the active voice where natural.
Replace any prohibited term with the simplest word that carries the same meaning.

---

### Additional before-and-after examples

Weak opening:

> Welcome to this comprehensive guide. We will walk you through the seamless setup process.

Direct opening:

> Install the CLI and run `tool init` to create `tool.toml`.

Use the command and path only when the repository confirms them.

Vague option text:

> The cache option provides powerful and flexible performance improvements.

Direct option text:

> `cache_ttl` sets the number of seconds before a cached response expires. Default: `300`.

If the default is unknown, do not invent `300`.

Late warning:

> Run `tool reset`. Note that this may remove your data.

Direct warning before action:

> `tool reset` deletes the local database. Back up `<path>` before running it.

Unknown cause:

> The build probably fails because the cache is stale.

Direct statement:

> The build fails during dependency resolution. 原因未查明。
