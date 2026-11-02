# Hashline apply_patch

`hashline-apply-patch.ts` 是本地单文件 Pi 扩展。GPT 使用 Codex 的原生 FREEFORM patch 格式；扩展精确提交文件，随后通过当前会话的 hashline `read` 同步锚点。不会将补丁转换为公共 `replace` 请求，因此不受其正文清洗、边界空白保护和长行展示限制影响。

## 启用

- 保持 `~/.pi/agent/gpt-enhance.json` 的 `applyPatch: false`，避免两个实现注册同名工具。
- 在 `~/.pi/agent/settings.json` 加载 `./extensions/hashline-apply-patch.ts`。
- 在 Pi 中执行 `/reload`。工具标签为 `Hashline Apply Patch`。
- 仅在 `openai-responses` / `openai-codex-responses` 的 `gpt-*`、`openai/gpt-*` 模型下自动启用，要求 hashline `read` 处于活动状态；不再要求 `replace` 活动。

提交普通文件文本，不要复制 `abcde│` 等工具输出前缀：

```diff
*** Begin Patch
*** Update File: example.txt
@@
-old text
+new text
*** End Patch
```

返回 diff 中的 `+anchor│`、`anchor│` 是当前 hashline 实例登记的可用锚点，可继续用于 `replace`、`insert` 等工具。`-anchor│` 属于旧内容，不能用作新编辑的边界。空文件也返回可用于填入内容的锚点。超长行和过大的 diff 会显示省略提示。

## Codex 兼容行为

- 路径按字面解释，包括相对路径开头的 `@`，不会把 `@file` 当成 `file`。
- 支持 Add、Delete、Update、Move、多 chunk，以及没有初始 `@@` 的首个 chunk。解析器也接受空 Add 和 Codex 的 heredoc 容错包装；模型使用的 FREEFORM grammar 保持标准格式，不需要这些容错形式。
- 上下文依次尝试精确匹配、忽略行尾空白、忽略首尾空白、常见 Unicode 标点及空格归一化。采用当前搜索位置之后的首个匹配，不再要求上下文唯一。
- `@@ 标题` 用于推进原文搜索位置；纯追加 chunk 不推进游标。相同位置的多个追加按补丁顺序写入。
- `*** End of File` 优先匹配文件尾部；无法匹配时回退到普通搜索。支持末尾空上下文哨兵的重试。
- 匹配时允许上下文存在空白或 Unicode 差异，但写回时保留原上下文正文和换行。新增及替换行使用文件首个已有换行符；没有已有换行符时使用 LF。Update 会为未终止的末行补换行，与当前 Codex 的行为一致。
- Update 保留 BOM。Add 按补丁内容写入，包括覆盖时增加或去掉 BOM。删除后接壤的独立 CR 与空行 LF 不会被合并成一个 CRLF。
- Add 和 Move 可以覆盖已有普通文件。每个路径可在同一补丁中出现多次，后续操作使用此前操作的虚拟结果，例如 Add 后 Update、Delete 后 Add、Move 后 Update。
- `abcde│literal`、`+abcde│literal` 等合法正文原样写入，不再作为锚点前缀剥除或一律拒绝。字面的 `\n`、`\uXXXX` 不会额外解码。
- 首尾有空白行的文件可以清空、删除、移动。长行不要求先通过 `read` 完整展示，仍可按补丁内容匹配和修改。

## 提交与权限

补丁先计算全部操作和路径状态，检查上下文、文件类型、文件/父目录冲突、大小和已知访问权限，再按顺序提交。涉及的 canonical 路径使用固定排序的文件 mutation queue，避免相互等待；进入队列后和实际写入前检查取消信号。

**写入授权以外层 `apply_patch` 的 `tool_call` 为边界。** 该工具声明 `readOnlyHint: false`、`destructiveHint: true`，内部只通过 `ctx.executeTool("read", ...)` 获取和登记当前实例的锚点；写入和删除不再经过嵌套 `replace`。权限扩展若只拦截 `replace` 或 `write`，须把 `apply_patch` 纳入规则，检查其补丁内的全部源路径和目标路径。不能将允许 `read` 当作允许写入。

使用 `pi-permission-system` 时，若希望每次补丁都询问，可在 `~/.pi/agent/extensions/pi-permission-system/config.json` 的 `permission` 对象中加入：

```json
"apply_patch": "ask"
```

审批需要 `yoloMode: false`，可用 `/yolo off` 设置；`yoloMode: true` 会自动批准 `ask`。未配置 `apply_patch` 时，它匹配通用工具规则，例如 `"*": "allow"`，不会继承 `write`、`replace` 或 `insert` 的审批规则。工具的 `destructiveHint` 等声明是元数据，不会自行触发审批。

上述配置只审批整次补丁。当前权限扩展没有解析补丁内的全部路径；若要按敏感路径控制 Add、Update、Delete 和 Move，还需支持补丁源路径和目标路径的检查。

已有文件在提交前通过活动 `read` 登记原快照。返回 diff 的现存行也通过同一 reader 分页登记，不导入第二份内存 registry。撤销记录通过 hashline 当前的 SQLite 格式保存，保存失败则不执行对应的文件变更。

- 普通覆盖使用 hashline `writeAtomic`，保留已有目标权限；其硬链接写入分支仍是原位写入。
- 新路径使用同目录临时文件加独占 `link` 发布完整字节，不覆盖准备期间新出现的文件。
- Delete 直接保存原快照后移除，不先清空文件。Linux 上只读源文件仍可 Delete/Move，移除依赖父目录权限；Windows 会在发布 Move 目标前拒绝只读源文件，不自动清除其只读属性。
- Move 先写目标再移除源。全新目标继承源权限位；已有目标保留自身权限位。同一补丁中删除后重建的原有路径保留补丁前权限，避免撤销后将私有内容暴露。只读目标会在预检阶段拒绝，不先创建副本再失败。
- Delete/Move 允许普通硬链接源，移除时不更改其他硬链接的内容。
- 提交前比较完整原始字节、路径指向及文件身份，不仅比较 hashline 的短行摘要。准备期间发现的外部更改会中止补丁。

## 撤销与失败恢复

同一补丁中，每个**补丁开始前已存在**的文件保留一份原快照。即使该路径多次更新，`undo_last_change` 也恢复到整份补丁之前的内容、BOM、换行和权限位。没有实际变更的操作不覆盖已有撤销记录。

- 覆盖已有 Add/Move 目标：可对目标路径执行 `undo_last_change`。
- Delete：对原路径撤销可恢复文件，不需要事先创建空文件。
- Move：对源路径撤销可恢复源；若目标原已存在，可另外撤销目标。新建的目标须另行删除。
- 新建：沿用 `write` 的语义，清除该路径的旧撤销记录，不记录“恢复到文件不存在”。

**补丁不是多文件原子事务，也不自动回滚。** 运行期间的权限变化、取消、I/O 故障或写后锚点刷新失败，仍可能使部分操作已经完成。错误会列出已完成的操作。重试前检查相关路径，不要直接重复提交整份补丁；按路径撤销或删除新文件后再决定如何继续。

## 保留的限制

- 仅处理有效 UTF-8 普通文本，不支持 NUL、二进制、UTF-16/32 或超出 hashline 字节/行数上限的文件。
- Delete/Move 拒绝最终分量是 symlink 的源，避免将链接恢复为普通文件；父目录可以是 symlink。Update/Add 仍可通过 symlink 访问其普通文件目标。
- 拒绝源、目标解析为同一路径或同一 inode（硬链接别名）的 Move，以及重叠的更新 chunk。
- Windows 的补丁虚拟状态按不区分大小写的路径匹配，保留实际路径拼写供 hashline 使用；Linux 仍区分大小写。Windows 手动启用目录大小写敏感的情形不在支持范围内。
- 原子覆盖需要目标父目录可写。只读父目录中即使文件本身可写，也可能无法 Update；这是当前原子写入实现与 Codex 原位写入的差异。
- 撤销只恢复内容和权限位，不恢复 symlink/hardlink 关系、所有者、ACL、扩展属性或时间戳。
- 路径检查与最终文件系统操作之间仍有 TOCTOU 窗口。它不是抵御恶意并发换链的安全边界；不要让其他进程同时修改涉及的文件或链接。

## 验证与依赖

无新增依赖，也不修改安装包。FREEFORM 工具 schema 复用已安装的 `pi-gpt-enhance`；补丁解析和匹配保存在本地，避免继承其 `@` 路径清洗。文件提交、diff 和 SQLite 格式复用 `pi-hashline-edit-pro` 的内部接口。包升级不会覆盖本地扩展，但内部接口变化仍可能影响兼容性。

Pi 1.5.0 改用 `pi-schema` 校验工具参数；本扩展使用普通 JSON Schema，无需迁移。参数校验先于 `tool_call` 权限回调。`input: null` 会被转换为字符串 `"null"`，随后由补丁解析器拒绝，不写入文件。

```bash
bun test ~/.pi/agent/tests/gpt-enhance-codex.test.ts
bun test ~/.pi/agent/tests/hashline-apply-patch-integration.test.ts
```

两个文件分别运行，避免共享测试进程中的环境变量和模块状态。测试自动发现本地、pnpm、npm 或 Bun 安装的 Pi，不再依赖固定 Linux 用户目录。测试使用 `node:sqlite`，与 Pi 的 Node 宿主一致；本机 Windows Bun 1.4.0 的 `bun:sqlite` 会丢失 TEXT 开头的 BOM，因此不使用该引擎验证撤销。

`gpt-enhance-codex.test.ts` 覆盖语法与匹配、覆盖及重复路径、BOM/混合换行、长行、精确正文、权限、链接、撤销持久化、文件队列取消，以及真实 Pi loader 的独立模块锚点协同。

`hashline-apply-patch-integration.test.ts` 使用真实 Pi 会话的嵌套工具管线，验证已注册 `apply_patch` 的实际调用、返回锚点再次编辑、参数校验先于权限回调、`null` 转换后解析失败且不写入、外层调用权限阻断、预检 read 阻断，以及排队取消后不写入。不请求模型服务，未验证真实 GPT 服务端生成行为。

上游对照：[parser](https://github.com/openai/codex/blob/main/codex-rs/apply-patch/src/parser.rs)、[file_update](https://github.com/openai/codex/blob/main/codex-rs/apply-patch/src/file_update.rs)、[text_file](https://github.com/openai/codex/blob/main/codex-rs/apply-patch/src/text_file.rs)。
