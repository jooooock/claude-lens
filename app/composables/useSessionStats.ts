/**
 * useSessionStats — 计算会话级别的聚合统计数据
 *
 * 遍历所有 JSONL 记录，汇总以下指标：
 * - Token 用量（输入/输出/缓存创建/缓存读取）
 * - 缓存命中率
 * - 使用的模型列表
 * - 对话轮数和总耗时
 * - API 错误次数
 * - 工具调用总数
 * - Claude Code 版本号
 *
 * 计算结果用于 SessionStatsBar 组件在顶部展示统计面板。
 */

import type { JsonlRecord, AssistantRecord, UserRecord, SystemRecord } from '~/types/records'
import { isTurnDuration, isApiError } from '~/types/records'
import type { SessionStats } from '~/types/api'

/**
 * 从原始 JSONL 记录数组中计算会话统计。
 *
 * @param records - 从 API 获取的全部记录（响应式引用）
 * @returns { stats } - 计算属性，返回 SessionStats 对象
 */
export function useSessionStats(records: Ref<JsonlRecord[]> | Readonly<Ref<JsonlRecord[]>>) {
  const stats = computed<SessionStats>(() => {
    const recs = records.value

    // 累加器
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCacheCreationTokens = 0
    let totalCacheReadTokens = 0
    let totalDurationMs = 0
    let apiErrorCount = 0
    let totalToolCalls = 0
    let totalAssistantResponses = 0
    let turnCount = 0
    const modelsUsed = new Set<string>()
    let version = ''

    // 单次遍历所有记录，按类型累加各项指标
    for (const r of recs) {
      if (r.type === 'assistant') {
        // === assistant 记录：累加 token 和工具调用 ===
        const ar = r as AssistantRecord
        totalAssistantResponses++
        const usage = ar.message.usage
        totalInputTokens += usage.input_tokens
        totalOutputTokens += usage.output_tokens
        totalCacheCreationTokens += usage.cache_creation_input_tokens
        totalCacheReadTokens += usage.cache_read_input_tokens
        modelsUsed.add(ar.message.model)
        // 从首个带版本号的记录中提取 CLI 版本
        if (!version && ar.version) version = ar.version
        // 统计 content 中 tool_use 类型块的数量
        totalToolCalls += ar.message.content.filter(b => b.type === 'tool_use').length
      } else if (r.type === 'user') {
        // === user 记录：统计对话轮次 ===
        const ur = r as UserRecord
        // 只计算"真正的用户输入"，排除 meta 消息和工具返回消息
        if (!ur.isMeta && ur.toolUseResult === undefined) {
          const content = ur.message.content
          const isToolResultOnly = Array.isArray(content) && content.every(b => b.type === 'tool_result')
          if (!isToolResultOnly) turnCount++
        }
        if (!version && ur.version) version = ur.version
      } else if (r.type === 'system') {
        // === system 记录：统计耗时和 API 错误 ===
        const sr = r as SystemRecord
        if (isTurnDuration(sr)) totalDurationMs += sr.durationMs
        if (isApiError(sr)) apiErrorCount++
      }
    }

    // 计算缓存命中率：cacheRead / (input + cacheCreation + cacheRead)
    const totalCacheTokens = totalCacheCreationTokens + totalCacheReadTokens
    const totalInputWithCache = totalInputTokens + totalCacheTokens
    const cacheHitRate = totalInputWithCache > 0
      ? (totalCacheReadTokens / totalInputWithCache) * 100
      : 0

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCacheCreationTokens,
      totalCacheReadTokens,
      cacheHitRate,
      modelsUsed: Array.from(modelsUsed),
      turnCount,
      totalDurationMs,
      claudeCodeVersion: version,
      totalAssistantResponses,
      apiErrorCount,
      totalToolCalls
    }
  })

  return { stats }
}
