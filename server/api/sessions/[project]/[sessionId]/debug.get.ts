/**
 * API 路由：GET /api/sessions/:project/:sessionId/debug
 *
 * 读取会话的调试日志文件。Claude Code 在运行时可能会在
 * ~/.claude/debug/{sessionId}.txt 中记录调试输出。
 *
 * 路径参数：
 *   - project:   项目目录名（用于路径校验）
 *   - sessionId: 会话 ID
 *
 * 返回值：
 *   - content:   日志文件内容（截断到 100KB）
 *   - fileSize:  原始文件大小（字节）
 *   - truncated: 内容是否被截断
 *   - filePath:  文件的绝对路径，方便用户在系统中定位
 */
import { join } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'

/** 最大返回内容大小：100KB */
const MAX_CONTENT_SIZE = 100 * 1024

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')!

  // 调试日志路径：~/.claude/debug/{sessionId}.txt
  const debugDir = join(homedir(), '.claude', 'debug')
  const filePath = join(debugDir, `${sessionId}.txt`)

  // 安全校验：确保路径在 debug 目录内
  if (!filePath.startsWith(debugDir)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid path'
    })
  }

  try {
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size

    // 读取文件内容
    const fullContent = await readFile(filePath, 'utf-8')
    const truncated = fullContent.length > MAX_CONTENT_SIZE
    const content = truncated ? fullContent.slice(0, MAX_CONTENT_SIZE) : fullContent

    return {
      content,
      fileSize,
      truncated,
      filePath
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 404,
      statusMessage: `Debug log not found: ${message}`
    })
  }
})
