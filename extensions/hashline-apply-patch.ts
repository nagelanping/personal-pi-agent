/*
 * Patch syntax and matching derived from OpenAI Codex apply_patch.
 * Copyright 2025 OpenAI. SPDX-License-Identifier: Apache-2.0
 */
import {
  truncateHead,
  withFileMutationQueue,
  type ExtensionAPI,
  type ExtensionContext,
  type ExtensionToolContext,
} from "@earendil-works/pi-coding-agent";
import { randomUUID } from "node:crypto";
import { constants, type Stats } from "node:fs";
import {
  access,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rm,
  unlink,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { TextDecoder } from "node:util";
import { createApplyPatchTool } from "../npm/node_modules/pi-gpt-enhance/src/apply-patch-tool.ts";
import { MAX_BYTES } from "../npm/node_modules/pi-hashline-edit-pro/src/constants.ts";
import { writeAtomic } from "../npm/node_modules/pi-hashline-edit-pro/src/fs-write.ts";
import {
  deleteUndo,
  getSnapshot,
  getUndoEntry,
  loadHashStore,
  upsertUndo,
  type HashStore,
} from "../npm/node_modules/pi-hashline-edit-pro/src/hash-store.ts";
import { ANCHOR_COUNT } from "../npm/node_modules/pi-hashline-edit-pro/src/hashline/alphabet.ts";
import {
  stripBOM,
  toLF,
} from "../npm/node_modules/pi-hashline-edit-pro/src/normalize.ts";
import { genDiff } from "../npm/node_modules/pi-hashline-edit-pro/src/replace-diff.ts";

type Line = { text: string; ending: string };
type Chunk = {
  changeContext?: string;
  oldLines: string[];
  newLines: string[];
  contexts: [number, number][];
  eof: boolean;
};
type Hunk = {
  kind: "add" | "update" | "delete";
  path: string;
  movePath?: string;
  contents: string;
  chunks: Chunk[];
};
type Snapshot = {
  path: string;
  logicalPath: string;
  info?: Stats;
  raw: string | undefined;
};
type Change = {
  source: Snapshot;
  destination?: Snapshot;
  contents: string | undefined;
  kind: Hunk["kind"];
};

function missing(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function pathKey(path: string): string {
  // shortcut: assumes normal case-insensitive Win32 directories; revisit for per-directory case sensitivity.
  return process.platform === "win32" ? path.toLowerCase() : path;
}

async function canonical(path: string): Promise<string> {
  try {
    return await realpath(path);
  } catch (error) {
    if (!missing(error)) throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    return resolve(await canonical(parent), basename(path));
  }
}

function linesOf(text: string): Line[] {
  return Array.from(text.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g), (match) => ({
    text: match[1] ?? "",
    ending: match[2] ?? "",
  })).filter(
    (line, index, lines) =>
      index !== lines.length - 1 || line.text !== "" || line.ending !== "",
  );
}

function bytesOf(lines: Line[]): string {
  return lines
    .map((line, index) => {
      // Keep a lone CR and a following empty LF line from merging into one CRLF.
      const ending =
        line.text === "" &&
        line.ending === "\n" &&
        lines[index - 1]?.ending === "\r"
          ? "\r\n"
          : line.ending;
      return line.text + ending;
    })
    .join("");
}

async function snapshot(path: string, logicalPath = path): Promise<Snapshot> {
  try {
    const info = await lstat(path);
    if (!info.isFile()) throw new Error(`Not a regular file: ${logicalPath}`);
    if (info.size > MAX_BYTES)
      throw new Error(`File exceeds hashline's byte limit: ${logicalPath}`);
    const raw = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(await readFile(path));
    if (raw.includes("\0"))
      throw new Error(`Binary files are not supported: ${logicalPath}`);
    return { path, logicalPath, info, raw };
  } catch (error) {
    if (!missing(error)) throw error;
    return { path, logicalPath, raw: undefined };
  }
}

export function parsePatch(input: string): Hunk[] {
  let lines = input
    .trim()
    .split("\n")
    .map((line) => line.replace(/\r$/, ""));
  if (
    /^<<(?:EOF|'EOF'|"EOF")$/.test(lines[0] ?? "") &&
    lines.at(-1)?.endsWith("EOF")
  )
    lines = lines.slice(1, -1);
  if (
    lines[0]?.trim() !== "*** Begin Patch" ||
    lines.at(-1)?.trim() !== "*** End Patch"
  )
    throw new Error(
      "Invalid patch: expected *** Begin Patch and *** End Patch boundaries.",
    );
  const hunks: Hunk[] = [];
  let current: Hunk | undefined;
  const fail = (index: number, message: string): never => {
    throw new Error(`Invalid patch hunk on line ${index + 1}: ${message}`);
  };
  const finish = (index: number) => {
    if (current?.kind !== "update") return;
    const last = current.chunks.at(-1);
    if (!last || (!last.oldLines.length && !last.newLines.length))
      fail(
        index,
        `Update hunk for ${current.path} does not contain any lines.`,
      );
  };
  for (let index = 1; index < lines.length - 1; index++) {
    const line = lines[index]!;
    const marker = current?.kind === "update" ? line.trimEnd() : line.trim();
    const header = /^\*\*\* (Add|Delete|Update) File: (.+)$/.exec(marker);
    if (header) {
      finish(index);
      const path = header[2]!;
      if (path.includes("\0"))
        fail(index, "Patch paths cannot contain NUL bytes.");
      current = {
        kind: header[1]!.toLowerCase() as Hunk["kind"],
        path,
        contents: "",
        chunks: [],
      };
      hunks.push(current);
      continue;
    }
    if (!current) fail(index, "Expected an Add, Delete or Update File header.");
    const hunk = current!;
    if (hunk.kind === "add") {
      if (!line.startsWith("+"))
        fail(index, "Add File contents must start with '+'.");
      hunk.contents += line.slice(1) + "\n";
      continue;
    }
    if (hunk.kind === "delete")
      fail(index, "Unexpected text after Delete File.");
    let chunk = hunk.chunks.at(-1);
    if (chunk?.eof) {
      if (marker === "") continue;
      if (marker !== "@@" && !marker.startsWith("@@ "))
        fail(index, "Expected @@ after *** End of File.");
    }
    if (
      !chunk &&
      hunk.movePath === undefined &&
      marker.startsWith("*** Move to: ")
    ) {
      hunk.movePath = marker.slice("*** Move to: ".length);
      if (!hunk.movePath || hunk.movePath.includes("\0"))
        fail(index, "Invalid Move path.");
      continue;
    }
    if (marker === "@@" || marker.startsWith("@@ ")) {
      if (chunk && !chunk.oldLines.length && !chunk.newLines.length)
        fail(index, "Empty update chunk.");
      hunk.chunks.push({
        changeContext: marker === "@@" ? undefined : marker.slice(3),
        oldLines: [],
        newLines: [],
        contexts: [],
        eof: false,
      });
      continue;
    }
    if (marker === "*** End of File") {
      if (!chunk || (!chunk.oldLines.length && !chunk.newLines.length))
        fail(index, "Empty EOF chunk.");
      chunk!.eof = true;
      continue;
    }
    if (line !== "" && !/^[ +\-]/.test(line))
      fail(index, "Expected context, '+' or '-' line.");
    if (!chunk) {
      chunk = { oldLines: [], newLines: [], contexts: [], eof: false };
      hunk.chunks.push(chunk);
    }
    if (line === "" || line.startsWith(" ")) {
      chunk.contexts.push([chunk.oldLines.length, chunk.newLines.length]);
      chunk.oldLines.push(line.slice(1));
      chunk.newLines.push(line.slice(1));
    } else if (line.startsWith("+")) chunk.newLines.push(line.slice(1));
    else chunk.oldLines.push(line.slice(1));
  }
  finish(lines.length - 1);
  if (!hunks.length) throw new Error("No files were modified.");
  return hunks;
}

function normaliseForMatch(text: string): string {
  return text
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u2018-\u201b]/g, "'")
    .replace(/[\u201c-\u201f]/g, '"')
    .replace(/[\u00a0\u2002-\u200a\u202f\u205f\u3000]/g, " ");
}

function seek(
  lines: Line[],
  pattern: string[],
  start: number,
  eof = false,
): number | undefined {
  if (!pattern.length) return start;
  if (pattern.length > lines.length) return undefined;
  const last = lines.length - pattern.length;
  const search = (from: number) => {
    for (const normalize of [
      (text: string) => text,
      (text: string) => text.trimEnd(),
      (text: string) => text.trim(),
      normaliseForMatch,
    ]) {
      for (let at = from; at <= last; at++)
        if (
          pattern.every(
            (text, index) =>
              normalize(lines[at + index]!.text) === normalize(text),
          )
        )
          return at;
    }
    return undefined;
  };
  return search(eof ? last : start) ?? (eof ? search(start) : undefined);
}

function applyChunks(raw: string, path: string, chunks: Chunk[]): string {
  const { bom, text } = stripBOM(raw);
  const lines = linesOf(text);
  const ending = lines.find((line) => line.ending)?.ending ?? "\n";
  const edits: { at: number; count: number; replacement: Line[] }[] = [];
  let cursor = 0;
  for (const chunk of chunks) {
    if (chunk.changeContext !== undefined) {
      const context = seek(lines, [chunk.changeContext], cursor);
      if (context === undefined)
        throw new Error(
          `Failed to find context '${chunk.changeContext}' in ${path}`,
        );
      cursor = context + 1;
    }
    if (!chunk.oldLines.length) {
      edits.push({
        at: lines.length,
        count: 0,
        replacement: chunk.newLines.map((text) => ({ text, ending })),
      });
      continue;
    }
    let old = chunk.oldLines;
    let added = chunk.newLines;
    let at = seek(lines, old, cursor, chunk.eof);
    if (at === undefined && old.at(-1) === "") {
      old = old.slice(0, -1);
      if (added.at(-1) === "") added = added.slice(0, -1);
      at = seek(lines, old, cursor, chunk.eof);
    }
    if (at === undefined)
      throw new Error(
        `Failed to find expected lines in ${path}:\n${chunk.oldLines.join("\n")}`,
      );
    const replacement = added.map((text) => ({ text, ending }));
    // Preserve actual context, not the patch's whitespace/Unicode approximation.
    for (const [oldIndex, newIndex] of chunk.contexts)
      if (oldIndex < old.length && newIndex < replacement.length)
        replacement[newIndex] = { ...lines[at + oldIndex]! };
    edits.push({ at, count: old.length, replacement });
    cursor = at + old.length;
  }
  edits.sort((left, right) => left.at - right.at);
  let previousEnd = 0;
  for (const edit of edits) {
    if (edit.at < previousEnd)
      throw new Error(`Overlapping update chunks in ${path}.`);
    previousEnd = edit.at + edit.count;
  }
  let result = lines.map((line) => ({ ...line }));
  for (const edit of edits.reverse())
    result = [
      ...result.slice(0, edit.at),
      ...edit.replacement,
      ...result.slice(edit.at + edit.count),
    ];
  for (const line of result) if (!line.ending) line.ending = ending;
  return bom + bytesOf(result);
}

async function assertRemovalSource(source: Snapshot): Promise<void> {
  const info = await lstat(source.logicalPath);
  if (info.isSymbolicLink())
    throw new Error(
      `Delete/Move refuses a symlink source: ${source.logicalPath}`,
    );
  if (
    !info.isFile() ||
    pathKey(await canonical(source.logicalPath)) !== pathKey(source.path) ||
    (source.info &&
      (info.dev !== source.info.dev ||
        info.ino !== source.info.ino ||
        info.mode !== source.info.mode))
  )
    throw new Error(`File changed before Delete/Move: ${source.logicalPath}`);
}

async function assertUnchanged(source: Snapshot): Promise<void> {
  const current = await snapshot(source.path, source.logicalPath);
  if (
    pathKey(await canonical(source.logicalPath)) !== pathKey(source.path) ||
    current.raw !== source.raw ||
    (source.info &&
      (current.info?.dev !== source.info.dev ||
        current.info?.ino !== source.info.ino ||
        current.info?.mode !== source.info.mode ||
        current.info?.mtimeMs !== source.info.mtimeMs))
  )
    throw new Error(
      `File changed during patch preparation: ${source.logicalPath}. Read it again.`,
    );
}

export async function planPatch(input: string, cwd: string): Promise<Change[]> {
  const hunks = parsePatch(input);
  const states = new Map<string, Snapshot>();
  const directories = new Set<string>();
  const take = async (path: string): Promise<Snapshot> => {
    const logicalPath = resolve(cwd, path);
    const target = await canonical(logicalPath);
    if (directories.has(pathKey(target)))
      throw new Error(`Patch path is a directory: ${path}`);
    const previous = states.get(pathKey(target));
    if (previous && previous.path !== target && previous.info) {
      const actual = await snapshot(target, logicalPath);
      if (
        actual.info &&
        (actual.info.dev !== previous.info.dev ||
          actual.info.ino !== previous.info.ino)
      )
        throw new Error(
          `Case-sensitive Windows path aliases are not supported: ${path}`,
        );
    }
    const state = previous ?? (await snapshot(target, logicalPath));
    return { ...state, logicalPath };
  };
  const ensureParents = async (target: Snapshot) => {
    for (let parent = dirname(target.path); ; parent = dirname(parent)) {
      const planned = states.get(pathKey(parent));
      if (planned?.raw !== undefined)
        throw new Error(`Patch parent is a file: ${parent}`);
      if (!planned && !directories.has(pathKey(parent))) {
        try {
          if (!(await lstat(parent)).isDirectory())
            throw new Error(`Patch parent is not a directory: ${parent}`);
        } catch (error) {
          if (!missing(error)) throw error;
        }
      }
      directories.add(pathKey(parent));
      if (dirname(parent) === parent) break;
    }
  };
  const changes: Change[] = [];
  for (const hunk of hunks) {
    const source = await take(hunk.path);
    if (hunk.kind !== "add" && source.raw === undefined)
      throw new Error(`File does not exist: ${hunk.path}`);
    if ((hunk.kind === "delete" || hunk.movePath !== undefined) && source.info)
      await assertRemovalSource(source);
    const contents =
      hunk.kind === "delete"
        ? undefined
        : hunk.kind === "add"
          ? hunk.contents
          : applyChunks(source.raw!, source.logicalPath, hunk.chunks);
    if (contents?.includes("\0"))
      throw new Error("Patch contents cannot contain NUL bytes.");
    if (
      contents !== undefined &&
      Buffer.byteLength(contents, "utf8") > MAX_BYTES
    )
      throw new Error(
        `Patch result exceeds hashline's byte limit: ${source.logicalPath}`,
      );
    if (contents !== undefined && linesOf(contents).length > ANCHOR_COUNT)
      throw new Error(
        `Patch result exceeds hashline's ${ANCHOR_COUNT}-line limit: ${source.logicalPath}`,
      );
    const destination =
      hunk.movePath === undefined ? undefined : await take(hunk.movePath);
    if (
      destination &&
      (pathKey(destination.path) === pathKey(source.path) ||
        (source.info &&
          destination.info &&
          source.info.dev === destination.info.dev &&
          source.info.ino === destination.info.ino))
    )
      throw new Error(
        `Move source and destination are the same file: ${hunk.path}`,
      );
    const target = destination ?? source;
    if (contents !== undefined) await ensureParents(target);
    changes.push({ source, destination, contents, kind: hunk.kind });
    states.set(pathKey(source.path), {
      ...source,
      info: destination || contents === undefined ? undefined : source.info,
      raw: destination ? undefined : contents,
    });
    if (destination)
      states.set(pathKey(destination.path), { ...destination, raw: contents });
  }
  return changes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readAnchors(
  ctx: ExtensionToolContext,
  source: Snapshot,
  signal?: AbortSignal,
  offset = 1,
  limit = 1,
): Promise<void> {
  const end = offset + limit;
  while (offset < end) {
    signal?.throwIfAborted();
    const outcome = await ctx.executeTool(
      "read",
      { path: source.path, offset, limit: end - offset, anchors: true },
      { signal },
    );
    if (outcome.isError)
      throw new Error(
        outcome.result.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n"),
      );
    const read = outcome.result.structuredContent;
    if (
      !isRecord(read) ||
      read.kind !== "read" ||
      read.hadUtf8DecodeErrors ||
      !Array.isArray(read.lines)
    )
      throw new Error(
        "apply_patch requires the active hashline read tool and valid UTF-8 text.",
      );
    await assertUnchanged(source);
    const last = read.lines.at(-1);
    if (
      !isRecord(last) ||
      typeof last.line !== "number" ||
      last.line < offset ||
      last.line >= end
    )
      throw new Error(
        `Hashline read did not serve the requested rows: ${source.logicalPath}`,
      );
    offset = last.line + 1;
  }
}

async function createFile(
  target: Snapshot,
  contents: string,
  mode: number,
  signal?: AbortSignal,
): Promise<void> {
  await mkdir(dirname(target.path), { recursive: true });
  const temporary = resolve(
    dirname(target.path),
    `.pi-apply-patch-${randomUUID()}`,
  );
  try {
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(contents, "utf8");
      await handle.chmod(mode);
      await handle.sync();
    } finally {
      await handle.close();
    }
    signal?.throwIfAborted();
    await assertUnchanged(target);
    signal?.throwIfAborted();
    await link(temporary, target.path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function checkWritableParent(path: string): Promise<void> {
  let parent = dirname(path);
  while (true) {
    try {
      if (!(await lstat(parent)).isDirectory()) {
        parent = dirname(parent);
        continue;
      }
      await access(parent, constants.W_OK | constants.X_OK);
      return;
    } catch (error) {
      if (!missing(error) || parent === dirname(parent)) throw error;
      parent = dirname(parent);
    }
  }
}

function saveUndo(
  store: HashStore,
  original: Snapshot,
  hashes: string[],
  result: string | undefined,
): void {
  if (original.raw === undefined) return;
  const before = stripBOM(original.raw);
  const after = stripBOM(result ?? "");
  // The existing undo format has one BOM field for both sides.
  const bom =
    result === undefined || before.bom === after.bom ? before.bom : "";
  const content = original.raw.slice(bom.length);
  const resulting = (result ?? bom).slice(bom.length);
  upsertUndo(store, original.path, {
    content: toLF(content),
    bom,
    ending: linesOf(content).find((line) => line.ending)?.ending ?? "\n",
    separators: linesOf(content).flatMap((line) =>
      line.ending ? [line.ending] : [],
    ),
    hashes,
    resultContent: toLF(resulting),
    resultSeparators: linesOf(resulting).flatMap((line) =>
      line.ending ? [line.ending] : [],
    ),
    mode:
      original.info?.mode === undefined
        ? undefined
        : original.info.mode & 0o7777,
  });
}

async function withQueues<T>(
  paths: string[],
  run: () => Promise<T>,
  index = 0,
): Promise<T> {
  const path = paths[index];
  return path === undefined
    ? run()
    : withFileMutationQueue(path, () => withQueues(paths, run, index + 1));
}

export async function executePatch(
  input: string,
  ctx: ExtensionToolContext,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const changes = await planPatch(input, ctx.cwd);
  const originals = new Map<string, Snapshot>();
  for (const change of changes)
    for (const source of [change.source, change.destination])
      if (source && !originals.has(source.path))
        originals.set(source.path, source);
  const completed: string[] = [];
  try {
    return await withQueues([...originals.keys()].sort(), async () => {
      signal?.throwIfAborted();
      const store = await loadHashStore();
      const originalHashes = new Map<string, string[]>();
      for (const source of originals.values()) {
        await assertUnchanged(source);
        if (source.raw !== undefined) {
          await readAnchors(ctx, source, signal);
          const hashes = getSnapshot(
            store,
            source.path,
            toLF(stripBOM(source.raw).text),
          );
          if (!hashes)
            throw new Error(
              `Hashline did not register the original snapshot: ${source.logicalPath}`,
            );
          originalHashes.set(source.path, hashes);
        }
      }
      // Check all deterministic access failures before a Move can publish its target.
      for (const change of changes) {
        if (change.kind === "delete" || change.destination) {
          await checkWritableParent(change.source.path);
          // Windows refuses to unlink a read-only file even in a writable directory.
          if (process.platform === "win32" && change.source.info)
            await access(change.source.path, constants.W_OK);
        }
        if (change.contents !== undefined) {
          const target = change.destination ?? change.source;
          if (target.raw !== undefined && target.info !== undefined)
            await access(target.path, constants.W_OK);
          await checkWritableParent(target.path);
        }
      }
      for (const source of originals.values()) await assertUnchanged(source);
      const finals = new Map(originals);
      const mutate = async (
        expected: Snapshot,
        contents: string | undefined,
        status: string,
        mode?: number,
      ) => {
        signal?.throwIfAborted();
        const current = await snapshot(expected.path, expected.logicalPath);
        if (
          current.raw !== expected.raw ||
          pathKey(await canonical(expected.logicalPath)) !==
            pathKey(expected.path)
        )
          throw new Error(
            `File changed before patch commit: ${expected.logicalPath}`,
          );
        if (contents === current.raw) {
          completed.push(`${status} ${current.logicalPath}`);
          return;
        }
        if (contents === undefined) await assertRemovalSource(current);
        if (contents !== undefined && current.raw !== undefined)
          await access(current.path, constants.W_OK);
        const original = originals.get(current.path)!;
        const previousUndo = getUndoEntry(store, current.path);
        saveUndo(
          store,
          original,
          originalHashes.get(current.path) ?? [],
          contents,
        );
        try {
          await assertUnchanged(current);
          signal?.throwIfAborted();
          if (contents === undefined) await unlink(current.path);
          else if (current.raw === undefined) {
            // Undo preserves an existing target's mode, so a recreated private path must stay private.
            const creationMode = original.info
              ? original.info.mode & 0o7777
              : (mode ?? 0o666 & ~process.umask());
            await createFile(current, contents, creationMode, signal);
          } else await writeAtomic(current.path, contents, current.info);
        } catch (error) {
          if (previousUndo) upsertUndo(store, current.path, previousUndo);
          else deleteUndo(store, current.path);
          throw error;
        }
        if (original.raw === undefined) deleteUndo(store, current.path);
        completed.push(`${status} ${current.logicalPath}`);
        const final = await snapshot(current.path, current.logicalPath);
        if (final.raw !== contents)
          throw new Error(
            `File changed after patch commit: ${current.logicalPath}`,
          );
        finals.set(current.path, final);
      };
      for (const change of changes) {
        const currentSource = finals.get(change.source.path)!;
        await assertUnchanged({
          ...currentSource,
          logicalPath: change.source.logicalPath,
        });
        if (change.destination) {
          const target = finals.get(change.destination.path)!;
          await mutate(
            { ...target, logicalPath: change.destination.logicalPath },
            change.contents,
            "A",
            currentSource.info === undefined
              ? undefined
              : currentSource.info.mode & 0o7777,
          );
          await mutate(
            { ...currentSource, logicalPath: change.source.logicalPath },
            undefined,
            "D",
          );
        } else
          await mutate(
            { ...currentSource, logicalPath: change.source.logicalPath },
            change.contents,
            change.kind === "add" ? "A" : change.kind === "delete" ? "D" : "M",
          );
      }
      const output = [
        `Success. Updated the following files:\n${completed.join("\n")}`,
      ];
      for (const [path, final] of finals) {
        const original = originals.get(path)!;
        const before = toLF(stripBOM(original.raw ?? "").text);
        const after = toLF(stripBOM(final.raw ?? "").text);
        let hashes: string[] = [];
        if (final.raw !== undefined) {
          await readAnchors(ctx, final, signal);
          hashes = getSnapshot(store, path, after) ?? [];
          if (!hashes.length)
            throw new Error(
              `Hashline did not register the patched snapshot: ${final.logicalPath}`,
            );
        }
        const diff = genDiff(
          before,
          after,
          2,
          hashes,
          originalHashes.get(path),
        );
        const rows = diff.diff.split("\n");
        // Only the active reader can serve anchors in Pi's independently loaded hashline instance.
        const live = rows.flatMap((row, index) =>
          /^[+ ][a-z]{5}│/.test(row) && diff.lineNumbers[index] !== undefined
            ? [diff.lineNumbers[index]!]
            : [],
        );
        for (let index = 0; index < live.length; ) {
          const start = live[index]!;
          let end = start;
          while (live[index + 1] === end + 1) end = live[++index]!;
          await readAnchors(ctx, final, signal, start, end - start + 1);
          index++;
        }
        output.push(`${final.logicalPath}\n${diff.diff || "No text changes."}`);
        if (final.raw !== undefined && after === "")
          output.push(` ${hashes[0]}│`);
        if (original.raw === undefined && final.raw !== undefined)
          output.push("New file creation has no undo_last_change record.");
      }
      const truncated = truncateHead(output.join("\n\n"));
      return {
        content: [
          {
            type: "text" as const,
            text:
              truncated.content +
              (truncated.truncated
                ? "\n[Output truncated; use read for fresh anchors on remaining files.]"
                : ""),
          },
        ],
        details: { completed, truncated: truncated.truncated },
      };
    });
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\n${
        completed.length
          ? `Completed operations (not rolled back):\n${completed.join("\n")}`
          : "No operations completed."
      }\nInspect the affected paths before retrying. Existing files have per-path undo_last_change; new files must be removed separately.`,
      { cause: error },
    );
  }
}

export default function hashlineApplyPatch(pi: ExtensionAPI): void {
  const tool = createApplyPatchTool();
  pi.registerTool({
    ...tool,
    label: "Hashline Apply Patch",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    reachesTools: () => ["read"],
    description:
      "Apply a native Codex patch as FREEFORM text, not JSON. Use ordinary file contents, without hashline row prefixes. Supports Codex context matching, Add/Move overwrites and sequential changes to the same path. Returns live hashline diff anchors. Existing files support per-path undo_last_change; new file creation does not. All changes are preflighted, but execution is not a multi-file transaction. Delete/Move of a symlink source is refused.",
    promptGuidelines: [
      "Use apply_patch for normal code changes: submit native *** Begin Patch / *** End Patch syntax and plain text, not hashline row prefixes. Its returned +/space diff anchors can be used by hashline tools.",
    ],
    async execute(_id, { input }, signal, _onUpdate, ctx) {
      return executePatch(input, ctx, signal);
    },
  });
  const sync = (ctx: ExtensionContext, model = ctx.model) => {
    const active = pi.getActiveTools();
    const eligible =
      model !== undefined &&
      (model.api === "openai-responses" ||
        model.api === "openai-codex-responses") &&
      /^(?:openai\/)?gpt-/.test(model.id) &&
      active.includes("read");
    if (eligible && !active.includes(tool.name))
      pi.setActiveTools([...active, tool.name]);
    else if (!eligible && active.includes(tool.name))
      pi.setActiveTools(active.filter((name) => name !== tool.name));
  };
  pi.on("session_start", (_event, ctx) => sync(ctx));
  pi.on("model_select", (event, ctx) => sync(ctx, event.model));
  pi.on("before_agent_start", (_event, ctx) => sync(ctx));
}
