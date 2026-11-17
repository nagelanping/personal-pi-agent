# compact-cache

`compact-cache.ts` 在完整会话末尾追加检查点指令，尝试复用最近一次请求的前缀缓存。无法安全回放或生成失败时，由扩展调用 Pi 的 `compact()`。切点、会话落盘、上下文重建及消息调度仍由 Pi 管理。

当会话模型的 provider 为 `openai-codex`、API 为 `openai-codex-responses` 时，本扩展不采集快照，也不接管压缩，交由 `pi-codex-native` 处理。

本文按本机 Pi 1.5.2 实现核对。删除了旧的 1M 窗口配置、已移除路径及重复的实验过程；历史命中记录仅作为取舍依据，不视为当前服务保证。

## 是否值得保留

保留快照回放，但不增加自动价格调度、TTL 学习或独立 tokenizer。

Pi 原生摘要将待压缩消息序列化成纯文本，丢弃思考块、将工具结果截到 2000 字符，并设置 `cacheRetention: "none"`。它无法原样复用最近一次完整会话请求的前缀。append 在缓存便宜且确实命中时仍有价值；本地模型的收益主要是减少 prefill 时间。

append 发送完整上下文，native 仅发送需要摘要的内容，且可以使用另一个模型。两者的价格、输入长度和输出长度不同。旧文档以 `native ≈ 0.5C` 推导出的 56% 命中门槛不再适合作为配置依据。`cacheRetention: "none"` 也不意味着所有 provider 都没有缓存读取。

历史 DeepSeek append 记录多次达到约 99% 命中，包括恢复会话后的快照回放；其他 provider 缺少专门的压缩实测。TTL 与前缀校验用于限制尝试范围，实际命中仍以返回的 usage 为准。

## 窗口与输出预算

模型的 128k 最大输出是通用能力上限，不是摘要目标，也不是 `reserveTokens` 必须预留的额度。摘要仍以 8000 token 为目标，提示词要求不超过 12000 token。请求另留思考空间，最高输出额度为 32768 token。

### append

令 `W` 为模型窗口，`B` 为 `preparation.tokensBefore`，`P` 为新增压缩指令的 token 估算值（包括 focus 和保留区锚点）：

```text
outputBudget = max(0, floor(min(32768, model.maxTokens, W - B - P - 4096)))
```

- 先用 `P=0` 做门控，再构造提示词并计算实际额度。
- 额度不足 16384 时改走 native，避免在全量输入上申请过小的生成额度。
- 16384 是尝试下限，不是摘要质量保证。高思考档位可能耗尽额度；`length` 结果会被拒绝并降级。
- 在最终 payload 层再限制输出，防止适配器把 thinking budget 追加到显式 `maxTokens` 后突破额度。Anthropic 及 Bedrock 的显式 thinking budget 同步缩小，并至少给答案留 1024 token；adaptive thinking 无此字段。
- Pi 的估算与服务端 tokenizer 可能不同，4096 是安全垫。快照回放还会恢复系统提示和工具声明，所以不能仅依赖回放前的 provider 上下文估算。

### native

扩展通过 `streamFn` 为每次 Pi 摘要请求设置 `min(32768, model.maxTokens)` 上限，并在最终 payload 层限额。Pi 适配器仍可按实际摘要输入进一步缩小额度。split-turn 的历史摘要和回合前缀摘要分别限额，用量由 Pi 汇总。

Pi 1.5.2 自身已有上下文余量钳制。扩展增加独立额度的目的是限制摘要规模和最坏生成时长，不是修补一个完全不存在的超窗保护。`reserveTokens` 只决定何时压缩，不控制 native 摘要输出。

### 当前配置的取舍

保持现有设置，不由扩展修改 `settings.json`：

```json
{
  "compaction": {
    "reserveTokens": 36864,
    "modelOverrides": {
      "Local/bartowski/ScarletKc_ScarletKc-2.0-GGUF:Q8_0": {
        "reserveTokens": 16384
      }
    }
  }
}
```

Pi 的触发条件是严格的 `B > W - reserveTokens`。旧实现要求 `W - B - 4096 >= 32768`，因此 `reserveTokens=36864` 时，这两个条件没有交集。将 36864 写成“刚好够用”是错误的。

现在输出额度按余量收缩。例如越过阈值 1 token 时，额度为 `32767 - P`，仍可尝试 append。继续超过阈值、遇到很大的工具结果或很长的 focus 时，可能降到 16k 以下并使用 native。这是预期降级，无须为保证所有压缩都 append 而提前大量压缩。

36864 分别占 256 Ki 与 512 Ki 窗口的约 14% 和 7%。本地 Scarlet 保持 16384，正常阈值路径使用 native，以换取更大的工作上下文。手动提前压缩且余量充足时，本地模型仍可 append。`keepRecentTokens` 未配置时沿用 Pi 默认 20000，不随 128k 输出能力放大。

允许模型单次输出 128k，不意味着一次长回复和工具批次结束后还会剩下 36k；大幅越过阈值时走 native，超窗恢复也只走 native。

## 回放与门控

按以下顺序决定是否跳过 append：

1. `overflow`。
2. 用户指定 `-nc`。
3. `--model` 与当前会话模型不同；同时有 `-c` 时提示冲突。
4. 无可用快照。
5. 可申请的输出额度不足 16k。
6. 快照闲置时间达到 TTL 猜测门限；`-c` 可以覆盖这一项。

进入 append 后，还要通过保留边界检查、包含新增提示词的预算检查，以及最终 payload 前缀检查。`-c` 不覆盖这些检查。

快照回放的规则：

- 比对 provider payload 的 `messages` 或 `input` 消息前缀，忽略 `cache_control`。消息 content 的字符串与单个纯文本块视为等价；工具参数和带额外字段的内容不做宽松归一化。
- 比对时剔除开头的 system/developer；发送时恢复快照里的前导消息、顶层 system/instructions 和 tools。这些结构字段不与新请求逐一比较。
- 验证成功后保留快照原始前缀，只追加新尾部；比对失败会在 `onPayload` 阶段终止请求。
- 输出额度永远取新请求，并受摘要预算限制。显式 effort 或会话档位变化时，其他非结构参数也取新请求，清除新请求省略的旧值。

这保证回放的一致性，不保证服务端命中。Anthropic 断点、路由亲和、服务端淘汰和参数变化都可能影响缓存。历史 DeepSeek 的 low/high 互换曾保持高命中，`max` 三次只有约 13%–19%；原因未查明，不据此增加特殊分支。

## 快照生命周期

请求先进入候选区，HTTP 200 后成为可回放快照。200 只代表请求被接受，不能证明流已成功结束或缓存已建立。输出上限不超过 16 的预热请求和 Pi 摘要请求不参与快照采集。

快照按 `sessionId|provider/modelId` 分键。模型切换、树导航与压缩后不主动清除已接受快照；最终前缀检查拒绝不匹配的分支。候选快照在压缩后清除。

默认落盘目录为 `~/.pi/agent/compact-cache/`，`PI_CODING_AGENT_DIR` 可覆盖 agent 目录。在 `agent_settled` 和 `session_shutdown` 时写入 `{at, model, thinking, payload}`，避免每次请求同步序列化大 payload。超过 32M 字符不写，启动时清理 7 天未更新的文件。

请求头仅保存在内存，不落盘；payload 仍含对话内容。磁盘快照缺少路由请求头，本地服务重启后 KV 会丢失，内存快照中的请求头也可能陈旧。请求失败时降级；未命中但成功的请求仍接受摘要，并依据 usage 告警。

本扩展的 `before_provider_request` 必须在所有改写 payload 的扩展之后运行，尤其是返回副本的 `pi-cache-optimizer`。后续扩展若再次替换 payload，快照就不再代表最终请求。

### TTL 猜测

优先使用 `model.promptCache` 对应的 short/long 声明；当前实现对识别为本地的模型先采用 1h 猜测。其他默认值：

| 类别 | TTL 猜测 |
| --- | --- |
| 本地地址、provider 名含 local，或量化模型名 | 1h |
| DeepSeek | 3d |
| Anthropic API 或 Claude 模型名 | short 为 5m，`PI_CACHE_RETENTION=long` 为 1h |
| 其他 | 15m |

TTL 大于 5m 时减去 5m 作为门限。以上仅是启发式值，量化模型名也可能误识别远端服务。DeepSeek 的 3d 依据旧的服务口径与最长约 69h 的历史快照命中；不表示固定保存 72h。暂不增加 TTL 学习，因为可区分前缀变化与缓存淘汰的独立闲置样本不足。

## 摘要边界与降级

保留区锚点取自 `buildSessionProjection()` 中 `firstKeptEntryId` 对应的消息，使用编辑后的正文。锚点必须在投影中唯一；先扩展首行，再追加后续行。保留区存在但找不到唯一锚点时使用 native，不再提示“全部摘要”后又把同一区域原样保留。确实没有保留内容时才使用全量摘要提示。

append 不重试。请求失败、输出截断、工具调用或缺少 Goal 标题都会转入 native；半截摘要不落盘。标题检查只验证基本结构，无法自动判断检查点是否遗漏关键信息。

native 保留两次尝试：

1. 配置的摘要模型与档位，`--model` / `--effort` 优先，使用 Pi 默认序列化。
2. 当前会话模型与档位，将工具结果、bash 输出和工具调用参数中的长值截到 500 字符再尝试。用户消息和 assistant 正文不截断。

第二次尝试会损失工具细节，成功时 tag 加 `|trimmed`。目前没有按错误类型拆分重试，避免增加多层请求与错误分类；两次都失败则取消压缩。自动压缩同样可能失败，不能描述成“自动路径从不 cancel”。

native 的默认模型和档位仅在源码顶部配置，不在文档重复易变的模型名。effort 词表与模型支持性分别校验：append 按当前模型，native 按最终摘要模型。失败后的 native 尝试再次检查档位，不支持的继承值使用 off。

通过 `ctx.modelRegistry.streamSimple` 在请求时解析鉴权，不预先取 OAuth token 再作为 `apiKey` 转交。扩展调用不经过会话的 provider hooks，因此 append 需要自行回放 payload；native 不回放快照，也没有接入 Pi 的虚拟模型路由和重试设置。

Pi 不自动继承 `fromHook` 压缩条目的文件清单。扩展从上一条 compaction 的 details 合并本次文件操作，使用 Pi 相同的 `<read-files>` / `<modified-files>` 标签。修改过的文件从只读列表中剔除。

## 使用与验证

```text
/compact [-c|--cached | -nc|--not-cached] [-m|--model <provider/id>] [-e|--effort <level>] [focus text]
```

开关从行首连续解析，遇到非开关文本即停止，剩余部分作为 focus。`-nc` 优先于 `-c`。只有手动压缩解析这些开关。

每次压缩的成功或失败信息写入 `~/.pi/agent/compact-cache.log`，超过 64KB 轮转为 `.log.old`。日志包括模式、降级原因、窗口、输出预算、快照间隔与命中率；`outputBudget` 是扩展允许的上限，provider 仍可能进一步收缩。read ratio ≥75% 标记 HIT，≤25% 标记 MISS 并告警，这只是诊断分类，不是成本测算。

统计显示在 widget 中，不写入 summary，下一次 `agent_start` 清除。`session_compact` 中的 notify 可能被后续聊天容器重建清掉，widget 会保留。

在 agent 目录运行：

```bash
COMPACT_CACHE_SELFTEST=1 bun extensions/compact-cache.ts
PI_CACHE_RETENTION=long COMPACT_CACHE_SELFTEST=1 bun extensions/compact-cache.ts
node --test tests/compact-cache-compat.test.mjs
```

自检覆盖参数解析、预算边界、最终输出额度、前缀回放、TTL、摘要标题与工具截断。兼容测试通过本机 Pi 扩展加载器及真实 `prepareCompaction` / `compact()` / 投影函数运行，mock registry 且禁止网络，覆盖 256 Ki / 512 Ki 阈值、128k 模型输出上限、effort 模型差异、编辑后的锚点、边界歧义及长 focus 降级、失败重试、split-turn 用量与 Codex 让出接管。

兼容测试使用本机全局安装路径。真实 OAuth 刷新、provider 最终预算及缓存命中仍需单独实测，mock 测试不提供这些保证。
