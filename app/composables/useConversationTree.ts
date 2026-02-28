/**
 * useConversationTree — 将扁平 JSONL 记录组织为对话轮次（Turn）树
 *
 * 核心职责：
 * 1. 按过滤条件筛选记录（系统事件、旁支链路等）
 * 2. 建立 tool_use_id → UserRecord 的映射，用于配对工具调用与其返回结果
 * 3. 遍历记录序列，以「用户消息」为边界切分为多个 ConversationTurn
 * 4. 在每个 turn 中聚合 assistant 元数据（模型、token、耗时等）
 *
 * 数据流：
 *   JSONL records → useConversationTree → ConversationTurn[] → ConversationView 组件
 */

import type { JsonlRecord, UserRecord, AssistantRecord, SystemRecord, ProgressRecord, ToolUseContent, TokenUsage } from '~/types/records'
import { isTurnDuration } from '~/types/records'
import type { ConversationTurn, ConversationFilters } from '~/types/api'

/** 默认过滤配置：隐藏进度事件和旁支链路，显示系统事件和思考 */
const defaultFilters: ConversationFilters = {
  showProgress: false,
  showSystemEvents: true,
  showSidechains: false,
  showThinking: true
}

/**
 * 累加两个 TokenUsage 对象。
 * 一个 turn 中可能有多个 assistant 记录（工具调用循环），需要合并它们的 token 用量。
 * 仅累加四个核心数值字段，其他元数据字段取第一个对象的值。
 */
function mergeUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    ...a,
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens
  }
}

/**
 * 将扁平的 JSONL 记录数组转换为结构化的 ConversationTurn 数组。
 *
 * @param records - 从 API 获取的原始记录列表（响应式引用）
 * @param filters - 过滤选项（响应式引用），控制哪些类型的记录参与构建
 * @returns { turns } - 计算属性，返回 ConversationTurn 数组
 */
export function useConversationTree(
  records: Ref<JsonlRecord[]> | Readonly<Ref<JsonlRecord[]>>,
  filters: Ref<ConversationFilters> = ref(defaultFilters)
) {
  const turns = computed<ConversationTurn[]>(() => {
    const recs = records.value
    const f = filters.value

    // ====== 第一步：按类型过滤记录 ======
    // 注意：progress 记录始终保留（不在此处过滤），由 ProgressSection 组件自行折叠控制
    const filtered = recs.filter((r) => {
      if (r.type === 'system' && !f.showSystemEvents) return false
      if ('isSidechain' in r && r.isSidechain && !f.showSidechains) return false
      return true
    })

    // ====== 第 1.5 步：按时间戳稳定排序 ======
    // 手动执行 /compact 时，CLI 先写入 compact_boundary + isCompactSummary 记录，
    // 再写入 /compact 命令和 Compacted 输出记录——但后者的时间戳更早（用户输入时刻）。
    // 排序确保记录按逻辑时间顺序处理，使 /compact 命令出现在 compact_boundary 之前。
    // 使用稳定排序，相同时间戳的记录保持原始 JSONL 顺序不变。
    const sorted = [...filtered].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })

    // ====== 第二步：建立工具返回结果的映射 ======
    // 遍历所有 user 记录，找出包含 tool_result 的记录，以 tool_use_id 为 key 建立映射。
    // 后续处理 assistant 记录中的 tool_use 块时，可以通过 ID 查找对应的返回结果。
    const toolResultMap = new Map<string, UserRecord>()
    for (const r of sorted) {
      if (r.type !== 'user') continue
      const ur = r as UserRecord
      if (!ur.toolUseResult) continue
      const content = ur.message.content
      if (!Array.isArray(content)) continue
      for (const block of content) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResultMap.set(block.tool_use_id, ur)
        }
      }
    }

    // ====== 第三步：创建 Turn 序列 ======

    /** 创建空的 turn 对象，key 默认使用自增序号 */
    let turnCounter = 0
    function createTurn(key?: string): ConversationTurn {
      return {
        key: key || `auto-${turnCounter++}`,
        assistantBlocks: [],
        preSystemEvents: [],
        postSystemEvents: [],
        progressEvents: []
      }
    }

    const result: ConversationTurn[] = []
    let currentTurn: ConversationTurn | null = null

    // ====== 第四步：遍历记录，构建 Turn 树 ======
    for (const r of sorted) {
      if (r.type === 'user') {
        const ur = r as UserRecord
        // 跳过不应展示的用户消息：
        // - isMeta: 系统注入的元数据
        // - isCompactSummary: 上下文压缩后的摘要 → 不作为独立消息展示，
        //   而是提取其文本内容附加到当前 turn 的 compactSummary 字段，
        //   供 CompactBoundary 组件在展开时显示
        // - toolUseResult: 工具返回结果（已通过 toolResultMap 关联到工具调用）
        // - 全部是 tool_result 的内容块：纯工具返回消息
        if (ur.isMeta) continue
        if (ur.isCompactSummary) {
          // 将摘要文本附加到当前 turn（其 preSystemEvents 中应已有 compact_boundary）
          if (currentTurn) {
            const content = ur.message.content
            if (typeof content === 'string') {
              currentTurn.compactSummary = content
            } else if (Array.isArray(content)) {
              const textParts = content.filter(b => b.type === 'text')
              if (textParts.length) {
                currentTurn.compactSummary = textParts.map(b => ('text' in b ? b.text : '')).join('\n')
              }
            }
          }
          continue
        }
        if (ur.toolUseResult !== undefined) continue
        if (Array.isArray(ur.message.content) && ur.message.content.every(b => b.type === 'tool_result')) continue

        // 新的用户消息开启一个新 turn
        if (currentTurn) {
          result.push(currentTurn)
        }
        currentTurn = createTurn(ur.uuid)
        currentTurn.userMessage = ur
      } else if (r.type === 'assistant') {
        const ar = r as AssistantRecord
        if (!currentTurn) {
          currentTurn = createTurn()
        }

        // 填充 assistantMeta：
        // - 第一条 assistant 记录：初始化元数据（模型、token、stop reason 等）
        // - 后续 assistant 记录：累加 token 用量，更新 stop reason 为最新值
        if (!currentTurn.assistantMeta) {
          currentTurn.assistantMeta = {
            model: ar.message.model,
            usage: { ...ar.message.usage },
            stopReason: ar.message.stop_reason,
            stopSequence: ar.message.stop_sequence,
            requestId: ar.requestId,
            isApiErrorMessage: ar.isApiErrorMessage,
            timestamp: ar.timestamp
          }
        } else {
          currentTurn.assistantMeta.usage = mergeUsage(currentTurn.assistantMeta.usage, ar.message.usage)
          currentTurn.assistantMeta.stopReason = ar.message.stop_reason
        }

        // 解析 assistant 消息中的内容块，按类型分发到 assistantBlocks
        for (const block of ar.message.content) {
          if (block.type === 'text') {
            // 跳过空文本
            if (block.text.trim()) {
              currentTurn.assistantBlocks.push({ kind: 'text', text: block.text })
            }
          } else if (block.type === 'thinking') {
            // 受 showThinking 过滤器控制
            if (f.showThinking) {
              currentTurn.assistantBlocks.push({ kind: 'thinking', thinking: block.thinking })
            }
          } else if (block.type === 'tool_use') {
            // 工具调用：从 toolResultMap 中查找配对的返回结果
            const toolCall = block as ToolUseContent
            const toolResult = toolResultMap.get(toolCall.id)
            currentTurn.assistantBlocks.push({
              kind: 'tool_call',
              call: toolCall,
              result: toolResult
            })
          }
        }
      } else if (r.type === 'system') {
        const sr = r as SystemRecord
        if (!currentTurn) {
          currentTurn = createTurn()
        }

        // 按 subtype 分类：
        // compact_boundary 是上下文压缩分隔符，在时间线上出现在上一个 turn 结束之后，
        // 应作为独立 turn 渲染（而非附加到上一个 turn），这样分隔线显示在正确的位置——
        // 上一轮的 Hook 摘要之后、下一条用户消息之前。
        // 其余（stop_hook_summary、api_error、local_command、turn_duration）
        // 都是响应期间或之后的事件，显示在 assistant 块之后
        if ('subtype' in sr && sr.subtype === 'compact_boundary') {
          if (currentTurn) {
            result.push(currentTurn)
          }
          currentTurn = createTurn()
          currentTurn.preSystemEvents.push(sr)
        } else {
          currentTurn.postSystemEvents.push(sr)
        }

        // 特殊处理：将 turn_duration 记录的耗时关联到 assistantMeta
        if (isTurnDuration(sr) && currentTurn.assistantMeta) {
          currentTurn.assistantMeta.durationMs = sr.durationMs
        }
      } else if (r.type === 'progress') {
        // 进度记录始终收集（不受 showProgress 过滤），显示控制交由 ConversationView
        const pr = r as ProgressRecord
        if (!currentTurn) {
          currentTurn = createTurn()
        }
        currentTurn.progressEvents.push(pr)
      }
    }

    // 别忘了推入最后一个 turn
    if (currentTurn) {
      result.push(currentTurn)
    }

    return result
  })

  return { turns }
}
