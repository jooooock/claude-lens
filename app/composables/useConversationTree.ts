import type { JsonlRecord, UserRecord, AssistantRecord, SystemRecord, ToolUseContent } from '~/types/records'
import type { ConversationTurn, ConversationFilters } from '~/types/api'

const defaultFilters: ConversationFilters = {
  showProgress: false,
  showSystemEvents: true,
  showSidechains: false,
  showThinking: true
}

export function useConversationTree(
  records: Ref<JsonlRecord[]> | Readonly<Ref<JsonlRecord[]>>,
  filters: Ref<ConversationFilters> = ref(defaultFilters)
) {
  const turns = computed<ConversationTurn[]>(() => {
    const recs = records.value
    const f = filters.value

    // 按类型过滤
    const filtered = recs.filter((r) => {
      if (r.type === 'progress' && !f.showProgress) return false
      if (r.type === 'system' && !f.showSystemEvents) return false
      if ('isSidechain' in r && r.isSidechain && !f.showSidechains) return false
      return true
    })

    // 建立 tool_use_id -> user record（工具返回结果）的映射
    const toolResultMap = new Map<string, UserRecord>()
    for (const r of filtered) {
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

    // 组织为 turn 序列
    const result: ConversationTurn[] = []
    let currentTurn: ConversationTurn | null = null
    let turnCounter = 0

    for (const r of filtered) {
      if (r.type === 'user') {
        const ur = r as UserRecord
        // 跳过 meta 消息和工具返回消息
        if (ur.isMeta) continue
        if (ur.toolUseResult !== undefined) continue
        if (Array.isArray(ur.message.content) && ur.message.content.every(b => b.type === 'tool_result')) continue

        // 新的用户消息开启一个新 turn
        if (currentTurn) {
          result.push(currentTurn)
        }
        currentTurn = {
          key: ur.uuid,
          userMessage: ur,
          assistantBlocks: [],
          systemEvents: []
        }
      } else if (r.type === 'assistant') {
        const ar = r as AssistantRecord
        if (!currentTurn) {
          currentTurn = { key: `auto-${turnCounter++}`, assistantBlocks: [], systemEvents: [] }
        }

        for (const block of ar.message.content) {
          if (block.type === 'text') {
            if (block.text.trim()) {
              currentTurn.assistantBlocks.push({ kind: 'text', text: block.text })
            }
          } else if (block.type === 'thinking') {
            if (f.showThinking) {
              currentTurn.assistantBlocks.push({ kind: 'thinking', thinking: block.thinking })
            }
          } else if (block.type === 'tool_use') {
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
          currentTurn = { key: `auto-${turnCounter++}`, assistantBlocks: [], systemEvents: [] }
        }
        currentTurn.systemEvents.push(sr)
      }
    }

    if (currentTurn) {
      result.push(currentTurn)
    }

    return result
  })

  return { turns }
}
