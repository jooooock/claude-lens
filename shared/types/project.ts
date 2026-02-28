/**
 * 共享类型定义：项目和会话的数据结构
 *
 * 这些类型在服务端（server/utils/projects-scanner.ts）和客户端（通过 ~~/shared/ 导入）之间共享，
 * 确保前后端的数据结构一致性。
 */

/** 项目信息 — 对应 ~/.claude/projects/ 下的一个项目目录 */
export interface ProjectInfo {
  /** 项目目录名（路径中的 / 被替换为 -），如 "-Users-champ-Repos-github-jooooock-claude-lens" */
  name: string
  /** 真实工作目录路径，从 JSONL 记录的 cwd 字段提取，用于在 UI 中显示人类可读的项目路径 */
  originalPath: string
  /** 项目下的所有会话列表，按最后活跃时间降序排列 */
  sessions: SessionInfo[]
  /** 项目是否包含 memory/ 目录（用于存储项目级记忆/MEMORY.md） */
  hasMemory: boolean
}

/** 会话信息 — 对应一个 .jsonl 会话文件 */
export interface SessionInfo {
  /** 会话 ID，即 JSONL 文件名（不含 .jsonl 扩展名） */
  id: string
  /** 会话标题/摘要，从 JSONL 记录的 slug 字段提取（可选，部分会话可能没有） */
  slug?: string
  /** JSONL 文件大小（字节），用于在 UI 中显示文件体积 */
  fileSize: number
  /** 首条记录的时间戳（ISO 8601 格式） */
  firstTimestamp: string
  /** 末条记录的时间戳（ISO 8601 格式），用于排序和显示最后活跃时间 */
  lastTimestamp: string
  /** 会话是否包含 subagents/ 子目录（存在子代理数据） */
  hasSubagents: boolean
  /** 会话是否包含 tool-results/ 子目录（存在工具结果缓存） */
  hasToolResults: boolean
}
