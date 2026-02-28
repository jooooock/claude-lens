/**
 * 项目目录扫描器模块
 *
 * 负责扫描 ~/.claude/projects/ 目录结构，提取所有项目和会话的元数据。
 * 采用并行处理策略：Promise.all 同时扫描多个项目、多个会话文件，提高扫描速度。
 *
 * 目录结构示例：
 *   ~/.claude/projects/
 *     ├── -Users-champ-Repos-xxx/        ← 项目目录（目录名是路径的 - 分隔形式）
 *     │   ├── abc123.jsonl               ← 会话文件
 *     │   ├── abc123/                    ← 会话子目录（可选）
 *     │   │   ├── subagents/             ← 子代理数据
 *     │   │   └── tool-results/          ← 工具结果缓存
 *     │   └── memory/                    ← 项目记忆目录
 *     └── ...
 */
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { ProjectInfo, SessionInfo } from '~~/shared/types/project'

/** Claude Code 项目数据根目录路径 */
export const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

/**
 * 扫描单个会话 JSONL 文件，提取会话信息
 *
 * 并行获取文件 stat（大小）和元数据（slug、时间戳、cwd），
 * 同时检查会话子目录是否存在 subagents/ 和 tool-results/。
 *
 * @param projectDir - 项目目录的绝对路径
 * @param fileName   - JSONL 文件名（如 "abc123.jsonl"）
 * @returns 包含 session 信息和 cwd 的对象
 */
async function scanSessionFile(projectDir: string, fileName: string): Promise<{
  session: SessionInfo
  cwd?: string
}> {
  const sessionId = fileName.replace('.jsonl', '')
  const filePath = join(projectDir, fileName)

  // 并行获取 stat 和 meta
  const [fileStat, meta] = await Promise.all([
    stat(filePath),
    extractSessionMeta(filePath)
  ])

  // 检查子目录
  const sessionDir = join(projectDir, sessionId)
  let hasSubagents = false
  let hasToolResults = false
  try {
    const sessionDirEntries = await readdir(sessionDir, { withFileTypes: true })
    for (const sde of sessionDirEntries) {
      if (sde.name === 'subagents') hasSubagents = true
      if (sde.name === 'tool-results') hasToolResults = true
    }
  } catch {
    // 会话子目录不存在（短会话）
  }

  return {
    session: {
      id: sessionId,
      slug: meta.slug,
      fileSize: fileStat.size,
      firstTimestamp: meta.firstTimestamp,
      lastTimestamp: meta.lastTimestamp,
      hasSubagents,
      hasToolResults
    },
    cwd: meta.cwd
  }
}

/**
 * 扫描单个项目目录，获取项目信息和所有会话列表
 *
 * 读取项目目录中的所有 .jsonl 文件，并行调用 scanSessionFile 提取元数据，
 * 检查是否存在 memory/ 目录，按最后活跃时间降序排列会话。
 *
 * @param entry - 目录项，包含 name 属性（项目目录名）
 * @returns 项目完整信息对象
 */
async function scanProject(entry: { name: string }): Promise<ProjectInfo> {
  const projectDir = join(CLAUDE_PROJECTS_DIR, entry.name)
  const projectEntries = await readdir(projectDir, { withFileTypes: true })

  const hasMemory = projectEntries.some(pe => pe.name === 'memory' && pe.isDirectory())
  const jsonlFiles = projectEntries.filter(pe => pe.name.endsWith('.jsonl') && pe.isFile())

  // 并行处理所有 JSONL 文件
  const results = await Promise.all(
    jsonlFiles.map(pe => scanSessionFile(projectDir, pe.name))
  )

  const sessions = results.map(r => r.session)
  const originalPath = results.find(r => r.cwd)?.cwd || ''

  // 按 lastTimestamp 降序排列
  sessions.sort((a, b) =>
    new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
  )

  return {
    name: entry.name,
    originalPath,
    sessions,
    hasMemory
  }
}

/**
 * 扫描所有项目，返回完整的项目列表
 *
 * 读取 CLAUDE_PROJECTS_DIR 下所有子目录（排除以 . 开头的隐藏目录），
 * 并行扫描每个项目，最终按最近活跃项目排在前面的顺序排列。
 *
 * @returns 项目信息数组，按最近活跃时间降序排列
 */
export async function scanProjects(): Promise<ProjectInfo[]> {
  let entries
  try {
    entries = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true })
  } catch {
    return []
  }

  const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'))

  // 并行扫描所有项目
  const projects = await Promise.all(dirs.map(scanProject))

  // 按最近活跃的项目排在前面
  projects.sort((a, b) => {
    const aTime = a.sessions[0]?.lastTimestamp || ''
    const bTime = b.sessions[0]?.lastTimestamp || ''
    return bTime.localeCompare(aTime)
  })

  return projects
}
