/**
 * records.ts — JSONL 记录类型定义
 *
 * Claude Code 在 ~/.claude/projects/ 目录下为每个会话生成一个 JSONL 文件，
 * 每一行是一条 JSON 记录。本文件定义了所有 6 种顶层记录类型的 TypeScript 接口：
 *
 * 1. queue-operation — 消息队列操作（入队/出队/移除）
 * 2. user           — 用户消息（文本、图片、工具返回结果）
 * 3. assistant       — Claude 的回复（文本、思考、工具调用）
 * 4. progress        — 长时间运行任务的进度通知（Hook/Bash/MCP/Agent）
 * 5. system          — 系统事件（上下文压缩、Hook 摘要、API 错误、耗时等）
 * 6. file-history-snapshot — 文件历史快照（用于回滚）
 *
 * 此外还提供了工具结果类型守卫（isBashResult 等）和系统记录子类型守卫（isApiError 等），
 * 用于在组件和 composable 中做类型安全的条件分发。
 */

// =====================================================================
// 公共基础类型
// =====================================================================

/**
 * 所有 JSONL 记录的最小公共字段。
 * - type: 记录类型标识符
 * - uuid: 每条记录的唯一 ID（queue-operation 类型可能缺失）
 * - timestamp: ISO 8601 时间戳
 * - sessionId: 所属会话 ID（可选，部分旧格式没有）
 */
export interface BaseRecord {
  type: string
  /** 记录唯一 ID（queue-operation 类型可能缺失此字段） */
  uuid?: string
  timestamp: string
  sessionId?: string
}

/**
 * 带会话上下文的记录基类，user / assistant / progress / system 均继承自此接口。
 * 除了 BaseRecord 的字段外，还包含丰富的上下文元数据：
 * - parentUuid / logicalParentUuid: 形成对话的树形结构（parent 链）
 * - isSidechain: 是否属于子代理（subagent）的旁支链路
 * - cwd: 执行时的工作目录
 * - version: Claude Code CLI 版本号
 * - gitBranch: 当前 Git 分支名
 * - slug: 会话的可读标识（如 "add-dark-mode"）
 */
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

// =====================================================================
// 1. queue-operation — 消息队列操作
// =====================================================================

/**
 * 消息队列操作记录。
 * Claude Code 使用内部队列管理用户输入，此记录追踪队列的入队/出队/移除操作。
 */
export interface QueueOperationRecord extends BaseRecord {
  type: 'queue-operation'
  /** 操作类型：enqueue(入队) / dequeue(出队) / remove(移除) */
  operation: 'enqueue' | 'dequeue' | 'remove'
  /** 队列操作涉及的内容 */
  content?: string
}

// =====================================================================
// 2. user — 用户消息
// =====================================================================

/** 纯文本内容块 */
export interface UserTextContent {
  type: 'text'
  text: string
}

/**
 * 工具返回结果内容块。
 * 当 Claude 调用工具后，工具的执行结果以 tool_result 类型包装在用户消息中返回。
 * - tool_use_id: 关联到 assistant 消息中对应 tool_use 块的 ID
 * - content: 可以是纯字符串，也可以是文本+图片的混合数组
 */
export interface UserToolResultContent {
  type: 'tool_result'
  tool_use_id: string
  content: string | Array<{ type: 'text', text: string } | { type: 'image', source: ImageSource }>
}

/** Base64 编码的图片数据 */
export interface ImageSource {
  type: 'base64'
  media_type: string
  data: string
}

/** 用户上传的图片内容块 */
export interface UserImageContent {
  type: 'image'
  source: ImageSource
}

/** 用户消息中的内容块联合类型 */
export type UserContentBlock = UserTextContent | UserToolResultContent | UserImageContent

/**
 * 用户消息内容：可以是简单字符串，也可以是多个内容块组成的数组。
 * 当用户发送纯文本时为 string，当包含图片或工具结果时为数组。
 */
export type UserMessageContent = string | UserContentBlock[]

// ----- 工具执行结果类型（toolUseResult 字段） -----

/** Read 工具的执行结果：读取到的文件内容 */
export interface ReadToolResult {
  file: string
  type: string
}

/**
 * Edit 工具的执行结果：文件编辑操作。
 * - oldString / newString: 替换前后的文本
 * - structuredPatch: unified diff 格式的差异内容（可选）
 * - replaceAll: 是否全量替换所有匹配
 */
export interface EditToolResult {
  filePath: string
  oldString: string
  newString: string
  originalFile?: string
  replaceAll?: boolean
  structuredPatch?: string
  userModified?: boolean
}

/**
 * Write 工具的执行结果：文件写入操作。
 * - content: 写入的完整内容
 * - structuredPatch: unified diff 格式的差异（新建文件时无差异）
 */
export interface WriteToolResult {
  content: string
  filePath: string
  originalFile?: string
  structuredPatch?: string
  type: string
}

/**
 * Bash 工具的执行结果：Shell 命令的输出。
 * - stdout / stderr: 标准输出和标准错误
 * - is_error: 命令是否以非零状态码退出
 * - interrupted: 命令是否被用户中断
 */
export interface BashToolResult {
  interrupted?: boolean
  is_error?: boolean
  isImage?: boolean
  noOutputExpected?: boolean
  stderr: string
  stdout: string
}

/** Grep 工具的执行结果：文本搜索结果 */
export interface GrepToolResult {
  content: string
  filenames: string[]
  mode: string
  numFiles: number
  numLines: number
  appliedLimit?: number
}

/** Glob 工具的执行结果：文件名模式匹配结果 */
export interface GlobToolResult {
  durationMs: number
  filenames: string[]
  numFiles: number
  truncated: boolean
}

/**
 * 待办事项条目。
 * TodoWrite 工具用于管理会话中的任务清单，每个 todo 项包含内容和状态。
 */
export interface TodoItem {
  /** 任务描述内容 */
  content: string
  /** 任务状态：pending(待处理) / in_progress(进行中) / completed(已完成) */
  status: 'pending' | 'in_progress' | 'completed'
  /** 任务正在执行时的描述形式（如 "正在运行测试"） */
  activeForm?: string
}

/** TodoWrite 工具的执行结果：待办事项更新（包含更新前后的完整列表） */
export interface TodoWriteToolResult {
  newTodos: TodoItem[]
  oldTodos: TodoItem[]
}

/**
 * Task 工具的执行结果：子代理（subagent）任务。
 * 包含代理运行的完整摘要：耗时、token 消耗、工具调用次数等。
 */
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

/** AskUserQuestion 工具的执行结果：用户交互式问答的回答 */
export interface AskUserQuestionResult {
  answers: Record<string, string>
  questions: unknown[]
}

/** ExitPlanMode 工具的执行结果：退出计划模式时的计划内容 */
export interface ExitPlanModeResult {
  filePath: string
  isAgent: boolean
  plan: string
}

/** MCP（Model Context Protocol）工具调用的返回项 */
export interface McpToolResultItem {
  type: string
  text: string
}

/**
 * 工具执行结果的联合类型。
 * 每种工具返回不同结构的数据，通过类型守卫函数（如 isBashResult）区分。
 * 注意：MCP 结果是数组形式，最简单的结果可能只是一个字符串。
 */
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

/**
 * 用户消息记录。
 *
 * 用户消息有多种形态：
 * - 普通用户输入：message.content 为文本或文本+图片
 * - 工具返回消息：toolUseResult 不为空，message.content 为 tool_result 数组
 * - 元数据消息：isMeta=true，通常是系统注入的上下文信息
 * - 压缩摘要：isCompactSummary=true，上下文压缩后生成的摘要
 *
 * 组件渲染时需要跳过 isMeta 和 toolUseResult 消息，只展示真正的用户输入。
 */
export interface UserRecord extends ConversationRecord {
  type: 'user'
  message: {
    role: 'user'
    content: UserMessageContent
  }
  /** 工具执行结果（存在时表示此消息是工具返回，不是用户手动输入） */
  toolUseResult?: ToolUseResult
  /** 关联的 assistant 消息 UUID（当此消息是工具返回时） */
  sourceToolAssistantUUID?: string
  /** 当前的待办事项列表快照 */
  todos?: unknown[]
  /** 权限模式 */
  permissionMode?: string
  /** 是否为系统注入的元数据消息（不应展示给用户） */
  isMeta?: boolean
  /** 是否为上下文压缩后的摘要消息 */
  isCompactSummary?: boolean
  /** 仅在转录视图中可见 */
  isVisibleInTranscriptOnly?: boolean
}

// =====================================================================
// 3. assistant — Claude 的回复
// =====================================================================

/** 思考过程内容块（extended thinking 功能产生） */
export interface ThinkingContent {
  type: 'thinking'
  thinking: string
  /** 思考内容的签名（用于验证） */
  signature?: string
}

/** 文本回复内容块 */
export interface TextContent {
  type: 'text'
  text: string
}

/**
 * 工具调用内容块。
 * - id: 此次工具调用的唯一 ID（用于与后续的 tool_result 配对）
 * - name: 工具名称（如 Read, Edit, Bash, Task 等）
 * - input: 工具的输入参数（各工具参数不同）
 * - caller: 调用来源信息
 */
export interface ToolUseContent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  caller?: { type: string }
}

/** Assistant 消息中的内容块联合类型 */
export type AssistantContentBlock = ThinkingContent | TextContent | ToolUseContent

/**
 * API 调用的 Token 用量统计。
 *
 * Claude API 使用分层的 token 计费：
 * - input_tokens: 不含缓存的输入 token 数
 * - cache_creation_input_tokens: 首次创建 prompt 缓存消耗的 token
 * - cache_read_input_tokens: 命中 prompt 缓存读取的 token（不额外计费）
 * - output_tokens: 模型生成的输出 token
 * - server_tool_use: 服务端工具使用情况（如 web_search）
 */
export interface TokenUsage {
  input_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  /** 缓存创建详情（临时 5 分钟缓存 + 1 小时缓存） */
  cache_creation?: {
    ephemeral_5m_input_tokens: number
    ephemeral_1h_input_tokens: number
  }
  output_tokens: number
  /** API 服务层级 */
  service_tier: string | null
  /** 推理地理区域 */
  inference_geo: string | null
  /** 服务端工具使用统计（web_search / web_fetch 次数） */
  server_tool_use?: {
    web_search_requests: number
    web_fetch_requests: number
  }
  /** 迭代次数（某些场景下 API 内部的多轮迭代） */
  iterations?: number | null
  /** 推理速度信息 */
  speed?: unknown
}

/**
 * Assistant 消息记录。
 *
 * 一个 turn 中可能包含多条 assistant 记录（Claude 在多步工具调用中会产生多个响应），
 * 每条记录包含完整的 API 响应信息：模型名、token 用量、停止原因等。
 *
 * 注意：message.content 是数组，可以混合包含文本、思考和工具调用三种块。
 */
export interface AssistantRecord extends ConversationRecord {
  type: 'assistant'
  message: {
    /** 使用的模型标识（如 claude-sonnet-4-20250514） */
    model: string
    /** API 响应 ID */
    id: string
    type: 'message'
    role: 'assistant'
    /** 内容块数组：可包含 text、thinking、tool_use */
    content: AssistantContentBlock[]
    /** 停止原因：end_turn(正常结束) / tool_use(需要调用工具) / max_tokens(达到上限) */
    stop_reason: string | null
    /** 停止序列（如果是因为特定序列而停止） */
    stop_sequence: string | null
    /** Token 用量统计 */
    usage: TokenUsage
  }
  /** API 请求 ID（用于追踪和调试） */
  requestId: string
  /** 是否为 API 错误后的恢复消息 */
  isApiErrorMessage?: boolean
}

// =====================================================================
// 4. progress — 进度通知
// =====================================================================

/**
 * Hook 进度数据：生命周期钩子正在执行。
 * hookEvent 标识触发的事件（如 PreToolUse, PostToolUse, Stop 等）。
 */
export interface HookProgressData {
  type: 'hook_progress'
  hookEvent: string
  hookName: string
  command: string
}

/**
 * Agent 进度数据：子代理（Task 工具启动的 subagent）正在运行。
 */
export interface AgentProgressData {
  type: 'agent_progress'
  message?: unknown
  agentId?: string
  prompt?: string
}

/**
 * Bash 进度数据：长时间运行的 Shell 命令的中间输出。
 * 包含已运行时间、输出行数/字节数等，用于 UI 展示命令执行进度。
 */
export interface BashProgressData {
  type: 'bash_progress'
  output: string
  fullOutput?: string
  elapsedTimeSeconds?: number
  totalLines?: number
  totalBytes?: number
  taskId?: string
  timeoutMs?: number
}

/**
 * MCP 进度数据：Model Context Protocol 服务器的工具调用状态。
 * 包含服务器名、工具名和当前状态。
 */
export interface McpProgressData {
  type: 'mcp_progress'
  status: string
  serverName: string
  toolName: string
}

/** 进度数据联合类型，通过 data.type 字段区分 */
export type ProgressData = HookProgressData | AgentProgressData | BashProgressData | McpProgressData

/**
 * 进度记录。
 * 用于报告长时间运行操作的中间状态，如 Bash 命令执行中的输出、
 * MCP 工具调用的连接状态、子代理的运行状态等。
 *
 * - data: 根据 type 不同包含不同结构的进度信息
 * - toolUseID: 关联的工具调用 ID
 * - parentToolUseID: 父级工具调用 ID（嵌套工具场景）
 */
export interface ProgressRecord extends ConversationRecord {
  type: 'progress'
  data: ProgressData
  toolUseID?: string
  parentToolUseID?: string
}

// =====================================================================
// 5. system — 系统事件
// =====================================================================

/**
 * Stop Hook 摘要记录：会话结束时所有 Stop Hook 的执行汇总。
 * - hookCount: 执行的 hook 数量
 * - hookInfos: 每个 hook 的命令信息
 * - hookErrors: 执行过程中的错误列表
 * - preventedContinuation: 是否有 hook 阻止了会话继续
 */
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

/**
 * 上下文压缩边界记录：标记自动/手动上下文压缩发生的位置。
 * - content: 压缩后的摘要文本
 * - compactMetadata.trigger: 触发方式（auto 自动 / manual 手动）
 * - compactMetadata.preTokens: 压缩前的 token 数量
 */
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

/**
 * Turn 耗时记录：记录一个完整 turn（从用户输入到 assistant 回复完成）的总耗时。
 * 在 UI 中此记录不单独渲染，而是关联到 AssistantMetaBar 中显示。
 */
export interface TurnDurationRecord extends ConversationRecord {
  type: 'system'
  subtype: 'turn_duration'
  /** 耗时（毫秒） */
  durationMs: number
  isMeta?: boolean
  level?: string
}

/**
 * API 错误记录：Claude API 调用失败时的错误信息和重试状态。
 * - error: 原始 HTTP 错误对象（状态码、响应头、错误消息）
 * - retryInMs: 下次重试的等待时间
 * - retryAttempt / maxRetries: 当前重试次数 / 最大重试次数
 */
export interface ApiErrorRecord extends ConversationRecord {
  type: 'system'
  subtype: 'api_error'
  level: string
  error?: {
    status?: number
    headers?: Record<string, string>
    error?: { type: string, message: string }
  }
  retryInMs: number
  retryAttempt: number
  maxRetries: number
}

/**
 * 本地命令记录：在 Claude Code 中执行的本地 CLI 命令（如 /clear, /compact 等）。
 */
export interface LocalCommandRecord extends ConversationRecord {
  type: 'system'
  subtype: 'local_command'
  content: string
  level: string
  isMeta?: boolean
}

/**
 * 系统记录联合类型。
 * 通过 subtype 字段区分具体子类型，使用类型守卫函数（如 isApiError）进行安全分发。
 */
export type SystemRecord =
  | StopHookSummaryRecord
  | CompactBoundaryRecord
  | TurnDurationRecord
  | ApiErrorRecord
  | LocalCommandRecord

// =====================================================================
// 6. file-history-snapshot — 文件历史快照
// =====================================================================

/**
 * 文件历史快照记录：Claude Code 在修改文件前保存的快照，用于支持撤销操作。
 * 包含所有被追踪文件的备份文件名和版本号。
 * 此类型数据量大且 UI 不需要展示，默认在 API 层被过滤掉。
 */
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

// =====================================================================
// 工具结果类型守卫
// =====================================================================
// 以下函数用于从 ToolUseResult 联合类型中安全地缩窄到具体类型。
// 由于各工具返回的数据结构差异很大，通过检查特征字段来判断具体类型。

/** 判断是否为 Bash 工具结果（特征：包含 stdout 字段） */
export function isBashResult(r: ToolUseResult): r is BashToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'stdout' in r
}

/** 判断是否为 Read 工具结果（特征：包含 file 和 type，但无 stdout） */
export function isReadResult(r: ToolUseResult): r is ReadToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'file' in r && 'type' in r && !('stdout' in r)
}

/** 判断是否为 Grep 工具结果（特征：包含 content 和 numFiles） */
export function isGrepResult(r: ToolUseResult): r is GrepToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'content' in r && 'numFiles' in r
}

/** 判断是否为 Glob 工具结果（特征：包含 filenames 和 numFiles，但无 content） */
export function isGlobResult(r: ToolUseResult): r is GlobToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'filenames' in r && 'numFiles' in r && !('content' in r)
}

/** 判断是否为 MCP 工具结果（特征：是数组） */
export function isMcpResult(r: ToolUseResult): r is McpToolResultItem[] {
  return Array.isArray(r)
}

/** 判断是否为 Edit 工具结果（特征：包含 filePath 和 oldString） */
export function isEditResult(r: ToolUseResult): r is EditToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'filePath' in r && 'oldString' in r
}

/** 判断是否为 Write 工具结果（特征：包含 filePath 和 content，但无 oldString） */
export function isWriteResult(r: ToolUseResult): r is WriteToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'filePath' in r && 'content' in r && !('oldString' in r)
}

/** 判断是否为 Task 工具结果（特征：包含 agentId 和 totalDurationMs） */
export function isTaskResult(r: ToolUseResult): r is TaskToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'agentId' in r && 'totalDurationMs' in r
}

/** 判断是否为 TodoWrite 工具结果（特征：包含 newTodos 数组） */
export function isTodoWriteResult(r: ToolUseResult): r is TodoWriteToolResult {
  return typeof r === 'object' && r !== null && !Array.isArray(r) && 'newTodos' in r
}

// =====================================================================
// 系统记录子类型守卫
// =====================================================================
// 以下函数用于从 SystemRecord 联合类型中安全地缩窄到具体子类型。
// 在 ConversationView 组件中用于按子类型分发渲染不同的系统事件卡片。

/** 判断是否为上下文压缩边界记录 */
export function isCompactBoundary(r: SystemRecord): r is CompactBoundaryRecord {
  return 'subtype' in r && r.subtype === 'compact_boundary'
}

/** 判断是否为 Stop Hook 摘要记录 */
export function isStopHookSummary(r: SystemRecord): r is StopHookSummaryRecord {
  return 'subtype' in r && r.subtype === 'stop_hook_summary'
}

/** 判断是否为 Turn 耗时记录 */
export function isTurnDuration(r: SystemRecord): r is TurnDurationRecord {
  return 'subtype' in r && r.subtype === 'turn_duration'
}

/** 判断是否为 API 错误记录 */
export function isApiError(r: SystemRecord): r is ApiErrorRecord {
  return 'subtype' in r && r.subtype === 'api_error'
}

/** 判断是否为本地命令记录 */
export function isLocalCommand(r: SystemRecord): r is LocalCommandRecord {
  return 'subtype' in r && r.subtype === 'local_command'
}

// =====================================================================
// 联合类型
// =====================================================================

/**
 * JSONL 文件中所有可能出现的记录类型的联合。
 * 这是 API 返回数据和前端 composable 处理的基础类型。
 */
export type JsonlRecord
  = | QueueOperationRecord
    | UserRecord
    | AssistantRecord
    | ProgressRecord
    | SystemRecord
    | FileHistorySnapshotRecord
