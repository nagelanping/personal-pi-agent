/**
 * `/compact` summaries that reuse the KV prefix cache: the live context is replayed
 * byte-for-byte from the last real request and the checkpoint prompt is appended as
 * the final user message. Anything that cannot hit the cache goes through pi's `compact()`
 * with our own model, level and input trimming. If that fails too, the compaction is cancelled.
 *
 * `/compact [-c|--cached | -nc|--not-cached] [-m|--model <provider/id>] [-e|--effort <level>] [focus text]`
 */
import type * as Pi from "@earendil-works/pi-coding-agent";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionBeforeCompactEvent,
} from "@earendil-works/pi-coding-agent";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ───────────────────────── 用户配置 ─────────────────────────
// 只影响原生（-nc）摘要。两项都留空时沿用当前会话的模型与档位，行为不变。
// 启动时匹配一次；匹配不到会在界面上报错，并退回当前模型 / 当前档位。
// 这两项是默认值：`/compact --model X` 与 `--effort Y` 优先于配置。

/** 原生（-nc）摘要用哪个模型，写 `provider/id`，例如 `deepseek/deepseek-flash`。
 *  留空沿用当前模型，`/model` 切换后跟着变。原生摘要是全价无缓存请求，
 *  指向便宜模型能省掉这一次。 */
const NATIVE_SUMMARY_MODEL = "openai-codex/gpt-6-luna";
/** 原生（-nc）摘要用哪个思考档位，写 `off` / `low` / `medium` / `high` / `xhigh` / `max`。
 *  留空沿用当前档位。 */
const NATIVE_SUMMARY_EFFORT = "high";

// ───────────────────────────── Prompt ─────────────────────────────
// 改提示词只改这一处。fillPrompt 填充两个占位符：`{{retention_boundary}}` 为保留区边界块，
// 有锚点时含锚点原文，无锚点时声明全部内容都要压缩；`{{focus_block}}` 为用户侧重。
// `## Goal` 起的小节标题必须保留，后处理靠它截断前言。
const COMPACTION_PROMPT = `[INJECTED PROMPT: Below is a prompt for context compaction. Not a user turn. It is not part of the conversation being summarized, and must not appear in the summary.]

**Do NOT continue the original conversation. Do NOT answer any question from the original conversation. Do NOT call tools, read files, or run commands. Follow the requirements of this prompt. ONLY output a Markdown summary. Do NOT output anything that is not part of the summary. Target summary length: 8,000 tokens, not exceeding 12,000 tokens.**

{{retention_boundary}}

Based on the compaction region, create a structured context checkpoint summary that you will use to continue the work after compaction.

{{focus_block}}
Use this EXACT format. Keep basic content concise; adjust the level of detail for key content as needed. Preserve exact file paths, function names, and error messages. **The highest priority is that the future you, reading this summary, can continue the work:**

## Goal

[What is the user trying to accomplish? Can be multiple items if the session covers different tasks.]

## Constraints & Preferences

- [Any constraints, preferences, or requirements mentioned by user]
- [Or "(none)" if none were mentioned]

## Progress

### Direction

- [Overall plan and architecture already decided, if any]
- [Possible directions and ideas not yet decided, if any]

### Done

- [x] [Completed tasks/changes]

### In Progress

- [ ] [Current work]

### Blocked

- [Issues preventing progress, if any]

## Key Decisions

- **[Decision]**: [Brief rationale]

## Next Steps

1. [Ordered list of what should happen next]

## Critical Context

- [Any data, examples, or references needed to continue]
- [Or "(none)" if not applicable]`;

/** No anchor means nothing is retained verbatim, so the boundary note must not claim a retained region. */
function boundaryBlock(anchor: string | undefined): string {
  if (!anchor)
    return "**The entire conversation above is the compaction region. Nothing is retained verbatim; summarize all of it.**";
  return `>>> ${anchor}

This message and everything after it are the retained region and **will be kept verbatim**. Everything before this message is the compaction region and **must be compacted**. **Do NOT restate any retained-region content in the summary. Summarize the compaction region ONLY.**`;
}

function fillPrompt(anchor: string | undefined, focus: string): string {
  // Replacer functions: anchors are user text and may contain `$&` etc.
  const focusBlock = focus
    ? `**Additional focus requested by the user:** ${focus}`
    : "";
  return COMPACTION_PROMPT.replace("{{retention_boundary}}", () =>
    boundaryBlock(anchor),
  ).replace("{{focus_block}}", () => focusBlock);
}

// ───────────────────────────── Constants ─────────────────────────────
const PKG = "@earendil-works/pi-coding-agent";
const MARK = "compact-cache:prefix-mismatch";
const MIN_HEADROOM = 32_768;
const SAFETY_TOKENS = 4096;
/** Summary output budget. Equal to MIN_HEADROOM, so a gated append always has room to finish. */
const SUMMARY_OUTPUT_TOKENS = 32_768;
const MAX_DIAGNOSTIC_CHARS = 60;
const ANCHOR_WIDTHS = [100, 160, 240];

/** pi's cache warmer asks for 1 token; openai-responses raises that to 16. */
const WARMUP_MAX_TOKENS = 16;
/** Output caps are request parameters: they never belong to the cache prefix. */
const OUTPUT_LIMIT_KEYS = [
  "max_tokens",
  "max_output_tokens",
  "max_completion_tokens",
] as const;
const MINUTE_MS = 60_000;
const TTL_MARGIN_MS = 5 * MINUTE_MS;
/** pi's config dir. `getAgentDir()` resolves it the same way, including `~`; mirroring that
 *  keeps the snapshots next to pi's own files on Windows, where `HOME` is usually unset. */
const AGENT_DIR = (() => {
  const raw = process.env.PI_CODING_AGENT_DIR;
  if (!raw) return join(homedir(), ".pi", "agent");
  if (raw === "~") return homedir();
  if (raw.startsWith("~/") || raw.startsWith("~\\"))
    return join(homedir(), raw.slice(2));
  return raw;
})();
const LOG = join(AGENT_DIR, "compact-cache.log");
const MAX_LOG_BYTES = 64_000;
const HIT_SHARE = 0.75;
const MISS_SHARE = 0.25;
/** pi's full thinking vocabulary; `off` is accepted here but never sent as `reasoning`. */
const EFFORT_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
type EffortLevel = (typeof EFFORT_LEVELS)[number];
/** The subset that is ever sent as `reasoning`; `satisfies` keeps it in sync with the above. */
const REASONING_LEVELS = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const satisfies readonly Exclude<EffortLevel, "off">[];

/** One JSON line per compaction decision: the only way to see why append was skipped. */
function log(fields: Record<string, unknown>): void {
  try {
    if (existsSync(LOG) && statSync(LOG).size > MAX_LOG_BYTES) {
      // Windows refuses to rename onto an existing file; POSIX would have replaced it.
      try {
        unlinkSync(`${LOG}.old`);
      } catch {
        /* nothing to clear */
      }
      renameSync(LOG, `${LOG}.old`);
    }
    const line = JSON.stringify({
      at: new Date().toISOString(),
      ...fields,
    });
    appendFileSync(LOG, `${line}\n`);
  } catch {
    /* logging must never break compaction */
  }
}

// Snapshots are persisted so a resumed session can still replay. Headers are deliberately NOT
// written, so a snapshot holds the same conversation data as the session jsonl and no
// credentials. Stale files are worthless because the server cache is long gone, so they get pruned.
const SNAP_DIR = join(AGENT_DIR, "compact-cache");
const MAX_SNAP_CHARS = 32 * 1024 * 1024;
const SNAP_KEEP_MS = 7 * 24 * 3600_000;

const snapFile = (key: string): string =>
  join(SNAP_DIR, `${key.replace(/[^A-Za-z0-9._-]/g, "_")}.json`);

function persist(key: string, snap: Snapshot): void {
  try {
    const body = JSON.stringify({
      at: snap.at,
      model: snap.model,
      thinking: snap.thinking,
      payload: snap.payload,
    });
    if (body.length > MAX_SNAP_CHARS) return;
    mkdirSync(SNAP_DIR, { recursive: true });
    writeFileSync(snapFile(key), body);
  } catch (error) {
    // A failed write only costs the cross-restart replay, so the in-memory snapshot
    // stays usable; warn instead of failing the request.
    console.warn(
      `compact-cache: snapshot persist failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function loadSnap(key: string): Snapshot | undefined {
  try {
    const raw = JSON.parse(
      readFileSync(snapFile(key), "utf8"),
    ) as Partial<Snapshot>;
    if (!isRecord(raw.payload) || typeof raw.at !== "number") return undefined;
    const model = String(raw.model ?? "");
    // The filename replaces `/` and `|` with `_`, so two keys can land on the same file.
    // Refuse a snapshot that belongs to a different model instead of replaying it.
    if (model !== key.slice(key.indexOf("|") + 1)) return undefined;
    return {
      payload: raw.payload,
      at: raw.at,
      model,
      thinking: String(raw.thinking ?? ""),
    };
  } catch {
    // Missing or corrupt snapshot is the normal case after a prune, so no warning here;
    // the caller falls back to native compaction.
    return undefined;
  }
}

function pruneSnaps(): void {
  if (!existsSync(SNAP_DIR)) return;
  try {
    const now = Date.now();
    for (const name of readdirSync(SNAP_DIR)) {
      const file = join(SNAP_DIR, name);
      if (now - statSync(file).mtimeMs > SNAP_KEEP_MS) unlinkSync(file);
    }
  } catch (error) {
    console.warn(
      `compact-cache: snapshot prune skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

type M = NonNullable<ExtensionContext["model"]>;
/** `compact()`'s streamFn slot, taken from the real signature instead of hand-written types. */
type CompactStreamFn = NonNullable<Parameters<typeof Pi.compact>[7]>;
type CompactStreamFnArg<N extends 0 | 1 | 2> = Parameters<CompactStreamFn>[N];
type CompactThinking = Parameters<typeof Pi.compact>[6];
/** Resolved once at session start from the two config constants above. */
interface NativePick {
  /** Undefined when no model is configured: the session's current model is used. */
  model?: M;
  effort?: CompactThinking;
}
type CompactUsage = Pi.CompactionResult["usage"];
type Payload = Record<string, unknown>;
type Files = { readFiles: string[]; modifiedFiles: string[] };

interface Snapshot {
  payload: Payload;
  headers?: Record<string, string | null>;
  at: number;
  model: string;
  thinking: string;
}

interface Stat {
  mode: "append" | "native";
  tag: string;
  gap?: number;
  limit?: number | null;
  ratio?: number;
  model?: string;
  cw?: number;
  thinking?: string;
  snapModel?: string;
  snapThinking?: string;
  entries?: number;
  forced?: boolean;
  effort?: string;
  error?: string;
  tokens: number;
}

// ───────────────────────────── Pure helpers ─────────────────────────────
const modelKey = (
  model: { provider: string; id: string } | undefined,
): string => (model ? `${model.provider}/${model.id}` : "");

/** pi-codex-native 独占原生 codex 的远端压缩和请求头：本扩展一参与就会覆盖它的 encrypted checkpoint，并让两边各发一次摘要请求。 */
const isNativeCodex = (
  model: { provider: string; api?: string } | undefined,
): boolean =>
  model?.provider === "openai-codex" && model.api === "openai-codex-responses";

const isRecord = (v: unknown): v is Payload =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Canonical JSON with every `cache_control` removed: breakpoints move between requests. */
function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value)
      .filter((k) => k !== "cache_control" && value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Cache markers can wrap a message's string content in a single text block. */
function canonMessage(value: unknown): string {
  if (
    isRecord(value) &&
    Array.isArray(value.content) &&
    value.content.length === 1
  ) {
    const block = value.content[0];
    if (
      isRecord(block) &&
      block.type === "text" &&
      typeof block.text === "string" &&
      Object.keys(block).every(
        (key) => key === "type" || key === "text" || key === "cache_control",
      )
    )
      return canon({ ...value, content: block.text });
  }
  return canon(value);
}

/** `messages` (anthropic, openai-completions) or `input` (openai-responses). */
function bodyKey(payload: Payload): "messages" | "input" | undefined {
  if (Array.isArray(payload.messages)) return "messages";
  if (Array.isArray(payload.input)) return "input";
  return undefined;
}

const isSystemItem = (e: unknown): boolean =>
  isRecord(e) && (e.role === "system" || e.role === "developer");

function splitLead(items: unknown[]): [unknown[], unknown[]] {
  let lead = 0;
  while (lead < items.length && isSystemItem(items[lead])) lead++;
  return [items.slice(0, lead), items.slice(lead)];
}

/** Top-level keys that form the cache prefix; every other key is a request parameter. */
const STRUCTURAL_KEYS = new Set([
  "messages",
  "input",
  "tools",
  "system",
  "instructions",
]);

/**
 * Snapshot body must match the new prefix, allowing cache-marker text wrapping. Keeps the
 * snapshot prefix and appends the new tail, or throws a marked error (onPayload turns it into stopReason "error").
 */
function replay(
  snapshot: Payload,
  nextPayload: unknown,
  takeParamsFromNext = false,
): Payload {
  const fail = (reason: string): never => {
    throw new Error(`${MARK} ${reason}`);
  };
  const key = bodyKey(snapshot);
  if (!key || !isRecord(nextPayload) || bodyKey(nextPayload) !== key)
    return fail("payload shape");
  const [lead, base] = splitLead(snapshot[key] as unknown[]);
  const [, tail] = splitLead(nextPayload[key] as unknown[]);
  if (base.length === 0) return fail("empty snapshot");
  if (tail.length <= base.length) return fail("not longer than snapshot");
  for (let i = 0; i < base.length; i++) {
    if (canonMessage(base[i]) !== canonMessage(tail[i]))
      return fail(`item ${i}/${base.length}`);
  }
  const merged: Payload = {
    ...snapshot,
    [key]: [...lead, ...base, ...tail.slice(base.length)],
  };
  // Output caps change between requests (the warmer asks for 1) and are not part of
  // the cache prefix, so the new request always decides them.
  for (const name of OUTPUT_LIMIT_KEYS) {
    delete merged[name];
    if (nextPayload[name] !== undefined) merged[name] = nextPayload[name];
  }
  if (!takeParamsFromNext) return merged;
  // Parameters (thinking, temperature, ...) do not participate in the cache prefix, so the
  // new payload wins there while `tools`/`system`/`messages` stay byte-identical.
  for (const name of Object.keys(merged))
    if (!STRUCTURAL_KEYS.has(name)) delete merged[name];
  for (const [name, value] of Object.entries(nextPayload))
    if (!STRUCTURAL_KEYS.has(name)) merged[name] = value;
  return merged;
}

/** System text of a payload, used only to recognise pi's own summarization requests. */
function systemText(payload: Payload): string {
  if (payload.system !== undefined) return JSON.stringify(payload.system);
  const key = bodyKey(payload);
  const first = key ? (payload[key] as unknown[])[0] : undefined;
  return isSystemItem(first) ? JSON.stringify(first) : "";
}

export function isAuxiliaryRequest(payload: Payload): boolean {
  const cap = OUTPUT_LIMIT_KEYS.find((name) => payload[name] !== undefined);
  if (cap !== undefined && Number(payload[cap]) <= WARMUP_MAX_TOKENS)
    return true;
  return systemText(payload).includes("context summarization assistant");
}

/** Drop any preamble and code fence; the summary must start at its first `Goal` heading. */
export function cleanSummary(raw: string): string | undefined {
  const i = raw.search(/^(?:#{1,3}[ \t]*Goal\b|\*\*[ \t]*Goal[ \t]*\*\*)/im);
  if (i < 0) return undefined;
  const text = raw
    .slice(i)
    .replace(/\r?\n[ \t]*(?:```|~~~)[ \t]*(?:\r?\n)?$/, "")
    .trim();
  return text || undefined;
}

/**
 * Mirror of pi's `getSupportedThinkingLevels` (bundle-only, not exported). An unrecognised
 * level is clamped to `off`, which silently disables thinking, so `--effort` is validated
 * against this instead of being passed through.
 */
function supportedEfforts(
  model: Pick<M, "reasoning" | "thinkingLevelMap">,
): EffortLevel[] {
  if (!model.reasoning) return ["off"];
  return EFFORT_LEVELS.filter((level) => {
    const mapped = model.thinkingLevelMap?.[level];
    if (mapped === null) return false;
    return level === "xhigh" || level === "max" ? mapped !== undefined : true;
  });
}

export function parseArgs(text: string): {
  c: boolean;
  nc: boolean;
  model?: string;
  effort?: string;
  focus: string;
} {
  const out: {
    c: boolean;
    nc: boolean;
    model?: string;
    effort?: string;
    focus: string;
  } = { c: false, nc: false, focus: "" };
  let rest = text.trim();
  for (;;) {
    let m: RegExpExecArray | null;
    if ((m = /^(?:-nc|--not-cached)(?:\s+|$)/.exec(rest))) out.nc = true;
    else if ((m = /^(?:-c|--cached)(?:\s+|$)/.exec(rest))) out.c = true;
    else if (
      (m = /^(?:-m|--model)\s+(?:"([^"]*)"|'([^']*)'|([^\s"']+))(?:\s+|$)/.exec(
        rest,
      ))
    )
      out.model = m[1] ?? m[2] ?? m[3] ?? undefined;
    else if (
      (m =
        /^(?:-e|--effort)\s+(?:"([^"]*)"|'([^']*)'|([^\s"']+))(?:\s+|$)/.exec(
          rest,
        ))
    )
      out.effort = m[1] ?? m[2] ?? m[3] ?? undefined;
    else break;
    rest = rest.slice(m[0].length);
  }
  out.focus = rest;
  return out;
}

/** Scoring follows @gotgenes/pi-subagents model-resolver; ties between distinct models are an error. */
export function resolveModel(input: string, all: M[]): M | string {
  const query = input.toLowerCase();
  const exact = all.find((m) => modelKey(m).toLowerCase() === query);
  if (exact) return exact;
  let best = 0;
  let hits: M[] = [];
  for (const model of all) {
    const id = model.id.toLowerCase();
    const name = (model.name ?? "").toLowerCase();
    const full = modelKey(model).toLowerCase();
    let score = 0;
    if (id === query) score = 100;
    else if (id.includes(query) || full.includes(query))
      score = 60 + (query.length / id.length) * 30;
    else if (name.includes(query))
      score = 40 + (query.length / name.length) * 20;
    else if (
      query
        .split(/[\s\-/]+/)
        .every(
          (part) =>
            id.includes(part) ||
            name.includes(part) ||
            model.provider.toLowerCase().includes(part),
        )
    )
      score = 20;
    if (score > best) [best, hits] = [score, [model]];
    else if (score === best && score > 0) hits.push(model);
  }
  const formatCandidates = (models: M[]) =>
    models
      .map((model) => `  ${modelKey(model)}`)
      .sort()
      .join("\n");
  if (best >= 20 && hits.length === 1) return hits[0];
  if (best >= 20)
    return `Ambiguous model "${input}". Candidates:\n${formatCandidates(hits)}`;
  return `Model not found: "${input}". Available models:\n${formatCandidates(all)}`;
}

const strings = (x: unknown): string[] =>
  Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : [];

export function mergeFiles(
  prev: unknown,
  read: Iterable<string>,
  modified: Iterable<string>,
): Files {
  const previous = isRecord(prev) ? prev : {};
  const modifiedSet = new Set([
    ...strings(previous.modifiedFiles),
    ...modified,
  ]);
  const readSet = new Set(
    [...strings(previous.readFiles), ...read].filter(
      (f) => !modifiedSet.has(f),
    ),
  );
  return {
    readFiles: [...readSet].sort(),
    modifiedFiles: [...modifiedSet].sort(),
  };
}

/** Same tags pi writes, so a later native compaction can still parse them. */
function fileSection({ readFiles, modifiedFiles }: Files): string {
  const sections: string[] = [];
  if (readFiles.length)
    sections.push(`<read-files>\n${readFiles.join("\n")}\n</read-files>`);
  if (modifiedFiles.length)
    sections.push(
      `<modified-files>\n${modifiedFiles.join("\n")}\n</modified-files>`,
    );
  return sections.length ? `\n\n${sections.join("\n\n")}` : "";
}

const stripFileSections = (text: string): string =>
  text
    .replace(/\n*<read-files>[\s\S]*?<\/read-files>/g, "")
    .replace(/\n*<modified-files>[\s\S]*?<\/modified-files>/g, "")
    .trimEnd();

/**
 * TTL guess per provider, used only to decide whether an append is worth attempting.
 * DeepSeek keeps agent caches ~3 days and chat caches ~7 days, with dynamic eviction under
 * load; 3 days is the default guess, and `-c` overrides it.
 */
/** Local runners are identified by their address, their provider name, or a quantized
 *  weight format in the model id; none of them has a published cache retention. */
const LOCAL_WEIGHTS = /gguf|nvfp4|int4|fp8|bf16/i;
const isLocalModel = (model: M): boolean =>
  /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/|$)/.test(
    model.baseUrl ?? "",
  ) ||
  /local/i.test(model.provider ?? "") ||
  LOCAL_WEIGHTS.test(model.id ?? "");

function ttlMs(model: M): number | undefined {
  // A local server keeps whatever it cached until its own eviction; an hour is the guess.
  if (isLocalModel(model)) return 60 * MINUTE_MS;
  const long = process.env.PI_CACHE_RETENTION === "long";
  const declared = model.promptCache?.[long ? "long" : "short"];
  let ms: number;
  if (declared) ms = declared * 1000;
  else if (/deepseek/i.test(`${model.provider}/${model.id}`))
    ms = 3 * 24 * 60 * MINUTE_MS;
  else if (model.api === "anthropic-messages" || /claude/i.test(model.id))
    ms = (long ? 60 : 5) * MINUTE_MS;
  else ms = 15 * MINUTE_MS;
  return ms;
}

function fmtDur(ms: number): string {
  const s = Math.floor(ms / 1000);
  const parts = [
    Math.floor(s / 3600) && `${Math.floor(s / 3600)}h`,
    Math.floor((s % 3600) / 60) && `${Math.floor((s % 3600) / 60)}m`,
    s % 60 && `${s % 60}s`,
  ];
  return parts.filter(Boolean).join("") || "0s";
}

export interface Gate {
  reason: string;
  forced: boolean;
  native: boolean;
  modelDiffers: boolean;
  hasSnapshot: boolean;
  idleMs?: number;
  limitMs?: number | null;
  headroom: number;
}

interface Verdict {
  why?: string;
  warn?: "ttl" | "c-vs-model";
}

/**
 * The append-or-not decision, pure so the self-test covers every branch.
 * `warn` means the user overrode a guess: append anyway, but say what it may cost.
 */
export function decide(gate: Gate): Verdict {
  if (gate.reason === "overflow") return { why: "overflow" };
  if (gate.native) return { why: "-nc" };
  if (gate.modelDiffers && gate.forced)
    return { why: "-c vs --model", warn: "c-vs-model" };
  if (gate.modelDiffers) return { why: "model" };
  if (!gate.hasSnapshot) return { why: "no-snapshot" };
  // Headroom is a hard limit: `-c` only overrides the TTL guess, not the window.
  if (gate.headroom < MIN_HEADROOM) return { why: "headroom" };
  if (
    gate.idleMs !== undefined &&
    gate.limitMs != null &&
    gate.idleMs >= gate.limitMs
  )
    return gate.forced ? { warn: "ttl" } : { why: "ttl" };
  return {};
}

function statDetail(stat: Stat): string {
  return `${stat.tokens.toLocaleString()} tokens · ${stat.model} · thinking ${stat.thinking || "-"} · ${stat.entries} entries`;
}

function statLine(stat: Stat): string {
  const gap = stat.gap === undefined ? "-" : fmtDur(stat.gap);
  const limit = stat.limit == null ? "-" : fmtDur(stat.limit);
  const read =
    stat.ratio === undefined ? "" : `${(stat.ratio * 100).toFixed(1)}%`;
  const verdict =
    stat.ratio === undefined
      ? ""
      : stat.ratio >= HIT_SHARE
        ? " HIT"
        : stat.ratio <= MISS_SHARE
          ? " MISS"
          : "";
  return `compaction: ${stat.mode}(${stat.tag}) gap=${gap} limit=${limit} read=${read}${verdict} → ${Math.round(stat.tokens / 1000)}k summarized`;
}

function messageText(message: unknown): string {
  if (!isRecord(message)) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content))
    return message.content
      .map((block) =>
        isRecord(block) && block.type === "text"
          ? String(block.text ?? "")
          : "",
      )
      .join("");
  return typeof message.command === "string" ? message.command : "";
}

/** Anchor fallback for a message with no text: tool name plus its first argument. */
function toolLine(message: unknown): string {
  if (!isRecord(message) || !Array.isArray(message.content)) return "";
  for (const block of message.content) {
    if (
      !isRecord(block) ||
      (block.type !== "toolCall" && block.type !== "tool_use")
    )
      continue;
    const name = String(block.name ?? "");
    const args = isRecord(block.arguments)
      ? block.arguments
      : isRecord(block.input)
        ? block.input
        : {};
    const target = Object.values(args).find((v) => typeof v === "string" && v);
    return target ? `${name} ${target}` : name;
  }
  return "";
}

function countOf(text: string, needle: string): number {
  let count = 0;
  for (
    let at = text.indexOf(needle);
    at >= 0;
    at = text.indexOf(needle, at + needle.length)
  )
    count++;
  return count;
}

/** Verbatim excerpt of the first retained message; lengthened until it is unique in the context. */
export function pickAnchor(
  first: unknown,
  messages: unknown[],
): string | undefined {
  const text = messageText(first);
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text
    .split(newline)
    .map((segment) => segment.trim())
    .filter(Boolean);
  // A cut can land on an assistant turn that carries only tool calls.
  const tool = toolLine(first);
  if (!lines.length && tool) lines.push(tool);
  if (!lines.length) return undefined;
  const corpus = messages
    .map((message) => `${messageText(message)}\n${toolLine(message)}`)
    .join("\n\u0000\n");
  let excerpt = lines[0];
  for (const width of ANCHOR_WIDTHS) {
    const candidate = excerpt.slice(0, width);
    if (countOf(corpus, candidate) === 1) return candidate;
    if (candidate.length === excerpt.length) break;
  }
  // Still ambiguous: keep appending lines until no other message repeats it.
  for (let i = 1; i < lines.length; i++) {
    excerpt = `${excerpt}${newline}${lines[i]}`;
    if (countOf(corpus, excerpt) === 1) return excerpt;
  }
  return undefined;
}

// ───────────────────────────── Extension ─────────────────────────────
export default function compactCache(pi: ExtensionAPI): void {
  const snaps = new Map<string, Snapshot>();
  /** Payloads seen but not yet confirmed by a 200: a rejected request never warmed any cache. */
  const candidates = new Map<string, Snapshot>();
  const dirty = new Set<string>();
  const pendingHeaders = new Map<string, Record<string, string | null>>();
  let pending: Stat | undefined;

  /**
   * Resolved once at session start from the two config constants. A typo must surface as a
   * notification, not as a silent fallback on the first compaction.
   */
  let nativePick: NativePick | null | undefined;
  const nativeChoice = (ctx: ExtensionContext): NativePick | null => {
    if (nativePick !== undefined) return nativePick;
    nativePick = null;
    if (!NATIVE_SUMMARY_MODEL && !NATIVE_SUMMARY_EFFORT) return null;
    let model: M | undefined;
    if (NATIVE_SUMMARY_MODEL) {
      const found = resolveModel(
        NATIVE_SUMMARY_MODEL,
        ctx.modelRegistry.getAvailable(),
      );
      if (typeof found === "string")
        ctx.ui.notify(`compact-cache: ${found}`, "error");
      else model = found;
    }
    // Caching the model that happens to be active at session start would pin summaries to
    // the wrong model after a `/model` switch, so an unset constant stays undefined.
    const probe = model ?? ctx.model;
    let effort: CompactThinking;
    if (NATIVE_SUMMARY_EFFORT) {
      const wanted = EFFORT_LEVELS.find(
        (name) => name === NATIVE_SUMMARY_EFFORT,
      );
      if (!wanted)
        ctx.ui.notify(
          `compact-cache: NATIVE_SUMMARY_EFFORT "${NATIVE_SUMMARY_EFFORT}" is not a thinking level. Valid: ${EFFORT_LEVELS.join(", ")}.`,
          "error",
        );
      else if (!probe)
        ctx.ui.notify(
          "compact-cache: no active model to check the summary config against.",
          "error",
        );
      else if (!supportedEfforts(probe).includes(wanted))
        ctx.ui.notify(
          `compact-cache: ${modelKey(probe)} does not support ${wanted}. Valid there: ${supportedEfforts(probe).join(", ")}.`,
          "error",
        );
      else effort = wanted;
    }
    nativePick = { model, effort };
    return nativePick;
  };

  /**
   * Persisted on settle, not per request: stringifying a ~1 MB payload inside onPayload
   * delays every request, and losing the last turn only costs one native fallback.
   */
  const flush = () => {
    for (const key of dirty) {
      const snap = snaps.get(key);
      if (snap) persist(key, snap);
    }
    dirty.clear();
  };
  pi.on("session_start", (_event, ctx) => {
    pending = undefined;
    snaps.clear();
    candidates.clear();
    dirty.clear();
    pendingHeaders.clear();
    pruneSnaps();
    nativeChoice(ctx);
  });
  // Branch and model switches need no cleanup: snapshots are keyed by model, and `replay`
  // rejects any body that is not a prefix, so a stale snapshot can only degrade.
  pi.on("session_shutdown", () => {
    flush();
    pending = undefined;
    snaps.clear();
    candidates.clear();
    dirty.clear();
    pendingHeaders.clear();
  });
  pi.on("agent_settled", flush);

  pi.on("session_compact", (_e, ctx) => {
    candidates.clear();
    pendingHeaders.delete(ctx.sessionManager.getSessionId());
    if (!pending) return;
    log({ ev: "compaction", ...pending });
    const line = statLine(pending);
    ctx.ui.notify(
      line,
      // Forced (`-c`) but skipped: the user asked to append, so say so loudly.
      (pending.ratio === undefined && pending.forced) ||
        (pending.ratio !== undefined && pending.ratio <= MISS_SHARE)
        ? "warning"
        : "info",
    );
    // `compaction_end` clears the chat container right after this event, so a notify()
    // here is wiped. The widget lives outside the chat area and survives the rebuild.
    ctx.ui.setWidget("compact-cache", [line, statDetail(pending)]);
    pending = undefined;
  });
  pi.on("agent_start", (_e, ctx) =>
    ctx.ui.setWidget("compact-cache", undefined),
  );
  pi.on("session_compact_failed", () => {
    // This log exists to record failures: keep the whole stat.
    if (pending) log({ ev: "compact-failed", ...pending });
    pending = undefined;
  });

  pi.on("before_provider_headers", (e, ctx) => {
    pendingHeaders.set(ctx.sessionManager.getSessionId(), e.headers);
  });
  pi.on("before_provider_request", (e, ctx) => {
    if (isNativeCodex(ctx.model)) return;
    const sid = ctx.sessionManager.getSessionId();
    const headers = pendingHeaders.get(sid);
    pendingHeaders.delete(sid);
    if (
      !headers ||
      !isRecord(e.payload) ||
      !bodyKey(e.payload) ||
      isAuxiliaryRequest(e.payload)
    )
      return;
    // Saved by reference, and this handler must run after every other payload handler
    // (pi-cache-optimizer returns a copy instead of mutating), or the replay diverges.
    // Keyed by model too: a subagent request must not overwrite the main model's snapshot.
    const key = `${sid}|${modelKey(ctx.model)}`;
    const snap: Snapshot = {
      payload: e.payload,
      headers: { ...headers },
      at: Date.now(),
      model: modelKey(ctx.model),
      thinking: String(ctx.thinkingLevel ?? ""),
    };
    candidates.set(key, snap);
  });

  // Only a 200 proves the prefix is now cached; a 4xx/5xx snapshot would pass the TTL gate
  // while the server holds nothing.
  pi.on("after_provider_response", (e, ctx) => {
    if (e.status !== 200) return;
    const key = `${ctx.sessionManager.getSessionId()}|${modelKey(ctx.model)}`;
    const snap = candidates.get(key);
    if (!snap) return;
    candidates.delete(key);
    snaps.set(key, snap);
    dirty.add(key);
  });

  pi.on("session_before_compact", async (event, ctx) => {
    pending = undefined;
    const cur = ctx.model;
    if (!cur) return undefined;
    // 不返回值：正好保留 pi-codex-native 已算好的压缩结果。
    if (isNativeCodex(cur)) return undefined;
    const args =
      event.reason === "manual"
        ? parseArgs(event.customInstructions ?? "")
        : {
            c: false,
            nc: false,
            model: undefined,
            focus: event.customInstructions ?? "",
          };
    let target: M = cur;
    let finalModel: M = cur;
    let finalEffort: CompactThinking | undefined;
    let pick: NativePick | null = null;
    let effort: EffortLevel | undefined;
    let why: string | undefined;
    const stat: Stat = {
      mode: "native",
      tag: "",
      tokens: event.preparation.tokensBefore,
      model: modelKey(cur),
      cw: cur.contextWindow,
      thinking: String(ctx.thinkingLevel ?? ""),
      entries: event.branchEntries.length,
      forced: args.c,
      effort: args.effort,
    };
    try {
      if (args.model) {
        const r = resolveModel(args.model, ctx.modelRegistry.getAvailable());
        if (typeof r === "string") {
          ctx.ui.notify(r, "error");
          return { cancel: true };
        }
        target = r;
      }
      pick = nativeChoice(ctx);
      // `--model` is an explicit instruction; the configured model is only a default.
      finalModel = args.model ? target : (pick?.model ?? target);
      // An overflow compaction must run whatever the flags say; a cancel would leave the
      // context over the window.
      if (args.effort !== undefined && event.reason !== "overflow") {
        const level = EFFORT_LEVELS.find((name) => name === args.effort);
        if (!level) {
          ctx.ui.notify(
            `/compact: --effort ${args.effort} is not a thinking level. Valid: ${EFFORT_LEVELS.join(", ")}.`,
            "error",
          );
          return { cancel: true };
        }
        const allowed = supportedEfforts(finalModel);
        if (!allowed.includes(level)) {
          ctx.ui.notify(
            `/compact: ${modelKey(finalModel)} does not support --effort ${level}. Valid for this model: ${allowed.join(", ")}.`,
            "error",
          );
          return { cancel: true };
        }
        effort = level;
      }
      // `--effort` wins; the configured default was validated against whatever model was
      // active at session start, so re-check it against the model that will actually run.
      finalEffort = effort ?? pick?.effort;
      if (
        finalEffort !== undefined &&
        !supportedEfforts(finalModel).includes(finalEffort)
      )
        finalEffort = undefined;
      const differs = modelKey(target) !== modelKey(cur);
      const snapKey = `${ctx.sessionManager.getSessionId()}|${modelKey(cur)}`;
      const snap = snaps.get(snapKey) ?? loadSnap(snapKey);
      const ttl = ttlMs(cur);
      stat.limit =
        ttl === undefined
          ? null
          : ttl <= TTL_MARGIN_MS
            ? ttl
            : ttl - TTL_MARGIN_MS;
      // Captured once: `snap` narrows to non-undefined below, but the timing must not
      // change between the gate and the notification.
      const idleMs = snap ? Date.now() - snap.at : undefined;
      stat.gap = idleMs;
      stat.snapModel = snap?.model;
      stat.snapThinking = snap?.thinking;

      const verdict = decide({
        reason: event.reason,
        forced: args.c,
        native: args.nc,
        modelDiffers: differs,
        hasSnapshot: snap !== undefined,
        idleMs,
        limitMs: stat.limit,
        headroom:
          cur.contextWindow - event.preparation.tokensBefore - SAFETY_TOKENS,
      });
      why = verdict.why;
      if (verdict.warn === "c-vs-model")
        ctx.ui.notify(
          "/compact: -c and --model name different models; using native compaction.",
          "warning",
        );
      // `-c` wins over the TTL guess: say the risk, then do what the user asked.
      if (verdict.warn === "ttl" && idleMs !== undefined && stat.limit != null)
        ctx.ui.notify(
          `/compact -c: idle ${fmtDur(idleMs)} ≥ TTL guess ${fmtDur(stat.limit)}; appending anyway, and a miss bills the whole context.`,
          "warning",
        );

      if (!why && snap) {
        ctx.ui.setStatus("compact-cache", "compacting (append)…");
        try {
          // A changed thinking level does not break the prefix, so the new parameters
          // win instead of dropping to native on every later compaction.
          const takeParams =
            effort !== undefined ||
            snap.thinking !== String(ctx.thinkingLevel ?? "");
          const r = await appendSummary(
            ctx,
            event,
            snap,
            cur,
            args.focus,
            effort,
            takeParams,
          );
          if (typeof r === "string") why = r;
          else {
            const prev = [...event.branchEntries]
              .reverse()
              .find((e) => e.type === "compaction");
            const ops = event.preparation.fileOps;
            const files = mergeFiles(
              prev?.type === "compaction" ? prev.details : undefined,
              ops.read,
              [...ops.written, ...ops.edited],
            );
            pending = {
              ...stat,
              mode: "append",
              tag: args.c ? "forced" : "auto",
              ratio: r.ratio,
            };
            return {
              compaction: {
                summary: r.text + fileSection(files),
                firstKeptEntryId: event.preparation.firstKeptEntryId,
                tokensBefore: event.preparation.tokensBefore,
                usage: r.usage,
                details: files,
              },
            };
          }
        } finally {
          ctx.ui.setStatus("compact-cache", undefined);
        }
      }
    } catch (error) {
      why = `error: ${error instanceof Error ? error.message.slice(0, MAX_DIAGNOSTIC_CHARS) : "unknown"}`;
    }
    stat.tag = why ?? "fallback";
    pending = stat;
    // An aborted run would throw its result away; do not spend a request on it.
    if (event.signal.aborted) return { cancel: true };
    return nativeCompact(
      ctx,
      event,
      { model: finalModel, effort: finalEffort },
      cur,
      args.focus,
      stat,
    );
  });
}

/** Append-style summary; a string result is the reason it failed. */
async function appendSummary(
  ctx: ExtensionContext,
  event: SessionBeforeCompactEvent,
  snap: Snapshot,
  model: M,
  focus: string,
  effort: string | undefined,
  takeParams: boolean,
): Promise<string | { text: string; usage: CompactUsage; ratio: number }> {
  const pkg: typeof Pi = await import(PKG);
  const proj = ctx.sessionManager.buildSessionProjection();
  const entry = event.branchEntries.find(
    (e) => e.id === event.preparation.firstKeptEntryId,
  );
  const first = entry ? pkg.sessionEntryToContextMessages(entry)[0] : undefined;
  const prompt = fillPrompt(pickAnchor(first, proj.messages), focus);
  const messages = [
    ...pkg.convertToLlm(proj.messages),
    {
      role: "user" as const,
      content: [{ type: "text" as const, text: prompt }],
      timestamp: Date.now(),
    },
  ];
  // Narrowed by lookup instead of a cast: an unexpected value means "no reasoning", not a
  // silently mangled request.
  const level = REASONING_LEVELS.find(
    (candidate) => candidate === (effort ?? ctx.thinkingLevel),
  );
  const msg = await ctx.modelRegistry
    .streamSimple(
      model,
      { messages },
      {
        sessionId: ctx.sessionManager.getSessionId(),
        cacheRetention:
          process.env.PI_CACHE_RETENTION === "long" ? "long" : "short",
        reasoning: level,
        // Never ask for more than the model can emit: a fixed cap fails outright on small models.
        maxTokens: Math.min(SUMMARY_OUTPUT_TOKENS, model.maxTokens),
        signal: event.signal,
        onPayload: (p: unknown) => replay(snap.payload, p, takeParams),
        transformHeaders: snap.headers
          ? () => ({ ...snap.headers })
          : undefined,
      },
    )
    .result();
  if (msg.stopReason === "error") {
    const text = msg.errorMessage ?? "";
    const at = text.indexOf(MARK);
    return at >= 0
      ? `prefix: ${text
          .slice(at + MARK.length)
          .trim()
          .slice(0, MAX_DIAGNOSTIC_CHARS)}`
      : "request-failed";
  }
  if (msg.stopReason !== "stop") return `stop=${msg.stopReason}`;
  if (msg.content.some((b) => b.type === "toolCall")) return "tool-call";
  const text = cleanSummary(
    msg.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
  );
  if (!text) return "no-goal-heading";
  const u = msg.usage;
  const total = u.input + u.cacheRead + u.cacheWrite;
  return { text, usage: u, ratio: total ? u.cacheRead / total : 0 };
}

/**
 * Retry cap for tool output and tool-call arguments. pi's own serialization cuts results at
 * 2000 chars but writes tool-call arguments (file contents, edit bodies) out whole.
 */
const TRIM_CHARS = 500;

const clip = (text: string): string =>
  text.length <= TRIM_CHARS
    ? text
    : `${text.slice(0, TRIM_CHARS)}\n[... ${text.length - TRIM_CHARS} more characters truncated]`;

const clipArg = (value: unknown): unknown => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text !== undefined && text.length > TRIM_CHARS ? clip(text) : value;
};

/** Shortens long tool results, bash output and tool-call arguments; user and assistant text stay. */
export function trimMessages<T>(messages: T[]): T[] {
  return messages.map((message) => {
    if (!isRecord(message)) return message;
    if (message.role === "bashExecution" && typeof message.output === "string")
      return { ...message, output: clip(message.output) } as T;
    if (!Array.isArray(message.content)) return message;
    if (message.role === "toolResult")
      return {
        ...message,
        content: message.content.map((block) =>
          isRecord(block) && typeof block.text === "string"
            ? { ...block, text: clip(block.text) }
            : block,
        ),
      } as T;
    if (message.role === "assistant")
      return {
        ...message,
        content: message.content.map((block) =>
          isRecord(block) &&
          block.type === "toolCall" &&
          isRecord(block.arguments)
            ? {
                ...block,
                arguments: Object.fromEntries(
                  Object.entries(block.arguments).map(([k, v]) => [
                    k,
                    clipArg(v),
                  ]),
                ),
              }
            : block,
        ),
      } as T;
    return message;
  });
}

/**
 * `-nc` and every failed append end here. Attempt 1 uses the configured summary model with pi's
 * default serialization. Attempt 2 uses the session's own model and level with long tool output
 * cut. If both fail the compaction is cancelled: pi's built-in path sends the same `compact()`
 * request, so handing over would only repeat the failure.
 */
async function nativeCompact(
  ctx: ExtensionContext,
  event: SessionBeforeCompactEvent,
  pick: { model: M; effort: CompactThinking | undefined },
  cur: M,
  focus: string,
  stat: Stat,
) {
  const attempts = [
    { ...pick, trim: false },
    { model: cur, effort: undefined, trim: true },
  ];
  let failure = "";
  for (const attempt of attempts) {
    if (event.signal.aborted) break;
    // The stat line reports what compact() is actually called with.
    stat.model = modelKey(attempt.model);
    stat.cw = attempt.model.contextWindow;
    stat.thinking = String(attempt.effort ?? ctx.thinkingLevel ?? "");
    try {
      const pkg: typeof Pi = await import(PKG);
      const auth = await ctx.modelRegistry.getApiKeyAndHeaders(attempt.model);
      if (!auth.ok) throw new Error("no credentials");
      const headers = Object.fromEntries(
        Object.entries(auth.headers ?? {}).filter(([, v]) => v !== null),
      ) as Record<string, string>;
      const preparation = attempt.trim
        ? {
            ...event.preparation,
            messagesToSummarize: trimMessages(
              event.preparation.messagesToSummarize,
            ),
            turnPrefixMessages: trimMessages(
              event.preparation.turnPrefixMessages,
            ),
          }
        : event.preparation;
      const r = await pkg.compact(
        preparation,
        attempt.model,
        auth.apiKey,
        headers,
        focus || undefined,
        event.signal,
        attempt.effort ?? ctx.thinkingLevel,
        // Without an explicit streamFn compact() falls back to completeSimple and skips registry auth.
        (
          m: CompactStreamFnArg<0>,
          c: CompactStreamFnArg<1>,
          o: CompactStreamFnArg<2>,
        ) => ctx.modelRegistry.streamSimple(m, c, o),
        auth.env,
        undefined,
        undefined,
        ctx.sessionManager.getSessionId(),
      );
      // Our entries are fromHook, so pi will not carry earlier lists forward: merge them here.
      const prev = [...event.branchEntries]
        .reverse()
        .find((e) => e.type === "compaction");
      const d = isRecord(r.details) ? r.details : {};
      const files = mergeFiles(
        prev?.type === "compaction" ? prev.details : undefined,
        strings(d.readFiles),
        strings(d.modifiedFiles),
      );
      if (attempt.trim) stat.tag = `${stat.tag}|trimmed`;
      return {
        compaction: {
          ...r,
          summary: stripFileSections(r.summary) + fileSection(files),
          details: files,
        },
      };
    } catch (error) {
      failure =
        error instanceof Error ? error.message.slice(0, 200) : "unknown";
    }
  }
  stat.tag = `${stat.tag}|failed`;
  stat.error = failure || "aborted";
  if (!event.signal.aborted)
    ctx.ui.notify(
      `compact-cache: native compaction failed (${failure}). Compaction cancelled.`,
      "error",
    );
  return { cancel: true as const };
}

// ponytail: one runnable check, no framework. `COMPACT_CACHE_SELFTEST=1 bun compact-cache.ts`.
if (process.env.COMPACT_CACHE_SELFTEST) {
  const assert = (ok: unknown, what: string): void => {
    if (!ok) throw new Error(`self-test failed: ${what}`);
  };
  const eq = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

  assert(
    eq(parseArgs("-c focus here"), { c: true, nc: false, focus: "focus here" }),
    "-c + focus",
  );
  assert(
    parseArgs('--model "a/b c" -nc x').model === "a/b c",
    "quoted model value",
  );
  assert(parseArgs("-nc").nc && parseArgs("-nc").focus === "", "bare -nc");
  assert(parseArgs("note -c").c === false, "switch after text is text");
  assert(parseArgs('"-c" x').c === false, "quoted switch is text");
  assert(parseArgs("-cx").focus === "-cx", "-cx is not -c");
  assert(
    parseArgs('--model "oops x').focus === '--model "oops x',
    "unpaired quote is text",
  );

  assert(
    cleanSummary("Sure:\n```markdown\n## Goal\nx\n```") === "## Goal\nx",
    "preamble + fence",
  );
  assert(cleanSummary("# Goal\nx") === "# Goal\nx", "h1 goal");
  assert(
    cleanSummary("Sure:\r\n```markdown\r\n## Goal\r\nx\r\n```\r\n") ===
      "## Goal\r\nx",
    "CRLF preamble + fence",
  );
  assert(cleanSummary("no heading") === undefined, "missing goal rejected");

  const sys = { role: "system", content: "S" };
  const u = (t: string) => ({
    role: "user",
    content: [{ type: "text", text: t, cache_control: { type: "ephemeral" } }],
  });
  const snap = {
    model: "m",
    messages: [sys, u("a"), { role: "assistant", content: "b" }],
  };
  const ok = replay(snap, {
    model: "x",
    messages: [
      { role: "system", content: "other" },
      u("a"),
      { role: "assistant", content: "b" },
      u("go"),
    ],
  });
  assert(
    ok.model === "m" && (ok.messages as unknown[]).length === 4,
    "replay keeps snapshot top-level fields",
  );
  assert(
    (ok.messages as unknown[])[0] === sys,
    "replay keeps snapshot system item",
  );
  const bad = (m: unknown[]) => {
    try {
      replay(snap, { messages: m });
      return false;
    } catch (e) {
      return String(e).includes(MARK);
    }
  };
  assert(
    bad([u("a"), { role: "assistant", content: "B" }, u("go")]),
    "diff rejected",
  );
  assert(
    bad([u("a"), { role: "assistant", content: "b" }]),
    "no tail rejected",
  );
  assert(
    eq(
      replay(
        { input: [{ role: "user", content: "a" }] },
        { input: [{ role: "user", content: "a" }, u("z")] },
      ).input,
      [{ role: "user", content: "a" }, u("z")],
    ),
    "responses `input` body",
  );

  assert(
    eq(
      mergeFiles(
        { readFiles: ["a", "b"], modifiedFiles: ["c"] },
        ["b", "c", "d"],
        ["b"],
      ),
      { readFiles: ["a", "d"], modifiedFiles: ["b", "c"] },
    ),
    "file merge",
  );
  assert(
    stripFileSections(
      "S\n\n<read-files>\na\n</read-files>\n\n<modified-files>\nb\n</modified-files>",
    ) === "S",
    "strip file sections",
  );
  assert(
    pickAnchor({ content: "hello world" }, [
      { content: "x hello world y" },
      { content: "hello world" },
    ]) === undefined,
    "duplicate anchor falls back",
  );
  assert(
    pickAnchor({ content: "only me" }, [{ content: "only me" }]) === "only me",
    "unique anchor",
  );
  assert(
    fillPrompt("A$&", "").includes(">>> A$&\n"),
    "anchor filled literally",
  );
  const focused = fillPrompt("A", "look at the logs");
  assert(
    focused.indexOf("Additional focus") <
      focused.indexOf("Use this EXACT format."),
    "focus placed before the format spec",
  );
  assert(
    fillPrompt(undefined, "").includes("Nothing is retained verbatim"),
    "no-anchor boundary drops the retained-region claim",
  );
  assert(
    !fillPrompt(undefined, "").includes(">>>"),
    "no-anchor boundary has no arrow",
  );
  assert(
    eq(supportedEfforts({ reasoning: false }), ["off"]),
    "non-reasoning model only allows off",
  );
  assert(
    !supportedEfforts({ reasoning: true }).includes("max") &&
      supportedEfforts({ reasoning: true }).includes("high"),
    "xhigh/max require an explicit mapping",
  );
  assert(
    supportedEfforts({
      reasoning: true,
      thinkingLevelMap: { max: "max" },
    }).includes("max"),
    "mapped max is allowed",
  );
  assert(
    !supportedEfforts({
      reasoning: true,
      thinkingLevelMap: { low: null },
    }).includes("low"),
    "null mapping is excluded",
  );
  assert(
    parseArgs("--effort high refactor").effort === "high" &&
      parseArgs("--effort high refactor").focus === "refactor",
    "--effort + focus",
  );
  assert(
    parseArgs("-m a/b rest").model === "a/b" &&
      parseArgs("-m a/b rest").focus === "rest",
    "-m is --model",
  );
  assert(
    parseArgs("-e low rest").effort === "low" &&
      parseArgs("-e low rest").focus === "rest",
    "-e is --effort",
  );
  assert(
    parseArgs("--cached rest").c && parseArgs("--cached rest").focus === "rest",
    "--cached is -c",
  );
  assert(
    parseArgs("--not-cached rest").nc &&
      parseArgs("--not-cached rest").focus === "rest",
    "--not-cached is -nc",
  );
  assert(
    parseArgs("-e").focus === "-e" && parseArgs("-e").effort === undefined,
    "-e without a value is text",
  );
  assert(parseArgs("-m").focus === "-m", "-m without a value is text");
  assert(parseArgs("-effort").focus === "-effort", "-effort is not -e");
  assert(
    parseArgs('--not-cached -m "a b" y').nc &&
      parseArgs('--not-cached -m "a b" y').model === "a b",
    "long forms chain with a quoted value",
  );
  assert(
    parseArgs('--effort "max" -c').effort === "max" &&
      parseArgs('--effort "max" -c').c === true,
    "quoted effort value",
  );
  assert(
    parseArgs("--effort").focus === "--effort" &&
      parseArgs("--effort").effort === undefined,
    "--effort without value is text",
  );
  {
    const chain = parseArgs("--model a/b --effort low x");
    assert(
      chain.model === "a/b" && chain.effort === "low" && chain.focus === "x",
      "flags chain in order",
    );
  }
  assert(
    eq(
      Object.keys(
        replay(
          { messages: [{ role: "user", content: "a" }] },
          {
            messages: [
              { role: "user", content: "a" },
              { role: "user", content: "b" },
            ],
            temperature: 0.2,
            reasoning_effort: "high",
          },
          true,
        ),
      ).sort(),
      ["messages", "reasoning_effort", "temperature"],
    ),
    "effort takes params from the new payload",
  );
  assert(
    replay(
      { messages: [{ role: "user", content: "a" }], temperature: 0.1 },
      {
        messages: [
          { role: "user", content: "a" },
          { role: "user", content: "b" },
        ],
        temperature: 0.2,
      },
    ).temperature === 0.1,
    "without effort the snapshot params win",
  );
  {
    const before = {
      messages: [u("a")],
      tools: [{ name: "kept" }],
      reasoning_effort: "high",
      temperature: 0.5,
    };
    const after = replay(
      before,
      { messages: [u("a"), u("summary")], max_tokens: 1000 },
      true,
    );
    assert(
      !("reasoning_effort" in after) && !("temperature" in after),
      "parameters omitted by the new request are removed (high to off)",
    );
    assert(
      after.tools === before.tools &&
        after.max_tokens === 1000 &&
        before.reasoning_effort === "high",
      "parameter replacement preserves structure, output cap and snapshot",
    );
  }
  {
    const tool = { role: "tool", tool_call_id: "1", content: "result" };
    const cached = {
      ...tool,
      content: [
        { type: "text", text: "result", cache_control: { type: "ephemeral" } },
      ],
    };
    const after = replay(
      { messages: [cached] },
      { messages: [tool, u("summary")] },
    );
    assert(
      (after.messages as unknown[])[0] === cached,
      "cache marker text wrapping is equivalent and the original prefix is retained",
    );
    assert(
      (
        replay({ messages: [tool] }, { messages: [cached, u("summary")] })
          .messages as unknown[]
      )[0] === tool,
      "text wrapping is equivalent in either direction",
    );
    const original = { ...tool, arguments: { content: "x" } };
    for (const changed of [
      { ...original, content: "changed" },
      { ...original, content: [{ type: "text", text: "result", extra: true }] },
      {
        ...original,
        content: [
          { type: "text", text: "result" },
          { type: "image", source: "x" },
        ],
      },
      { ...original, arguments: { content: [{ type: "text", text: "x" }] } },
    ]) {
      let rejected = false;
      try {
        replay({ messages: [original] }, { messages: [changed, u("summary")] });
      } catch (error) {
        rejected = String(error).includes(MARK);
      }
      assert(
        rejected,
        "text normalization does not hide content or argument changes",
      );
    }
  }

  // ── warm-up / auxiliary requests ──
  assert(isAuxiliaryRequest({ max_output_tokens: 1 }), "warm-up cap 1");
  assert(
    isAuxiliaryRequest({ max_output_tokens: 16 }),
    "warm-up cap raised to 16",
  );
  assert(
    !isAuxiliaryRequest({ max_tokens: 4096 }),
    "real cap is not auxiliary",
  );
  assert(
    !isAuxiliaryRequest({ messages: [{ role: "user", content: "hi" }] }),
    "plain request is not auxiliary",
  );

  // ── decision table ──
  const gate = (over: Partial<Gate>): Verdict =>
    decide({
      reason: "manual",
      forced: false,
      native: false,
      modelDiffers: false,
      hasSnapshot: true,
      headroom: MIN_HEADROOM,
      ...over,
    });
  assert(
    eq(gate({ reason: "overflow" }), { why: "overflow" }),
    "overflow never appends",
  );
  assert(
    eq(gate({ native: true }), { why: "-nc" }),
    "-nc beats everything below it",
  );
  assert(
    eq(gate({ modelDiffers: true, forced: true }), {
      why: "-c vs --model",
      warn: "c-vs-model",
    }),
    "-c with another --model drops to native with a warning",
  );
  assert(
    eq(gate({ modelDiffers: true }), { why: "model" }),
    "a model switch drops to native",
  );
  assert(
    eq(gate({ hasSnapshot: false }), { why: "no-snapshot" }),
    "no snapshot",
  );
  assert(
    eq(gate({ idleMs: 1000, limitMs: 500 }), { why: "ttl" }),
    "an expired guess drops to native",
  );
  assert(
    eq(gate({ idleMs: 1000, limitMs: 500, forced: true }), { warn: "ttl" }),
    "-c overrides the TTL guess",
  );
  assert(
    eq(gate({ headroom: MIN_HEADROOM - 1 }), { why: "headroom" }),
    "headroom gate",
  );
  assert(eq(gate({}), {}), "everything green appends");
  assert(
    eq(gate({ headroom: MIN_HEADROOM - 1, idleMs: 1000, limitMs: 500 }), {
      why: "headroom",
    }),
    "headroom outranks the TTL guess",
  );

  // ── output caps are request parameters, never prefix ──
  const warmed = replay(
    { messages: [{ role: "user", content: "a" }], max_output_tokens: 16 },
    {
      messages: [
        { role: "user", content: "a" },
        { role: "user", content: "b" },
      ],
    },
  );
  assert(
    warmed.max_output_tokens === undefined,
    "warm-up cap never leaks into the replay",
  );
  const capped = replay(
    { messages: [{ role: "user", content: "a" }] },
    {
      messages: [
        { role: "user", content: "a" },
        { role: "user", content: "b" },
      ],
      max_tokens: 8000,
    },
  );
  assert(
    capped.max_tokens === 8000,
    "the new request decides its own output cap",
  );

  // ── cache TTL guesses ──
  assert(
    ttlMs({
      baseUrl: "http://127.0.0.1:12434/v1",
      provider: "Local",
      id: "x",
    } as M) ===
      60 * MINUTE_MS,
    "a local server keeps a 1h guess",
  );
  assert(
    ttlMs({ provider: "deepseek", id: "deepseek-flash" } as M) ===
      3 * 24 * 60 * MINUTE_MS,
    "deepseek keeps a 3d guess",
  );
  assert(
    ttlMs({
      provider: "Local",
      id: "x",
      baseUrl: "https://api.example.com/v1",
    } as M) ===
      60 * MINUTE_MS,
    "a local provider name counts even behind a proxy",
  );
  assert(
    ttlMs({
      provider: "somewhere",
      id: "x",
      baseUrl: "https://localhost.example.com/v1",
    } as M) ===
      15 * MINUTE_MS,
    "a hostname that only starts with localhost stays remote",
  );
  assert(
    ttlMs({
      provider: "openrouter",
      id: "unsloth/Qwen3.8-27B-GGUF:Q4_K_XL",
      baseUrl: "https://openrouter.ai/api/v1",
    } as M) ===
      60 * MINUTE_MS,
    "a quantized model id counts on any host",
  );
  assert(
    ttlMs({
      provider: "somewhere",
      id: "gemma-4-31b-nvfp4",
      baseUrl: "https://api.example.com/v1",
    } as M) ===
      60 * MINUTE_MS,
    "an fp4/fp8/bf16 suffix counts too",
  );
  assert(
    ttlMs({
      provider: "somewhere",
      id: "x",
      promptCache: { short: 60 },
    } as M) ===
      60 * 1000,
    "a TTL shorter than the margin still gets its full TTL",
  );

  // ── summary heading tolerance ──
  assert(cleanSummary("### Goal\nx") === "### Goal\nx", "h3 goal");
  assert(cleanSummary("**Goal**\nx") === "**Goal**\nx", "bold goal");

  // ── anchors ──
  assert(
    pickAnchor(
      {
        content: [
          { type: "toolCall", name: "bash", arguments: { command: "ls /tmp" } },
        ],
      },
      [
        {
          content: [
            {
              type: "toolCall",
              name: "bash",
              arguments: { command: "ls /tmp" },
            },
          ],
        },
      ],
    ) === "bash ls /tmp",
    "tool call anchor when there is no text",
  );
  assert(
    pickAnchor({ content: "same\nunique tail" }, [
      { content: "same\nother" },
      { content: "same\nunique tail" },
    ]) === "same\nunique tail",
    "anchor grows past the first line",
  );
  assert(
    pickAnchor({ content: "same\r\nunique tail" }, [
      { content: "same\r\nother" },
      { content: "same\r\nunique tail" },
    ]) === "same\r\nunique tail",
    "anchor preserves CRLF when growing past the first line",
  );

  // ── retry trimming ──
  {
    const long = "x".repeat(TRIM_CHARS + 50);
    const trimmed = JSON.stringify(
      trimMessages([
        { role: "user", content: long },
        { role: "toolResult", content: [{ type: "text", text: long }] },
        { role: "toolResult", content: [{ type: "text", text: "ok" }] },
        {
          role: "assistant",
          content: [
            {
              type: "toolCall",
              name: "write",
              arguments: { path: "a", body: long, n: 1 },
            },
          ],
        },
        { role: "bashExecution", command: "ls", output: long },
      ]),
    );
    assert(
      trimmed.split(long).length === 2,
      "only the user message keeps the long text",
    );
    assert(
      trimmed.split("50 more characters truncated").length === 4,
      "result, argument and bash output are cut and marked",
    );
    assert(
      trimmed.includes('"path":"a"') &&
        trimmed.includes('"n":1') &&
        trimmed.includes('"ok"'),
      "short values stay",
    );
  }
}
