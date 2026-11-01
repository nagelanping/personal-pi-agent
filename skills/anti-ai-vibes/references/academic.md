## Academic Writing and Revision Prompt

Apply the always-on language screen in `SKILL.md` first. Read this file completely for papers, theses, abstracts, literature reviews, research reports, and reviewer responses.
Apply the vocabulary replacements, discipline examples, hedging guidance, paragraph structure, tense table, pattern limits, and revision methods below rather than reducing them to generic advice such as "be concise" or "write naturally."
For Chinese academic text, also apply `references/chinese.md`.

### Execution order

1. Freeze protected content before drafting from supplied material or revising text.
2. Apply the complete Academic Writing Style Guide.
3. Apply the complete Writing Quality Check during self-review.
4. Compare the result with the source and restore any factual or epistemic drift.
5. Return the revised text directly unless the user asks for a change log.

### Protected content

Preserve:

- citations, quotations, attribution, bibliographic details, and source-to-claim relationships;
- numbers, units, dates, equations, statistical notation, effect sizes, sample details, and named methods;
- negation and direction (`increased`, `decreased`, `no difference`);
- evidence status: observation, association, interpretation, mechanism, causation, prediction, or recommendation;
- qualifiers such as `may`, `suggests`, `in this sample`, `preliminary`, `correlational`, and `after adjustment`;
- limitations, uncertainty, null results, and alternative interpretations.

Do not fabricate evidence or citations. Do not convert association into causation, and do not rewrite a null result as equivalence unless equivalence was tested.
Strengthen syntax without strengthening the scientific claim.

The two upstream guides below retain their vocabulary tables, thresholds, and examples, with prose edited for directness and headings nested under this document structure.

---

### Academic Writing Style Guide

#### Core Principles

##### 1. Precision

Use the most specific term available, define technical terms on first use, and avoid ambiguous pronouns ("this," "it") without clear antecedents.

##### 2. Conciseness

Eliminate filler words and redundant phrases. Give each sentence one idea or clearly connected ideas, and prefer short sentences for complex ideas.

##### 3. Objectivity

Base claims on evidence rather than opinion. Use hedging for uncertain claims, and acknowledge limitations and alternative interpretations.

##### 4. Formality

Use full forms ("do not" over "don't") and formal academic vocabulary, reserving colloquialisms and slang for informal writing. Use third person unless discipline conventions allow first person.

#### Register Adjustment by Discipline

##### Sciences (Natural, Applied)

```
Register: Formal, impersonal, method-focused
Voice: Passive voice common ("was measured," "were analyzed")
Terminology: Precise measurements, SI units, statistical notation
Example: "The sample was heated to 350°C for 2 hours, yielding a conversion rate of 87.3% (SD = 2.1)."
```

##### Social Sciences

```
Register: Formal, theory-informed, participant-aware
Voice: Active voice encouraged, first person for researcher decisions
Terminology: Theoretical constructs, operationalized variables
Example: "We employed semi-structured interviews to explore how participants understood institutional change (N = 24)."
```

##### Humanities

```
Register: Formal, argument-driven, interpretive
Voice: First person acceptable for arguments, active voice
Terminology: Close reading vocabulary, theoretical language
Example: "I argue that the text's spatial metaphors reveal an underlying anxiety about institutional permanence."
```

##### Engineering / CS

```
Register: Formal, problem-solution oriented, specification-precise
Voice: Passive common for methods, active for contributions
Terminology: Technical specifications, performance metrics
Example: "The proposed algorithm achieves O(n log n) complexity, outperforming the baseline by 34% on the benchmark dataset."
```

##### Education

```
Register: Formal, practice-oriented, stakeholder-aware
Voice: Active voice, first person for reflexive practice
Terminology: Pedagogical concepts, assessment language
Example: "The intervention improved student metacognitive awareness, as evidenced by a significant increase in self-regulation scores (t(45) = 3.21, p = .002, d = 0.72)."
```

##### Medicine / Health

```
Register: Formal, evidence-hierarchy conscious, clinical precision
Voice: Passive for methods, active for findings
Terminology: Clinical terms, diagnostic criteria, statistical reporting
Example: "Patients receiving the intervention showed a 40% reduction in readmission rates (RR = 0.60, 95% CI [0.45, 0.80], p = .001)."
```

#### Hedging and Strength Language

##### Hedging (for uncertain or qualified claims)

| Strength | Hedging Devices                     | Example                                   |
| -------- | ----------------------------------- | ----------------------------------------- |
| Weak     | may, might, could, possibly         | "This may suggest a correlation."         |
| Moderate | suggests, indicates, appears        | "The data suggest a positive trend."      |
| Strong   | demonstrates, establishes, confirms | "The evidence demonstrates a clear link." |

##### When to Hedge

Hedge results that need replication, causal claims drawn from correlational data, generalizations from limited samples, and interpretations with alternative explanations.

##### When NOT to Hedge

Do not hedge when reporting factual data ("The response rate was 78%," not "appeared to be"), describing methodology ("We used thematic analysis," not "we attempted to use"), or stating well-established facts ("Earth orbits the Sun," not "may orbit").

#### Transition Words and Phrases

Choose transitions according to the actual logical relation between sentences, and avoid overusing them when sentence order already makes the relation clear (see Mechanical transitions in SKILL.md).

##### Addition

moreover, furthermore, in addition, additionally, similarly, likewise

##### Contrast

however, nevertheless, in contrast, on the other hand, conversely, whereas

##### Cause/Effect

therefore, consequently, as a result, thus, hence, accordingly

##### Example

for example, for instance, specifically, in particular, such as, namely

##### Sequence

first, second, third, subsequently, finally, meanwhile

##### Summary

overall, taken together (when synthesizing multiple findings). Avoid canned closers such as `in summary`, `in conclusion`, `to conclude`, and `in short` unless they express a real logical relation (see Empty framing and AI-tell phrases in SKILL.md).

##### Concession

although, despite, while, granted that, notwithstanding

#### Paragraph Construction

##### Analytical Paragraph (TEEL)

Use for analytical or literature-review paragraphs when a point needs evidence and interpretation; do not force every paragraph into this pattern.

1. Topic sentence (T): states the paragraph's main point
2. Evidence (E): data, citations, and examples that support the point
3. Explanation (E): interprets the evidence and connects it to the argument
4. Link (L, optional): connects the implication to the argument or next point without announcing section structure

##### Example

> [T] AI-assisted quality assurance has shown promise in improving evaluation consistency across institutions. [E] Smith (2024) found that institutions using AI tools reported a 23% reduction in inter-rater variance, while Chen and Wang (2023) documented improved agreement on scoring rubrics (κ = 0.82 vs. 0.64). [E] These findings suggest that algorithmic assistance can mitigate the subjective biases inherent in human evaluation, particularly when assessors have varying levels of experience. [L] However, reliance on AI tools also raises concerns about the loss of contextual judgment in atypical cases.

#### Common Style Errors

##### Wordiness

| Wordy                        | Concise            |
| ---------------------------- | ------------------ |
| in order to                  | to                 |
| due to the fact that         | because            |
| a large number of            | many               |
| at the present time          | currently / now    |
| it is important to note that | delete             |
| in the event that            | if                 |
| has the ability to           | can                |
| with regard to               | regarding / about  |
| in spite of the fact that    | despite / although |
| conduct an investigation of  | investigate        |

##### Vague Language

| Vague                   | Precise                                           |
| ----------------------- | ------------------------------------------------- |
| "many studies"          | "several studies (e.g., Chen, 2023; Smith, 2024)" |
| "a significant impact"  | "a 23% increase in retention rates"               |
| "in recent years"       | "since 2020" or "over the past five years"        |
| "some researchers"      | Name them with citations                          |
| "it is well known that" | Cite the source or remove                         |

##### Tense Usage

| Section                                | Tense          | Example                                                    |
| -------------------------------------- | -------------- | ---------------------------------------------------------- |
| Literature review (reporting findings) | Past           | "Smith (2024) found that..."                               |
| Literature review (ongoing state)      | Present        | "The theory posits that..."                                |
| Methodology                            | Past           | "Data were collected through..."                           |
| Results                                | Past           | "The analysis revealed..."                                 |
| Discussion (interpreting)              | Present        | "These findings suggest..."                                |
| Conclusion (implications)              | Present/Future | "This has implications for... / Future research should..." |

---

### Writing Quality Check

#### Purpose

These writing quality rules address common patterns in AI-generated text and apply equally to human-written drafts. This checklist improves clarity and precision; it does not attempt to evade AI detectors.

Use this checklist when reviewing a draft and again in the final check.

---

#### A. High-Frequency Term Warnings

The following terms appear disproportionately in AI-generated text. They are not banned. When one appears, check whether it is the most precise word available rather than a default choice.

##### Flagged Terms

| Term           | Why it's flagged                       | Better alternatives (context-dependent)                                                       |
| -------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| delve          | Overused as "explore" substitute       | examine, investigate, analyze, explore                                                        |
| tapestry       | Cliché metaphor for complexity        | network, interplay, system, structure                                                         |
| landscape      | Vague when not literal                 | field, domain, context, state of                                                              |
| pivotal        | Inflation of importance                | important, central, key, main                                                                 |
| crucial        | Same as above                          | essential, necessary, critical, vital                                                         |
| foster         | Vague verb                             | promote, develop, cultivate, encourage                                                        |
| showcase       | Non-academic register                  | demonstrate, illustrate, present, reveal                                                      |
| testament      | Cliché                                | evidence, indicator, demonstration                                                            |
| navigate       | Vague when not literal                 | manage, address, handle, negotiate                                                            |
| leverage       | Business jargon                        | use, employ, apply                                                                            |
| realm          | Archaic/poetic                         | domain, field, area, sphere                                                                   |
| embark         | Overwrought for "begin"                | begin, initiate, undertake, start                                                             |
| underscore     | Overused emphasis verb                 | emphasize, highlight, stress, reinforce                                                       |
| multifaceted   | Vague complexity claim                 | complex, varied, diverse, multilayered                                                        |
| nuanced        | Often vacuous                          | subtle, detailed, fine-grained, qualified                                                     |
| comprehensive  | Often unjustified                      | thorough, extensive, broad, detailed                                                          |
| robust         | Vague quality claim                    | reliable, strong, rigorous, resilient                                                         |
| intricate      | Same problem as multifaceted           | complex, detailed, elaborate, involved                                                        |
| cornerstone    | Cliché metaphor                       | foundation, basis, core element, pillar                                                       |
| paradigm       | Overused outside philosophy of science | framework, model, approach (exception: "paradigm shift" in philosophy of science is standard) |
| synergy        | Business jargon                        | interaction, cooperation, combined effect                                                     |
| holistic       | Vague without definition               | integrated, whole-system, complete                                                            |
| streamline     | Non-academic                           | simplify, optimize, improve efficiency                                                        |
| cutting-edge   | Cliché                                | recent, advanced, current, novel                                                              |
| groundbreaking | Inflation                              | novel, original, new, first-reported                                                          |

##### Exception Rule

If a flagged term is standard terminology in the target discipline, it is exempt:

- "paradigm shift" in philosophy of science → OK
- "landscape" in ecology/geography (literal) → OK
- "robust" in statistics ("robust estimator") → OK
- "navigate" in wayfinding research (literal) → OK

---

#### B. Punctuation Pattern Control

##### Em Dash

Use at most 3 em dashes per paper total, with 0 to 1 preferred.
AI text overuses em dashes for parenthetical asides where academic writing uses commas, parentheses, or separate sentences. Replace them with commas, parentheses, or separate sentences, while retaining original punctuation inside direct quotes from sources.

##### Semicolons

Use at most 2 semicolons per 1,000 words.
AI text chains independent clauses with semicolons where a period is clearer. Use a period and start a new sentence, reserving semicolons for closely related parallel clauses.

##### Colon-List Sequences

Avoid two or more consecutive paragraphs that open with a colon followed by a list. Repeated colon-list openings make a passage read like a mechanical enumeration; integrate the list items into prose or use one consolidated list.

---

#### C. Throat-Clearing Openers

Delete the following sentence starters and begin with the claim or subject.

| Throat-clearing phrase             | What to do                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| "In the realm of..."               | Delete. Start with the actual subject                                        |
| "It's important to note that..."   | Delete. If it's important, the content speaks for itself                     |
| "It is worth mentioning that..."   | Same as above                                                                |
| "In today's rapidly evolving..."   | Delete. Timestamped clichés add no information                              |
| "This serves as a testament to..." | Replace with direct claim: "This demonstrates..." or just state the evidence |
| "It goes without saying that..."   | If it goes without saying, don't say it                                      |
| "In order to..."                   | Replace with "To..."                                                         |
| "It should be noted that..."       | Delete. Just note it                                                         |
| "As a matter of fact..."           | Delete. State the fact                                                       |
| "When it comes to..."              | Replace with the subject directly: "X shows..."                              |
| "At the end of the day..."         | Delete. Colloquial and vague                                                 |
| "With that being said..."          | Delete or use "However" if a contrast is intended                            |

##### Meta-Commentary to Avoid

Also check for sentences that announce what the paper will do instead of presenting the content:

- "This section will discuss..." → state the discussion directly
- "The following paragraph examines..." → state the examination directly
- "We now turn our attention to..." → begin the next topic directly

Exception: Roadmap sentences in the Introduction ("Section 2 reviews the literature; Section 3 describes the methodology") are standard academic practice and should be kept.

---

#### D. Structure Pattern Warnings

##### Rule of Three Compulsion

Watch for passages where every argument has exactly 3 sub-points and every list has exactly 3 items.
Analysis rarely divides into three equal parts, and two well-supported points are stronger than three padded ones. Use as many points as the evidence warrants (whether 2, 5, or another count) without padding or cutting to reach 3.

##### Uniform Paragraph Length

Paragraph length alone is not a defect, and you should not adjust paragraph lengths to manufacture variety.
Check instead whether uniform paragraph lengths (for example, every paragraph around 150–200 words) signal padding or a forced template across paragraphs. Remove padding and let each paragraph take the length its material requires.

##### Synonym Cycling

Do not cycle through 3 or more synonyms for one concept within a paragraph merely to avoid repetition.
Academic writing relies on consistent terminology; switching across "students" → "learners" → "participants" → "subjects" within one paragraph obscures whether the referent has changed. Pick one term per concept per section and repeat it consistently.

##### Binary Contrast Overuse

Limit "Not X. Y." or "It's not about X — it's about Y." to at most 2 uses per paper. Repeating this contrast device across a paper turns it into a mannerism; state the supported claim directly instead.

##### Mirror Structure

Avoid giving every section the same internal template (such as topic sentence → 3 evidence points → synthesis sentence).
Different sections serve different functions: Methods can be procedural and Discussion can be analytical or interpretive. Let section structure follow the content.

---

#### E. Sentence Rhythm and Syntactic Repetition

##### What to Check

Sentence length alone is not a trigger; procedural or technical passages often use sentences of similar length. Check instead for consecutive sentences that repeat the same syntactic skeleton (the same clause order, opener, comma pattern, and ending).

##### Detection Rule

If 5 or more consecutive sentences share the same syntactic skeleton, or fall into a narrow word-count range (for example, all between 20 and 25 words) because they repeat a template clause structure, flag the passage for review.

##### How to Fix

Rewrite only the sentences where repeated syntax makes the passage mechanical, such as by merging two closely dependent clauses or changing clause order to match the logical relation. Do not insert arbitrary short sentences or adjust sentence lengths to hit a variation target.

---

#### How to Use This Checklist

##### During Drafting (Preferred)

Apply these rules while reviewing each section after drafting it, so issues are caught before they propagate.

##### During Final Review (Fallback)

If the rules were not applied during drafting, check the full paper before submission.

##### Scoring (Internal, Not Reported to User)

For each rule category, track violations internally: 0 violations is clean; 1–3 violations is minor and should be fixed in self-review; 4+ violations indicates a pattern issue where you should review the section's writing approach.
Do not report scores to the user; fix the issues silently during drafting.

### AI-associated literary defaults

Flag these when used as decoration or vague abstraction. State the object and relation directly. The Writing Quality Check section lists per-word alternatives.

`delve`, `tapestry`, `realm`, `landscape`, `pivotal`, `crucial`, `underscore`, `showcase`, `testament`, `navigate`, `embark`, `foster`, `elevate`, `multifaceted`, `nuanced`, `intricate`, `cornerstone`, `myriad`

- Weak: `This study delves into the intricate landscape of digital trust.`
- Direct: `This study examines how users assess digital trust.`
- Weak: `The result underscores the pivotal role of feedback.`
- Direct: `Students who received feedback scored 12% higher.`

### Chinese research-report plain language

For Chinese research, experiment, and evaluation reports. Replace metaphor and personification with the observable measure or action:

| Avoid              | Prefer                            |
| ------------------ | --------------------------------- |
| 刷奖励             | 奖励提高但目标指标未改善          |
| 吃掉一半空间       | 已占用一半容量 / 已覆盖一半区间   |
| 认题目的检索器     | 退化为问题识别                    |
| 误差范围盖着基准线 | 置信区间与基线重叠                |
| 天生需要大量样本   | 所需样本量为……                  |
| 模型不愿意……     | 模型未生成…… / 该策略未选择…… |

Examples:

- Weak: `这个指标越稳定，越挑不出东西。` → Direct: `该指标的重合率与取值数量呈反向关系。`
- Weak: `24 步训练只挪动了 0.05。` → Direct: `24 步训练后，正确率变化为 0.05。`
- Weak: `这可能也解释了前文现象。` → Direct when unverified: `该现象与截断的关系尚未验证。`

---

### Fidelity examples

Source:

> Sleep duration was associated with examination scores after adjustment for age and prior GPA.

Unsafe:

> Longer sleep improved examination performance.

Faithful:

> After adjustment for age and prior GPA, longer sleep duration was associated with higher examination scores.

Source:

> We did not detect a statistically significant difference (p = .18).

Unsafe:

> The interventions were equally effective.

Faithful:

> We did not detect a difference between the interventions (p = .18).

### Final check

- Apply the specific word-level and phrase-level replacements above; do not substitute a summary.
- Keep standard disciplinary terms when they are the precise term, such as `robust estimator`.
- Preserve every citation, value, unit, direction, qualifier, limitation, and attribution.
- Keep claim strength within the supplied evidence and research design.
- Do not add factual content during polishing.
