## Academic Writing and Revision Prompt

Read this file completely for papers, theses, abstracts, literature reviews, research reports, and reviewer responses. Apply the concrete vocabulary replacements, discipline examples, hedging guidance, paragraph example, tense table, pattern limits, and revision methods below. Do not reduce them to generic advice such as “be concise” or “write naturally.” Apply the always-on language screen in `SKILL.md` first.

### Execution order

1. Freeze protected content before drafting from supplied material or revising text.
2. Apply the complete **Academic Writing Style Guide**.
3. Apply the complete **Writing Quality Check** during self-review.
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

Do not fabricate evidence or citations. Do not convert association into causation. Do not rewrite a null result as equivalence unless equivalence was tested. Strengthen syntax without strengthening the scientific claim.

The two upstream guides below retain their original wording, vocabulary tables, thresholds, and examples. Only heading levels are nested under this document structure.

---

### Academic Writing Style Guide

Used by `draft_writer_agent` and `peer_reviewer_agent`.

#### Core Principles

##### 1. Precision

- Use the most specific term available
- Define technical terms on first use
- Avoid ambiguous pronouns ("this," "it") without clear antecedents

##### 2. Conciseness

- Eliminate filler words and redundant phrases
- One idea per sentence (or clearly connected ideas)
- Prefer short sentences for complex ideas

##### 3. Objectivity

- Base claims on evidence, not opinion
- Use hedging for uncertain claims
- Acknowledge limitations and alternative interpretations

##### 4. Formality

- Use full forms ("do not" over "don't")
- Use formal academic vocabulary; reserve colloquialisms and slang for informal writing
- Use third person unless discipline conventions allow first person

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

- Results that need replication
- Causal claims from correlational data
- Generalizations from limited samples
- Interpretations with alternative explanations

##### When NOT to Hedge

- Reporting factual data: "The response rate was 78%." (not "appeared to be")
- Describing methodology: "We used thematic analysis." (not "we attempted to use")
- Well-established facts: "Earth orbits the Sun." (not "may orbit")

#### Transition Words and Phrases

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

in summary, to conclude, overall, taken together, in short

##### Concession

although, despite, while, granted that, notwithstanding

#### Paragraph Construction

##### Standard Academic Paragraph (TEEL)

1. **T**opic sentence — states the paragraph's main point
2. **E**vidence — data, citations, examples that support the point
3. **E**xplanation — interpret the evidence, connect to argument
4. **L**ink — connect to the next paragraph or back to thesis

##### Example

> **[T]** AI-assisted quality assurance has shown promise in improving evaluation consistency across institutions. **[E]** Smith (2024) found that institutions using AI tools reported a 23% reduction in inter-rater variance, while Chen and Wang (2023) documented improved agreement on scoring rubrics (κ = 0.82 vs. 0.64). **[E]** These findings suggest that algorithmic assistance can mitigate the subjective biases inherent in human evaluation, particularly when assessors have varying levels of experience. **[L]** However, the reliance on AI tools also raises concerns about the loss of contextual judgment, which the following section addresses.

#### Common Style Errors

##### Wordiness

| Wordy                        | Concise            |
| ---------------------------- | ------------------ |
| in order to                  | to                 |
| due to the fact that         | because            |
| a large number of            | many               |
| at the present time          | currently / now    |
| it is important to note that | notably            |
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

#### Chinese Academic Writing (zh-TW) Conventions

##### Register

- Use written/formal language; avoid colloquial expressions
- Prefer active voice (Chinese rarely uses passive)
- Mainly short sentences; avoid overly long subordinate clauses
- Use "this study" (ben yan jiu) rather than "we" (wo men)

##### Common Academic Expressions

| English                     | Romanized Chinese                    |
| --------------------------- | ------------------------------------ |
| This study aims to          | Ben Yan Jiu Zhi Zai                  |
| The findings indicate       | Yan Jiu Jie Guo Xian Shi             |
| It is worth noting          | Zhi De Zhu Yi De Shi                 |
| In conclusion               | Zong Shang Suo Shu                   |
| Based on the above analysis | Gen Ju Shang Shu Fen Xi              |
| Further research is needed  | Wei Lai Yan Jiu Ke Jin Yi Bu Tan Tao |

##### Avoiding Translationese

- Incorrect: "was found to be" (bei fa xian shi) → Correct: "Results show" (jie guo xian shi)
- Incorrect: "This is because" (zhe shi yin wei) → Correct: "The reason lies in" (yuan yin zai yu)
- Incorrect: "In the aspect of..." (zai...fang mian) → Correct: State directly
- Incorrect: "It is worth being pointed out that" (zhi de bei zhi chu de shi) → Correct: "It is worth noting that" (zhi de zhu yi de shi)

---

### Writing Quality Check

#### Purpose

A set of writing quality rules extracted from common patterns in AI-generated text. These are **good writing rules** that apply regardless of whether the text was AI-generated or human-written. The goal is better prose, not detection evasion.

> **Design boundary**: This checklist improves writing quality. It is NOT a humanizer. We do not aim to fool AI detectors. We aim to produce clear, precise, varied academic prose.

Reference this checklist during the self-review step of drafting (draft_writer_agent Step 2.7, report_compiler_agent final check).

---

#### A. High-Frequency Term Warnings

The following terms appear disproportionately in AI-generated text. They are not banned — but when you encounter one, ask: **"Is this really the most precise word here, or am I defaulting to it?"**

##### Flagged Terms

| Term           | Why it's flagged                       | Better alternatives (context-dependent)                                                       |
| -------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| delve          | Overused as "explore" substitute       | examine, investigate, analyze, explore                                                        |
| tapestry       | Cliché metaphor for complexity        | network, interplay, system, landscape                                                         |
| landscape      | Vague when not literal                 | field, domain, context, state of                                                              |
| pivotal        | Inflation of importance                | important, significant, central, key                                                          |
| crucial        | Same as above                          | essential, necessary, critical, vital                                                         |
| foster         | Vague verb                             | promote, develop, cultivate, encourage                                                        |
| showcase       | Non-academic register                  | demonstrate, illustrate, present, reveal                                                      |
| testament      | Cliché                                | evidence, indicator, demonstration                                                            |
| navigate       | Vague when not literal                 | manage, address, handle, negotiate                                                            |
| leverage       | Business jargon                        | use, employ, utilize, apply                                                                   |
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
| holistic       | Vague without definition               | comprehensive, integrated, whole-system                                                       |
| streamline     | Non-academic                           | simplify, optimize, improve efficiency                                                        |
| cutting-edge   | Cliché                                | recent, advanced, state-of-the-art, novel                                                     |
| groundbreaking | Inflation                              | novel, innovative, pioneering, original                                                       |

##### Exception Rule

If a flagged term is **standard terminology in the target discipline**, it is exempt:

- "paradigm shift" in philosophy of science → OK
- "landscape" in ecology/geography (literal) → OK
- "robust" in statistics ("robust estimator") → OK
- "navigate" in wayfinding research (literal) → OK

---

#### B. Punctuation Pattern Control

##### Em Dash (—)

- **Limit**: ≤ 3 per paper total, recommend 0-1
- **Why**: AI text overuses em dashes for parenthetical asides. Academic writing typically uses commas, parentheses, or separate sentences instead
- **Fix**: Replace with commas, parentheses, or restructure into separate sentences
- **Exception**: Direct quotes from sources retain their original punctuation

##### Semicolons

- **Limit**: ≤ 2 per 1000 words
- **Why**: AI text chains independent clauses with semicolons where a period would be clearer
- **Fix**: Use a period and start a new sentence. Reserve semicolons for closely related parallel structures

##### Colon-List Sequences

- **Rule**: Avoid 2+ consecutive paragraphs that each open with a colon followed by a list
- **Why**: Creates a monotonous enumerate-everything pattern
- **Fix**: Integrate list items into prose, or use a single consolidated list

---

#### C. Throat-Clearing Openers

Delete the following sentence starters. Cut to the point.

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

Also watch for sentences that describe what the paper is doing instead of doing it:

- "This section will discuss..." → Just discuss it
- "The following paragraph examines..." → Just examine it
- "We now turn our attention to..." → Just turn to it

Exception: Roadmap sentences in the Introduction ("Section 2 reviews the literature; Section 3 describes the methodology") are standard academic practice and should be kept.

---

#### D. Structure Pattern Warnings

##### Rule of Three Compulsion

- **Pattern**: Every argument has exactly 3 sub-points, every list has exactly 3 items
- **Why**: Real analysis doesn't always decompose into trios. Two strong points beat three padded ones
- **Fix**: Use as many points as the evidence warrants. 2 is fine. 5 is fine. Don't pad to 3

##### Uniform Paragraph Length

- **Pattern**: All paragraphs are approximately the same length (150-200 words each)
- **Why**: Natural writing has paragraph length variation. Short paragraphs for emphasis, longer ones for complex arguments
- **Fix**: Vary paragraph length. A 2-sentence paragraph after a 10-sentence paragraph creates rhythm

##### Synonym Cycling

- **Pattern**: Using 3+ different synonyms for the same concept within one paragraph to avoid repetition
- **Why**: In academic writing, consistent terminology is a virtue. Swapping "students" → "learners" → "participants" → "subjects" within one paragraph confuses rather than impresses
- **Fix**: Pick one term per concept per section. Repeat it. Technical repetition is clarity, not weakness

##### Binary Contrast Overuse

- **Pattern**: "Not X. Y." or "It's not about X — it's about Y." used more than twice per paper
- **Why**: This rhetorical device is effective once. Repeated, it becomes a tic
- **Limit**: ≤ 2 per paper

##### Mirror Structure

- **Pattern**: Every section has the same internal structure (topic sentence → 3 evidence points → synthesis sentence)
- **Why**: Creates a template-stamped feel. Different sections serve different purposes and should have different internal rhythms
- **Fix**: Let section structure follow content needs. Methods can be procedural. Discussion can be exploratory

---

#### E. Burstiness (Sentence Length Variation)

##### What to Check

Good writing has **natural variation in sentence length**. Short sentences create impact. Longer sentences develop complex ideas. The alternation creates rhythm.

##### Detection Rule

If 5+ consecutive sentences all fall within a narrow word-count range (e.g., all between 20-25 words): **flag for review**.

##### How to Fix

- Insert a short sentence (≤ 10 words) to break the pattern
- Combine two short sentences into one complex one if the pattern is monotonously short
- Read the paragraph aloud — if it feels metronomic, vary it

##### Burstiness Targets (by section)

- **Abstract**: Moderate variation (factual, steady pace)
- **Introduction**: High variation (hook with short sentences, build with long ones)
- **Literature Review**: Moderate (steady analytical pace, occasional short synthesis)
- **Methods**: Low variation acceptable (procedural sections naturally have uniform length)
- **Results**: Moderate (short for key findings, longer for detailed descriptions)
- **Discussion**: Highest variation (short for emphasis, long for interpretation, very short for conclusions)

---

#### How to Use This Checklist

##### During Drafting (Preferred)

Apply rules **while writing each section** in the self-review sub-step (Step 2.7 in draft_writer_agent). This catches issues before they propagate.

##### During Final Review (Fallback)

If not applied during drafting, run a full-paper sweep before handoff to citation_compliance_agent.

##### Scoring (Internal, Not Reported to User)

For each rule category, track violations:

- 0 violations: Clean
- 1-3 violations: Minor — fix in self-review
- 4+ violations: Pattern issue — review the section's writing approach

Do NOT report scores to the user. Just fix the issues silently during drafting.

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
