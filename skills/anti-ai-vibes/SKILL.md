---
name: anti-ai-vibes
description: "Human-facing prose and code-style correction before drafting or during revision. Use when writing or polishing academic text, code/comments, documentation/README, Git commit messages, pull requests, issues, reviews, or GitHub replies; triggers include 去 AI 味、反 AI 感、说人话、润色、人类文风、自然表达, humanize, AI slop, AI-sounding, rewrite naturally. Preserve facts and technical meaning; not for detector evasion claims."
---

## Anti-AI Vibes

### Core constraints

- Preserve facts, numbers, quotations, citations, links, commands, identifiers, uncertainty, and scope.
- Do not invent evidence, causes, intent, personal experience, or a stronger conclusion.
- If the cause is unknown, write honestly. Do not append an untested explanation.
- Treat this as writing-quality work. Do not claim that any wording can evade or pass an AI detector.
- Do not add deliberate errors, slang, fake anecdotes, arbitrary opinions, or random sentence variation to imitate a person.
- A listed word is not banned when it is a standard term, literal description, quotation, identifier, or required project language. Precision overrides the list.

### Execution

1. Determine whether the task is **Draft mode** or **Revision mode**.
2. Apply every rule in this file.
3. Read each matching domain prompt under `references/`; combine prompts when one artifact spans domains.
4. If the user supplies a style guide, template, venue rule, repository convention, or examples of their own writing, follow them before the domain defaults.
5. Compare the output with the source and run the final check.

### Draft mode

Write for the intended reader and task, not for an abstract idea of “professional tone.”

1. Lead with the result, claim, action, or question.
2. Use the established term for each concept. Keep one term for one concept.
3. Prefer concrete nouns and verbs. Replace vague praise, inflated importance, and corporate language with observable facts.
4. Give each sentence one main job. Split a sentence when its clauses do not depend on each other.
5. Use headings and lists only when they help scanning. Do not force every argument into three points.
6. Use neutral labels such as `问题`, `现象`, `影响`, `结果`, `状态`, and `实验设置`.
7. Vary sentence and paragraph length only as the content requires. Do not impose a repeated template.

### Revision mode

1. Freeze facts and protected wording before editing: numbers, citations, quotations, qualifiers, technical terms, code, links, and explicit user decisions.
2. Identify the actual defects: vague wording, filler, repetition, unexplained jargon, canned transitions, template symmetry, unsupported confidence, or inconsistent terms.
3. Rewrite only the defective passages. Keep already clear text.
4. Compare the revision with the source. Restore any changed fact, scope, uncertainty, or attribution.
5. Return the revised text directly unless the user asks for a change log.

### Always-on language screen

Use this screen for all human-facing prose. Treat the entries as **default-prohibited**, not context-free bans. Keep a match only when it is:

- a standard term in the target discipline (`robust estimator`, `stakeholder theory`);
- literal rather than figurative (`navigation task`, `ecological landscape`);
- part of a quotation, citation title, identifier, command, or required house style;
- the most precise available wording.

For every retained match, be able to name the exception. Otherwise delete it or replace it with the fact, mechanism, actor, measurement, or action.

Domain-specific vocabulary lists — academic literary words, promotional claims, corporate jargon, and Chinese research-report metaphors — live in the matching `references/*.md` file and apply when that domain routes.

#### Phrase and pattern groups

##### Empty framing and AI-tell phrases

Delete these openings and endings unless they express a real logical relation:

`it is important to note`, `it is worth noting`, `it is worth mentioning`, `it should be noted`, `as we all know`, `it goes without saying`, `in today's world`, `in today's rapidly evolving world`, `when it comes to`, `let's dive in`, `let's take a look`, `this guide will walk you through`, `keep in mind`, `remember that`, `at the end of the day`, `the bottom line is`, `in a nutshell`, `all in all`, `in conclusion`, `to conclude`, `to sum up`, `to summarize`, `to wrap up`, `in closing`, `last but not least`, `first and foremost`, `as mentioned earlier`, `as previously stated`, `as noted above`, `this section will discuss`, `the following section examines`, `we now turn to`

Do not replace one empty frame with another.

- Weak: `It is important to note that the response rate was 78%.`
- Direct: `The response rate was 78%.`
- Weak: `This section will discuss three limitations.`
- Direct: `The study has three limitations.`

##### Mechanical transitions

Flag these when the sentence order already supplies the relation or when no relation exists:

`additionally`, `moreover`, `furthermore`, `in addition`, `similarly`, `that said`, `with that said`, `having said that`, `with that in mind`, `to that end`, `in the same vein`, `on the flip side`, `firstly`, `secondly`, `thirdly`, `lastly`, `more importantly`, `most importantly`

Keep a transition only when it names the actual relation: contrast, cause, consequence, sequence, concession, or example. Prefer `because`, `however`, `therefore`, and `for example` only when the logic requires them.

- Weak: `Moreover, the second model used the same dataset.`
- Direct: `The second model used the same dataset.`
- Misleading: `Therefore, the groups differed at baseline.` when no preceding cause supports the statement.
- Direct: `The groups differed at baseline.`

##### Weak intensifiers, hedges, and vague quantity

Flag:

`very`, `really`, `extremely`, `incredibly`, `quite`, `rather`, `somewhat`, `basically`, `essentially`, `virtually`, `truly`, `genuinely`, `certainly`, `definitely`, `obviously`, `notably`, `particularly`, `relatively`, `significantly`, `substantially`, `considerably`, `potentially`, `presumably`, `arguably`, `one could argue`, `it is fair to say`, `for the most part`, `more or less`, `to some extent`, `a wide range of`, `a variety of`, `a number of`, `many studies`, `recent research`, `widely recognized`

Do not delete a scientific hedge merely because it matches this group. Preserve `may`, `could`, `suggests`, `likely`, and similar wording when it encodes evidence limits. Replace vague quantity or emphasis with data, citations, scope, or nothing.

- Weak: `A number of recent studies show a significant improvement.`
- Direct: `Three studies reported improvements of 4–9% (Chen, 2023; Iqbal, 2024; Rao, 2024).`
- Unsupported source text: retain the uncertainty and flag the missing support; do not invent values or citations.

##### Defensive negation and disclaimer boilerplate

Flag overuse, especially stacked or preemptive disclaimers that rebut a claim nobody made:

`不能视为`, `不能断言`, `只能说明`, `不能认定`, `不意味着`, `不能证明`, `不证明`, `不能确定`, `不能保证`, `无法说明`, `不能断定`, `不能仅靠`, `不保证`, `不能承诺`, `无法证明`, `不能说明`, `不能推出`, `不完全`, `不足以证明`, `不能仅凭`, `只能证明`, `更准确地说`, `不能说`, `不能据此`, `不能简单`, `不能只看`, `不必然`, `不能只凭`, `不是说明`, `并非`, `不能`, `不等于`, `能把`, `直接`, `而不是`, `不一定`, `不能确认`, `不能当作`, `未能`, `必`, `还不能`, `尚不能`, `不代表`, `并不是`, `不构成`, `不是……而是……`, `不足以说明`

These words are not banned. Keep a negation or limit when it carries the source's evidence boundary, corrects a claim the text or reader actually makes, or states a real failure (`未能复现`). Otherwise state the supported result directly.

- Draft mode: state what the evidence shows. Add a limit only where a reader would plausibly over-read the result, and state it once.
- Revision mode: the source's negations and limits are protected content. Remove only duplicated, stacked, or preemptive disclaimers; never delete or weaken a limit the source actually states.
- Do not stack two disclaimers on one claim (`不能断言，也不能保证`). Do not swap one entry for another from this list.

- Weak: `该结果不能证明方法有效，只能说明在本数据集上准确率提高了 3%。` when no one claimed general effectiveness.
- Direct: `在本数据集上，准确率提高了 3%。`
- Weak: `这并不意味着缓存失效，更准确地说，命中率下降了 12%。`
- Direct: `缓存命中率下降了 12%。`
- Weak: `不直接删除文件，而是移到 archive/`
- Direct: `删除文件时，移到 archive/`
- Weak: `wx 只能防止同路径覆盖，不能保证跨层名称唯一。`
- Direct: `wx 标志保证同一路径不被覆盖；跨层名称唯一由 nameLock 保证。`
- Keep: `差异不显著（p = .18），不能据此认定两种干预等效。` The limit prevents reading a null result as equivalence.

##### Wordy constructions

Prefer the shorter equivalent when meaning is unchanged:

| Wordy                            | Direct                   |
| -------------------------------- | ------------------------ |
| in order to                      | to                       |
| due to the fact that             | because                  |
| at the present time              | now, currently           |
| in the event that                | if                       |
| with regard to / with respect to | about, for               |
| has the ability to               | can                      |
| make use of                      | use                      |
| conduct an investigation of      | investigate              |
| take into consideration          | consider                 |
| a large number of                | many, or the exact count |
| prior to                         | before                   |
| subsequent to                    | after                    |

#### Structural triggers

Revise the pattern, not just one phrase:

- **Forced triads:** repeated sets of exactly three points. Keep only evidence-bearing points; do not pad or cut to reach three.
- **Mirror paragraphs:** repeated `claim → three examples → summary` blocks. Let methods, results, discussion, and instructions use forms suited to their jobs.
- **Synonym cycling:** different words for one technical concept. Choose one term and repeat it.
- **Binary-contrast tic:** repeated `not X but Y`, `不是 X，而是 Y`, or `与其说 X，不如说 Y`. State the supported result.
- **Meta-commentary:** sentences that announce the next sentence or section. Present the content.
- **Uniform rhythm:** consecutive sentences or paragraphs with nearly identical length and syntax. Change only where the argument is obscured; do not manufacture randomness.
- **Colon-list runs:** several consecutive paragraphs ending their opener with a colon and list. Consolidate or use prose.
- **Punctuation tics:** repeated em dashes and semicolons used to chain thoughts. Use a period, comma, or parentheses according to syntax. Preserve punctuation inside quotations.

#### Chinese plain-language screen

中文场景的语域要求：

- 默认使用偏书面的语言组织方式：句子成分完整，关系词齐全，用词是日常通用词，可保留英文专有词。论文、合同、规范、正式公告等专业场景，按需使用正式书面语。
- 不用无意义的假口语化和比喻；按中文习惯的主谓宾语序表达。
- 不堆砌修辞和句式，不写大段礼貌用语和廉价关怀。
- 不刻意重复已出现的内容和修饰性措辞；同一概念的术语照常重复（见 Synonym cycling）。
- 避免过度的防御性表述（见 Defensive negation and disclaimer boilerplate）。
- 结尾不机械补充祝福、空泛总结或强行追问。

英式中文的修正和中文表达要求见 `references/chinese.md`。

Use standard written terms. Do not replace technical terms with slang, metaphors, or personification.

| Avoid      | Prefer               |
| ---------- | -------------------- |
| 坑、踩坑   | 问题、限制、失败条件 |
| 把握       | 确认程度、置信度     |
| 怎么做的   | 方法、实验设置       |
| 跑通了     | 测试通过、流程完成   |
| 白跑、白占 | 无效运行、空占资源   |
| 致命问题   | 主要问题、阻断问题   |

ML 实验/评测报告中的比喻与口语（刷奖励、吃掉一半空间、认题目的检索器、误差范围盖着基准线、天生需要大量样本、模型不愿意）见 `references/academic.md` 的中文研究报告行话部分。

Use neutral labels consistently: `问题`, `现象`, `影响`, `结果`, `状态`, `方法`, `实验设置`, `确认程度`, `进行中`, `已完成`, `未达到基线`, `结论待定`.

#### Screen procedure

1. Search the draft for exact and inflected forms of the trigger terms.
2. Inspect each match in context; apply the exception rule before editing.
3. Delete empty framing. Replace vague wording with the available fact, actor, mechanism, measurement, or action.
4. Scan for structural triggers across paragraphs and sections.
5. Compare with the source. Restore any changed fact, qualifier, citation relation, attribution, or uncertainty.
6. Stop after the defects are fixed. Do not rewrite clear passages to create artificial variation.

### Prompt routing

Read each matching prompt:

- paper, thesis, abstract, literature review, research report, reviewer response → `references/academic.md`
- source code, tests, identifiers, inline comments, docstrings, code review → `references/code.md`
- README, API docs, guides, changelogs, release notes, architecture or project documentation → `references/docs-readme.md`
- commit message, PR title/body, issue, review comment, discussion, maintainer reply → `references/git-github.md`
- any Chinese human-facing prose → `references/chinese.md`; combine it with the domain prompt

### Final check

- The first useful sentence appears immediately.
- Every adjective or adverb changes the meaning.
- Every transition reflects a real logical relation.
- Every claim has the same evidence and confidence as before.
- Each limit or negation is stated once and guards a real misreading; no stacked or preemptive disclaimers remain.
- No sentence predicts what the document will do instead of doing it.
- No new factual content was introduced during polishing.

Stop when meaning is preserved and the matching prompt checks pass. Do not keep rewriting merely to make the text look less machine-generated.
