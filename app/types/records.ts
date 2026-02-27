// ===== 公共基础类型 =====

export interface BaseRecord {
  type: string
  uuid: string
  timestamp: string
  sessionId?: string
}

export interface ConversationRecord extends BaseRecord {
  parentUuid: string | null
  logicalParentUuid?: string | null
  isSidechain: boolean
  userType: string
  cwd: string
  version: string
  gitBranch: string
  slug?: string
}

// ===== 1. queue-operation =====

export interface QueueOperationRecord extends BaseRecord {
  type: 'queue-operation'
  operation: 'enqueue' | 'dequeue' | 'remove'
  content?: string
}

// ===== 2. user =====

export interface UserTextContent {
  type: 'text'
  text: string
}

export interface UserToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string | Array<{ type: 'text', text: string } | { type: 'image', source: ImageSource }>
}

export interface ImageSource {
  type: 'base64'
  media_type: string
  data: string
}

export interface UserImageContent {
  type: 'image'
  source: ImageSource
}

export type UserContentBlock = UserTextContent | UserToolResultContent | UserImageContent

export type UserMessageContent = string | UserContentBlock[]

// toolUseResult 类型

export interface ReadToolResult {
  file: string
  type: string
}

export interface EditToolResult {
  filePath: string
  oldString: string
  newString: string
  originalFile?: string
  replaceAll?: boolean
  structuredPatch?: string
  userModified?: boolean
}

export interface WriteToolResult {
  content: string
  filePath: string
  originalFile?: string
  structuredPatch?: string
  type: string
}

export interface BashToolResult {
  interrupted?: boolean
  isImage?: boolean
  noOutputExpected?: boolean
  stderr: string
  stdout: string
}

export interface GrepToolResult {
  content: string
  filenames: string[]
  mode: string
  numFiles: number
  numLines: number
  appliedLimit?: number
}

export interface GlobToolResult {
  durationMs: number
  filenames: string[]
  numFiles: number
  truncated: boolean
}

export interface TodoWriteToolResult {
  newTodos: unknown[]
  oldTodos: unknown[]
}

export interface TaskToolResult {
  agentId: string
  content: string
  prompt: string
  status: string
  totalDurationMs: number
  totalTokens: number
  totalToolUseCount: number
  usage: Record<string, number>
}

export interface AskUserQuestionResult {
  answers: Record<string, string>
  questions: unknown[]
}

export interface ExitPlanModeResult {
  filePath: string
  isAgent: boolean
  plan: string
}

export interface McpToolResultItem {
  type: string
  text: string
}

export type ToolUseResult
  = | ReadToolResult
    | EditToolResult
    | WriteToolResult
    | BashToolResult
    | GrepToolResult
    | GlobToolResult
    | TodoWriteToolResult
    | TaskToolResult
    | AskUserQuestionResult
    | ExitPlanModeResult
    | McpToolResultItem[]
    | string

export interface UserRecord extends ConversationRecord {
  type: 'user'
  message: {
    role: 'user'
    content: UserMessageContent
  }
  toolUseResult?: ToolUseResult
  sourceToolAssistantUUID?: string
  todos?: unknown[]
  permissionMode?: string
  isMeta?: boolean
  isCompactSummary?: boolean
  isVisibleInTranscriptOnly?: boolean
}

// ===== 3. assistant =====

export interface ThinkingContent {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface TextContent {
  type: 'text'
  text: string
}

export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  caller?: { type: string }
}

export type AssistantContentBlock = ThinkingContent | TextContent | ToolUseContent

export interface TokenUsage {
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  cache_creation?: {
    ephemeral_5m_input_tokens: number
    ephemeral_1h_input_tokens: number
  }
  output_tokens: number
  service_tier: string
  inference_geo: string
}

export interface AssistantRecord extends ConversationRecord {
  type: 'assistant'
  message: {
    model: string
    id: string
    type: 'message'
    role: 'assistant'
    content: AssistantContentBlock[]
    stop_reason: string | null
    stop_sequence: string | null
    usage: TokenUsage
  }
  requestId: string
  isApiErrorMessage?: boolean
}

// ===== 4. progress =====

export interface ProgressRecord extends ConversationRecord {
  type: 'progress'
  data: {
    type: 'hook_progress' | 'agent_progress' | 'bash_progress' | 'mcp_progress'
    [key: string]: unknown
  }
  toolUseID?: string
  parentToolUseID?: string
}

// ===== 5. system =====

export interface StopHookSummaryRecord extends ConversationRecord {
  type: 'system'
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: Array<{ command: string }>
  hookErrors: unknown[]
  preventedContinuation: boolean
  stopReason: string
  hasOutput: boolean
  level: string
  toolUseID?: string
}

export interface CompactBoundaryRecord extends ConversationRecord {
  type: 'system'
  subtype: 'compact_boundary'
  content: string
  isMeta?: boolean
  level: string
  compactMetadata: {
    trigger: 'auto' | 'manual'
    preTokens: number
  }
}

export type SystemRecord = StopHookSummaryRecord | CompactBoundaryRecord

// ===== 6. file-history-snapshot =====

export interface FileHistorySnapshotRecord extends BaseRecord {
  type: 'file-history-snapshot'
  messageId: string
  snapshot: {
    messageId: string
    trackedFileBackups: Record<string, {
      backupFileName: string | null
      version: number
      backupTime: string
    }>
    timestamp: string
  }
  isSnapshotUpdate: boolean
}

// ===== 类型守卫 =====

export function isBashResult(r: ToolUseResult): r is BashToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'stdout' in r
}

export function isReadResult(r: ToolUseResult): r is ReadToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'file' in r && 'type' in r && !('stdout' in r)
}

export function isGrepResult(r: ToolUseResult): r is GrepToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'content' in r && 'numFiles' in r
}

export function isGlobResult(r: ToolUseResult): r is GlobToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'filenames' in r && 'numFiles' in r && !('content' in r)
}

export function isMcpResult(r: ToolUseResult): r is McpToolResultItem[] {
  return Array.isArray(r)
}

// ===== 联合类型 =====

export type JsonlRecord
  = | QueueOperationRecord
    | UserRecord
    | AssistantRecord
    | ProgressRecord
    | SystemRecord
    | FileHistorySnapshotRecord
