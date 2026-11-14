# Hashline apply_patch

`hashline-apply-patch.ts` 是 Pi 扩展。GPT 使用 Codex 原生 FREEFORM patch 格式；扩展精确提交文件，并通过当前会话的 hashline `read` 同步锚点。不将补丁转换为 `replace` 请求，因此不受其正文清洗、边界空白保护和长行展示限制。

## 启用

- 保持 `~/.pi/agent/gpt-enhance.json` 的 `applyPatch: false`，避免工具冲突。
- 在 `~/.pi/agent/settings.json` 加载 `./extensions/hashline-apply-patch.ts`。
- 执行 `/reload`。工具标签为 `Hashline Apply Patch`。
- 仅在 `openai-responses` / `openai-codex-responses` 的 `gpt-*` 模型下启用，需 `read` 活动。

提交普通文件文本，不要复制工具输出前缀：

```diff
*** Begin Patch
*** Update File: example.txt
@@
-old text
+new text
*** End Patch
```

返回的 `+anchor│`、`anchor│` 是当前实例的可用锚点。`-anchor│` 为旧内容，不可用。空文件返回可用锚点。超长行和过大 diff 显示省略提示。

## Codex 兼容行为

- 路径按字面解释（含 `@` 开头路径）。
- 支持 Add、Delete、Update、Move、多 chunk。
- 上下文尝试精确匹配、空白归一化及 Unicode 归一化。
- `@@ 标题` 推进搜索位置；纯追加 chunk 不推进。
- `*** End of File` 优先匹配文件尾。
- 匹配允许空白或 Unicode 差异，回写保留原上下文正文和换行。
- Update 保留 BOM。Add 按补丁内容写入。
- 每个路径可在同一补丁中多次操作，后续操作基于虚拟结果。
- 合法正文（含 `abcde│`）原样写入。
- 空白行文件支持清空、删除、移动。

## 提交与权限

补丁先检查上下文、文件类型、冲突、大小和权限，再顺序提交。涉及的路径使用固定排序的 mutation queue。

**写入授权以外层 `apply_patch` 的 `tool_call` 为边界。** 工具声明 `readOnlyHint: false`、`destructiveHint: true`，不经过嵌套 `replace`。权限扩展若只拦截 `replace` 或 `write`，须将 `apply_patch` 纳入规则。

若希望每次补丁均确认，在 `~/.pi/agent/extensions/pi-permission-system/config.json` 加入：

```json
"apply_patch": "ask"
```

需 `/yolo off` 审批。未显式配置时匹配通用工具规则。

已有文件在提交前通过活动 `read` 登记快照。撤销记录通过 SQLite 保存。

- 覆盖：使用 `writeAtomic`。
- 新路径：使用临时文件加独占 `link` 发布。
- Delete：保存原快照后移除，不先清空。
- Move：先写目标再移除源。新建目标继承源权限。

## 撤销与失败恢复

每个**补丁前存在**的文件保留一份原快照。

- 覆盖：执行 `undo_last_change` 恢复。
- Delete：撤销恢复，无需预先创建文件。
- Move：对源路径撤销恢复源；目标可另行撤销。
- 新建：记录不包含“恢复到文件不存在”。

**补丁并非原子事务。** 权限变化、I/O 故障或锚点刷新失败可能导致部分操作完成。错误将列出已完成的操作。重试前需检查路径状态，按需撤销或删除新文件。

## 保留的限制

- 仅处理有效 UTF-8 普通文本。
- Delete/Move 拒绝 symlink 源。
- 拒绝解析为同一路径的 Move，及重叠的更新 chunk。
- Windows 虚拟状态按不区分大小写匹配。
- 撤销不恢复 symlink/hardlink、所有者、ACL 或扩展属性。

## 验证与依赖

不新增依赖。解析与匹配保存在本地。文件提交、diff 和 SQLite 复用 `pi-hashline-edit-pro` 内部接口。

```bash
bun test ~/.pi/agent/tests/gpt-enhance-codex.test.ts
bun test ~/.pi/agent/tests/hashline-apply-patch-integration.test.ts
```

各测试文件分别运行以隔离环境。
