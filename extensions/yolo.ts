/** `/yolo` toggles pi-permission-system and reloads its live configuration. */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

type PermissionConfig = Record<string, unknown> & { yoloMode?: unknown };

const MISSING = "missing";
const INVALID = "invalid";

async function agentDir(): Promise<string> {
  try {
    return (await import("@earendil-works/pi-coding-agent")).getAgentDir();
  } catch (error) {
    // Plain Node cannot resolve Pi's package when running the isolated self-test.
    if (
      process.env.YOLO_MODE_SELFTEST === "1" &&
      process.env.PI_CODING_AGENT_DIR
    ) {
      return process.env.PI_CODING_AGENT_DIR;
    }
    throw error;
  }
}

async function configPath(): Promise<string> {
  return join(
    await agentDir(),
    "extensions",
    "pi-permission-system",
    "config.json",
  );
}

/** `/yolo` toggles; `/yolo on|off|toggle` is explicit. */
function nextYolo(args: string, current: boolean): boolean {
  const arg = args.trim().toLowerCase();
  if (arg === "on" || arg === "true") return true;
  if (arg === "off" || arg === "false") return false;
  if (arg === "" || arg === "toggle") return !current;
  throw new Error("Usage: /yolo [on|off|toggle|true|false]");
}

function readConfig(
  path: string,
): PermissionConfig | typeof MISSING | typeof INVALID {
  try {
    const config: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      config === null ||
      typeof config !== "object" ||
      Array.isArray(config)
    ) {
      return INVALID;
    }
    if ("yoloMode" in config && typeof config.yoloMode !== "boolean")
      return INVALID;
    return config as PermissionConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return MISSING;
    if (error instanceof SyntaxError) return INVALID;
    throw error;
  }
}

// Retry transient file locks without deleting the destination.
const TRANSIENT_FS_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);

/** Never written, so every `Atomics.wait` times out: the standard blocking sleep. */
const SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));

function retrying<T>(operation: () => T): T {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (attempt >= 3 || !TRANSIENT_FS_CODES.has(code)) throw error;
      Atomics.wait(SLEEP_BUFFER, 0, 0, 20);
    }
  }
}

/** Temp + rename, so an interrupted write cannot truncate the policy file. */
function writeYolo(
  path: string,
  config: PermissionConfig,
  enabled: boolean,
): void {
  path = realpathSync(path);
  const mode = statSync(path).mode & 0o777;
  const tempDir = mkdtempSync(join(dirname(path), ".yolo-"));
  const tempPath = join(tempDir, "config.json");
  try {
    writeFileSync(
      tempPath,
      `${JSON.stringify({ ...config, yoloMode: enabled }, null, 2)}\n`,
      { flag: "wx", mode },
    );
    chmodSync(tempPath, mode);
    retrying(() => renameSync(tempPath, path));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export default function yoloExtension(pi: ExtensionAPI): void {
  let pendingReload = false;
  pi.registerCommand("yolo", {
    description: "Toggle pi-permission-system YOLO Mode",
    handler: async (args, ctx) => {
      if (pendingReload) {
        ctx.ui.notify(
          "YOLO Mode change already pending; wait for reload.",
          "warning",
        );
        return;
      }
      pendingReload = true;
      let saved = false;
      try {
        const path = await configPath();
        const config = readConfig(path);
        if (config === MISSING || config === INVALID) {
          const why =
            config === MISSING
              ? "does not exist — create it first, or run /permission-system"
              : "must be a JSON object with an optional boolean yoloMode — fix it first";
          ctx.ui.notify(`YOLO Mode unchanged: ${path} ${why}.`, "error");
          return;
        }
        const enabled = nextYolo(args, config.yoloMode === true);
        writeYolo(path, config, enabled);
        saved = true;
        ctx.ui.notify(
          `Global YOLO Mode ${enabled ? "ON" : "OFF"} saved; live permissions change after idle reload. Project config may override it.`,
          "info",
        );
        await ctx.waitForIdle();
        await ctx.reload();
      } catch (error) {
        ctx.ui.notify(
          `YOLO Mode ${saved ? "saved, but reload failed" : "unchanged"}: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      } finally {
        pendingReload = false;
      }
    },
  });
}

// Run with: YOLO_MODE_SELFTEST=1 node /path/to/yolo.ts
if (process.env.YOLO_MODE_SELFTEST === "1") {
  const { default: assert } = await import("node:assert/strict");
  const { existsSync, lstatSync, readdirSync, symlinkSync } =
    await import("node:fs");
  const { tmpdir } = await import("node:os");
  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  const dir = mkdtempSync(join(tmpdir(), "yolo-"));
  process.env.PI_CODING_AGENT_DIR = dir;
  try {
    assert.equal(nextYolo("", false), true);
    assert.equal(nextYolo(" ON ", false), true);
    assert.equal(nextYolo("true", false), true);
    assert.equal(nextYolo("off", true), false);
    assert.equal(nextYolo("false", true), false);
    assert.equal(nextYolo("toggle", true), false);
    assert.throws(() => nextYolo("of", true), /Usage:/);

    const file = join(dir, "extensions", "pi-permission-system", "config.json");
    const seed = { permission: { "*": "ask" }, yoloMode: false };
    mkdirSync(dirname(file), { recursive: true });
    const reset = () => writeFileSync(file, JSON.stringify(seed));
    const read = () =>
      JSON.parse(readFileSync(file, "utf8")) as PermissionConfig;
    reset();
    chmodSync(file, 0o600);
    const originalMode = statSync(file).mode & 0o777;

    type Handler = Parameters<ExtensionAPI["registerCommand"]>[1]["handler"];
    let command: Handler | undefined;
    yoloExtension({
      registerCommand: (name: string, options: { handler: Handler }) => {
        assert.equal(name, "yolo");
        command = options.handler;
      },
    } as unknown as ExtensionAPI);
    assert.ok(command);
    const handler = command;
    const notes: string[] = [];
    let reloads = 0;
    let waitForIdle = async (): Promise<void> => {};
    let reload = async (): Promise<void> => {
      reloads++;
    };
    const run = (args: string) =>
      handler(args, {
        ui: { notify: (message: string) => notes.push(message) },
        waitForIdle: () => waitForIdle(),
        reload: () => reload(),
      } as Parameters<Handler>[1]);

    await run("");
    assert.equal(read().yoloMode, true);
    assert.deepEqual(read().permission, seed.permission);
    assert.equal(statSync(file).mode & 0o777, originalMode);
    assert.match(notes.at(-1) ?? "", /ON saved/);
    await run("off");
    assert.equal(read().yoloMode, false);
    assert.equal(reloads, 2);
    const beforeTypo = readFileSync(file, "utf8");
    await run("of");
    assert.equal(readFileSync(file, "utf8"), beforeTypo);
    assert.match(notes.at(-1) ?? "", /Usage:/);
    assert.equal(reloads, 2);

    let settle: (() => void) | undefined;
    let started: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      started = resolve;
    });
    waitForIdle = () =>
      new Promise<void>((resolve) => {
        settle = resolve;
        started?.();
      });
    const pending = run("on");
    await waiting;
    assert.equal(read().yoloMode, true);
    assert.equal(reloads, 2);
    await run("off");
    assert.match(notes.at(-1) ?? "", /already pending/);
    assert.equal(read().yoloMode, true);
    assert.ok(settle);
    settle();
    await pending;
    assert.equal(reloads, 3);
    waitForIdle = async () => {};

    for (const invalid of [
      "{oops",
      "null",
      "[]",
      '"text"',
      "1",
      "true",
      '{"yoloMode":"true"}',
    ]) {
      writeFileSync(file, invalid);
      await run("on");
      assert.equal(readFileSync(file, "utf8"), invalid);
      assert.match(notes.at(-1) ?? "", /must be a JSON object/);
    }
    assert.equal(reloads, 3);
    reset();
    waitForIdle = async () => {
      throw new Error("idle failed");
    };
    await run("on");
    assert.equal(read().yoloMode, true);
    assert.match(notes.at(-1) ?? "", /saved, but reload failed: idle failed/);
    waitForIdle = async () => {};
    reload = async () => {
      throw new Error("reload failed");
    };
    await run("off");
    assert.equal(read().yoloMode, false);
    assert.match(notes.at(-1) ?? "", /saved, but reload failed: reload failed/);
    reload = async () => {
      reloads++;
    };
    await run("on");
    assert.equal(reloads, 4, "failure releases the pending-command guard");

    if (process.platform !== "win32") {
      const target = join(dir, "target.json");
      renameSync(file, target);
      symlinkSync(target, file);
      await run("off");
      assert.ok(lstatSync(file).isSymbolicLink());
      assert.equal(read().yoloMode, false);
    }
    const blocked = join(dir, "destination-directory");
    mkdirSync(blocked);
    assert.throws(() => writeYolo(blocked, seed, true));
    assert.ok(
      statSync(blocked).isDirectory(),
      "failed rename preserves destination",
    );
    assert.equal(
      readdirSync(dir).some((name) => name.startsWith(".yolo-")),
      false,
    );
    assert.equal(
      readdirSync(dirname(file)).some((name) => name.startsWith(".yolo-")),
      false,
    );

    let attempts = 0;
    assert.equal(
      retrying(() => {
        if (++attempts < 2)
          throw Object.assign(new Error("locked"), { code: "EBUSY" });
        return "ok";
      }),
      "ok",
    );
    assert.equal(attempts, 2);
    attempts = 0;
    assert.throws(
      () =>
        retrying(() => {
          attempts++;
          throw Object.assign(new Error("denied"), { code: "EACCES" });
        }),
      /denied/,
    );
    assert.equal(attempts, 4);

    const beforeMissing = reloads;
    const emptyAgent = join(dir, "missing-agent");
    process.env.PI_CODING_AGENT_DIR = emptyAgent;
    await run("on");
    assert.match(notes.at(-1) ?? "", /does not exist/);
    assert.equal(existsSync(emptyAgent), false);
    assert.equal(reloads, beforeMissing);
    console.log("yolo self-test OK");
  } finally {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    rmSync(dir, { recursive: true, force: true });
  }
}
