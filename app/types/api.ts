import type { JsonlRecord } from './records'

export type { ProjectInfo, SessionInfo } from '~~/shared/types/project'

export interface PaginatedRecordsResponse {
  records: JsonlRecord[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

// UI 用的对话组织类型

export interface ConversationTurn {
  /** turn 的唯一标识（来自 userMessage.uuid 或自增序号） */
  key: string
  /** 用户发送的消息 */
  userMessage?: import('./records').UserRecord
  /** assistant 的响应内容块 */
  assistantBlocks: AssistantBlock[]
  /** 系统事件 */
  systemEvents: import('./records').SystemRecord[]
}

export type AssistantBlock
  = | { kind: 'text', text: string }
    | { kind: 'thinking', thinking: string }
    | { kind: 'tool_call', call: import('./records').ToolUseContent, result?: import('./records').UserRecord }

export interface ConversationFilters {
  showProgress: boolean
  showSystemEvents: boolean
  showSidechains: boolean
  showThinking: boolean
}
