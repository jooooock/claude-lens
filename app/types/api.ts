/**
 * api.ts — API 响应类型与 UI 数据模型
 *
 * 本文件定义了两层类型：
 * 1. API 响应类型（SessionRecordsResponse）— 服务端返回的原始数据结构
 * 2. UI 数据模型（ConversationTurn, AssistantMeta, SessionStats）—
 *    由 composable（useConversationTree, useSessionStats）将扁平的 JSONL 记录
 *    转换为组件可直接消费的结构化数据
 */

import type { JsonlRecord, TokenUsage, ProgressRecord } from './records'

// 从 shared 目录导出项目/会话信息类型，供侧边栏组件使用
export type { ProjectInfo, SessionInfo } from '~~/shared/types/project'

// =====================================================================
// API 响应类型
// =====================================================================

/**
 * GET /api/sessions/:project/:sessionId 的响应体。
 * - records: 经过过滤后的 JSONL 记录数组
 * - total: 过滤后的记录总数
 */
export interface SessionRecordsResponse {
  records: JsonlRecord[]
  total: number
}

// =====================================================================
// UI 数据模型
// =====================================================================

/**
 * Assistant 回复的元数据，从一个 turn 内所有 assistant 记录中聚合得到。
 *
 * 一个 turn 中可能有多条 assistant 记录（工具调用循环中），所以：
 * - model: 取第一条记录的模型名
 * - usage: 累加所有记录的 token 用量（通过 mergeUsage）
 * - stopReason: 取最后一条记录的停止原因
 * - durationMs: 来自 system.turn_duration 记录（可选）
 */
export interface AssistantMeta {
  /** 模型标识（如 claude-sonnet-4-20250514） */
  model: string
  /** 累加后的 token 用量 */
  usage: TokenUsage
  /** 最终停止原因：end_turn / tool_use / max_tokens / stop_sequence */
  stopReason: string | null
  /** 触发停止的序列内容 */
  stopSequence: string | null
  /** API 请求 ID */
  requestId: string
  /** 是否为 API 错误恢复消息 */
  isApiErrorMessage?: boolean
  /** 首条 assistant 记录的时间戳 */
  timestamp: string
  /** 来自 turn_duration 系统记录，表示整个 turn 的耗时（毫秒） */
  durationMs?: number
}

/**
 * 对话轮次（Turn）—— UI 层的核心数据结构。
 *
 * 将 JSONL 中的扁平记录序列组织为以「用户消息」为起点的轮次：
 * 每个 turn 包含一条用户消息 + 若干 assistant 响应块 + 系统事件 + 进度事件。
 *
 * 生成逻辑见 useConversationTree composable。
 */
export interface ConversationTurn {
  /** turn 的唯一标识（来自 userMessage.uuid 或自增序号） */
  key: string
  /** 用户发送的消息（可选，某些 turn 可能只有 assistant 响应） */
  userMessage?: import('./records').UserRecord
  /** assistant 的响应内容块（文本 / 思考 / 工具调用） */
  assistantBlocks: AssistantBlock[]
  /**
   * 前置系统事件（显示在用户消息之前）：compact_boundary 上下文压缩分隔线。
   * compact_boundary 会触发创建独立 turn（无 userMessage），确保分隔线
   * 渲染在上一轮结束之后、下一条用户消息之前的正确位置。
   */
  preSystemEvents: import('./records').SystemRecord[]
  /**
   * 后置系统事件（显示在 assistant 响应之后）：stop_hook_summary、api_error、local_command 等。
   * 这些事件在时间线上发生在 assistant 响应期间或之后，放在 assistant 块后更符合逻辑。
   */
  postSystemEvents: import('./records').SystemRecord[]
  /** assistant 回复的元数据（模型、token 用量、stop reason 等） */
  assistantMeta?: AssistantMeta
  /** 进度事件（Hook / Bash / MCP / Agent 的中间状态通知） */
  progressEvents: ProgressRecord[]
  /** 上下文压缩后的摘要文本（来自 isCompactSummary 用户记录，与同一独立 turn 中的 compact_boundary 配对） */
  compactSummary?: string
}

/**
 * Assistant 内容块的联合类型，用于模板中的条件渲染。
 * - text: 文本回复 → MessageBubble 组件
 * - thinking: 思考过程 → ThinkingBlock 组件
 * - tool_call: 工具调用 + 结果 → ToolUseBlock 组件
 */
export type AssistantBlock
  = | { kind: 'text', text: string }
    | { kind: 'thinking', thinking: string }
    | { kind: 'tool_call', call: import('./records').ToolUseContent, result?: import('./records').UserRecord }

/**
 * 对话过滤器选项，控制 useConversationTree 和 ConversationView 的显示行为。
 */
export interface ConversationFilters {
  /** 是否显示进度事件（ProgressSection 组件） */
  showProgress: boolean
  /** 是否显示系统事件（API 错误、Hook 摘要等） */
  showSystemEvents: boolean
  /** 是否显示子代理的旁支链路消息 */
  showSidechains: boolean
  /** 是否显示 extended thinking 内容 */
  showThinking: boolean
}

/**
 * 会话级别的聚合统计数据。
 * 由 useSessionStats composable 从全部记录中计算得出，用于 SessionStatsBar 组件展示。
 */
export interface SessionStats {
  /** 输入 token 总数（不含缓存） */
  totalInputTokens: number
  /** 输出 token 总数 */
  totalOutputTokens: number
  /** 缓存创建 token 总数 */
  totalCacheCreationTokens: number
  /** 缓存读取 token 总数 */
  totalCacheReadTokens: number
  /** 缓存命中率百分比：cacheRead / (input + cacheCreation + cacheRead) × 100 */
  cacheHitRate: number
  /** 去重的模型列表（一个会话可能切换过模型） */
  modelsUsed: string[]
  /** 用户 turn 数（不含工具返回和 meta 消息） */
  turnCount: number
  /** 所有 turn_duration 之和（毫秒） */
  totalDurationMs: number
  /** Claude Code 版本号（取首个有效值） */
  claudeCodeVersion: string
  /** assistant 记录总数 */
  totalAssistantResponses: number
  /** API 错误次数 */
  apiErrorCount: number
  /** 工具调用总数 */
  totalToolCalls: number
}
