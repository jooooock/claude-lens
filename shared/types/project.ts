export interface ProjectInfo {
  /** 目录名，如 -Users-champ-Repos-github-jooooock-claude-lens */
  name: string
  /** 真实工作目录路径，从 JSONL 记录的 cwd 字段提取 */
  originalPath: string
  sessions: SessionInfo[]
  hasMemory: boolean
}

export interface SessionInfo {
  id: string
  slug?: string
  fileSize: number
  firstTimestamp: string
  lastTimestamp: string
  hasSubagents: boolean
  hasToolResults: boolean
}
