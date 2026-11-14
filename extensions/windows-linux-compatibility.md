# 本地扩展 Windows / Linux 兼容性检查

检查范围为本目录中的 5 个 TypeScript 扩展及权限配置。未修改已安装第三方包、系统 PATH、模型配置或 `yoloMode`。

| 文件 | 处理结果 |
| --- | --- |
| `compact-cache.ts` | 修复 CRLF 摘要末尾代码围栏清理，保留多行锚点换行，增加 CRLF 自检。 |
| `effort-alias.ts` | 使用 Pi 终端按键 API，无需修改。 |
| `hashline-apply-patch.ts` | 合并 Windows 补丁路径大小写别名；Move 预检拒绝只读源文件，避免 Move 后删除失败；保留 Linux 区分大小写和 POSIX 权限语义。 |
| `summary-timestamp.ts` | 无需修改。 |
| `yolo.ts` | 原子保存和文件锁重试已处理 Windows；自检校验文件系统实际支持的权限位，Linux 仍先设置 `0600`。 |
| `pi-permission-system/config.json` | 补充覆盖 Linux home 路径的敏感文件规则。 |

## 已执行验证

- **Windows 11 / Node 26.5.0**：Pi 加载 5 个扩展，无报错。
- **自检**：`compact-cache` 和 `yolo` 内置自检通过。
- **测试**：4 个测试文件分别执行，共 49 项通过。覆盖补丁、锚点、撤销、BOM/CRLF、链接、权限、Windows 大小写别名等场景。
- **Bun 1.4.0**：测试清理 Hashstore 并释放 SQLite statements，避免 Windows 文件锁阻塞。

## 复测

测试文件须分别运行，避免环境污染。

**PowerShell 命令**：
```powershell
$bun = "$HOME\.bun\bin\bun.exe"
$tests = "$HOME\.pi\agent\tests"
foreach ($name in @('gpt-enhance-codex.test.ts', 'hashline-apply-patch-integration.test.ts', 'permission-config.test.ts', 'extensions-load.test.ts')) {
  & $bun test (Join-Path $tests $name)
  if ($LASTEXITCODE -ne 0) { throw "Test failed: $name" }
}
```

**Linux**：使用 `bun` 分别运行。

**内置自检**：
```bash
PI_CACHE_RETENTION=short COMPACT_CACHE_SELFTEST=1 node ~/.pi/agent/extensions/compact-cache.ts
YOLO_MODE_SELFTEST=1 node ~/.pi/agent/extensions/yolo.ts
```

## 未验证与限制

- 未在真实 Linux 系统环境复测。
- Windows 目录大小写敏感场景不支持。
- 撤销记录基于路径，需确保路径规范一致。
- 未验证摘要请求、GPT 服务端生成或交互视觉效果。
- 扩展继续依赖相对位置的依赖库，Linux 环境需重装依赖。
- 本机环境问题已记录至 `../PAPERCUTS.md`。
