# 本地扩展 Windows / Linux 兼容性检查

检查范围为本目录中的 5 个 TypeScript 扩展及权限配置。未修改已安装的第三方包、系统 PATH、模型配置或 `yoloMode`。

| 文件 | 处理结果 |
| --- | --- |
| `compact-cache.ts` | 修复 CRLF 摘要末尾代码围栏清理，以及多行锚点换行保留；增加 CRLF 自检。已有跨平台目录处理保留。 |
| `effort-alias.ts` | 使用 Pi 终端按键 API，无平台专属路径或命令；无需修改。 |
| `hashline-apply-patch.ts` | Windows 补丁虚拟状态合并路径大小写别名；只读源文件在 Delete/Move 预检阶段拒绝，避免 Move 先发布目标再删除失败。Linux 保留区分大小写和 POSIX 删除权限语义。 |
| `summary-timestamp.ts` | 相对导入和 `Intl.DateTimeFormat` 可在 Windows 加载；无需修改。 |
| `yolo.ts` | 原子保存和文件锁重试已有 Windows 处理；自检改为验证文件系统实际支持的权限位，Linux 仍先设置 `0600`。 |
| `pi-permission-system/config.json` | 补充 `~/.pi/agent/auth.json` 和 `~/.pi/agent/models.json` 规则，使现有敏感文件确认策略也覆盖 Linux home 路径；原 Windows 规则保留。 |

## 已执行验证

- Windows 11 / Node 26.5.0：Pi 实际 loader 加载全部 5 个扩展，`errors: []`。
- Node 执行 `compact-cache` 和 `yolo` 内置自检通过。
- 4 个测试文件分别执行：共 49 项通过、3 项 POSIX 专用测试在 Windows 跳过、0 项失败。覆盖补丁、锚点复用、撤销、BOM/CRLF、链接、取消、权限阻断、Windows 大小写别名、只读 Move 及扩展加载。
- Bun 1.4.0 测试使用 `node:sqlite`，不使用存在 BOM 丢失问题的 `bun:sqlite`；测试清理同时关闭隔离加载的 hashstore，并释放 Bun 的待回收 SQLite statements，避免 Windows 文件锁阻止清理。

## 复测

测试文件须分别运行，不要合并为一个共享环境的测试进程。以下为 PowerShell 命令；本机 PATH 中的 `bun.ps1` 已失效，故显式调用现存 executable：

```powershell
$bun = "$HOME\.bun\bin\bun.exe"
$tests = "$HOME\.pi\agent\tests"
foreach ($name in @(
  'gpt-enhance-codex.test.ts',
  'hashline-apply-patch-integration.test.ts',
  'permission-config.test.ts',
  'extensions-load.test.ts'
)) {
  & $bun test (Join-Path $tests $name)
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $name" }
}
```

Linux 使用已安装的 `bun` 分别运行上述测试文件即可。内置自检可运行：

```bash
PI_CACHE_RETENTION=short COMPACT_CACHE_SELFTEST=1 node ~/.pi/agent/extensions/compact-cache.ts
YOLO_MODE_SELFTEST=1 node ~/.pi/agent/extensions/yolo.ts
```

## 未验证与限制

- 本机没有可用的 WSL/Linux 环境，未在真实 Linux 系统复测。Linux 专用权限测试仍保留。
- Windows 手动开启目录大小写敏感的情形不在本次补丁路径支持范围内；新文件发布仍需要文件系统支持硬链接。
- hashline 按路径保存撤销记录。应使用一致的规范路径，避免混用 Windows 8.3 短路径、长路径或其他路径别名查询同一文件的撤销记录。
- 未调用模型服务，也未验证真实摘要请求、GPT 服务端补丁生成或终端交互视觉效果。
- 扩展继续依赖 `npm/node_modules` 中现有包的相对位置；复制到 Linux 时还需在 Linux 安装对应依赖，不能把 Windows native dependencies 直接复制过去。
- 本机 Bun shim 和 SQLite 问题已记录在 `../PAPERCUTS.md`；未改动全局环境。插件改动需在 Pi 执行 `/reload` 后进入新运行时。
