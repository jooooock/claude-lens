import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { ProjectInfo, SessionInfo } from '~~/shared/types/project'

export const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')

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
