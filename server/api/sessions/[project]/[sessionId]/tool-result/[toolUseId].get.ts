/**
 * API 路由：GET /api/sessions/:project/:sessionId/tool-result/:toolUseId
 *
 * 读取外部化的工具结果文件。当工具输出过大时，Claude Code 会将完整输出
 * 存储到 {project}/{sessionId}/tool-results/{toolUseId}.txt 文件中，
 * JSONL 中只保留截断版本。
 *
 * 路径参数：
 *   - project:    项目目录名
 *   - sessionId:  会话 ID
 *   - toolUseId:  工具调用 ID（如 "toolu_012PcdArVqTqF7ueF1D6iojV"）
 *
 * 返回值：
 *   - content:   文件内容（截断到 500KB）
 *   - fileSize:  原始文件大小（字节）
 *   - truncated: 内容是否被截断
 */
import { join, resolve } from 'node:path'
import { readFile, stat } from 'node:fs/promises'

/** 最大返回内容大小：500KB */
const MAX_CONTENT_SIZE = 500 * 1024

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  const sessionId = getRouterParam(event, 'sessionId')!
  const toolUseId = getRouterParam(event, 'toolUseId')!

  // 构建工具结果文件路径
  const filePath = resolve(join(
    CLAUDE_PROJECTS_DIR,
    project,
    sessionId,
    'tool-results',
    `${toolUseId}.txt`
  ))

  // 路径安全校验
  if (!filePath.startsWith(CLAUDE_PROJECTS_DIR)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid path'
    })
  }

  try {
    const fileStat = await stat(filePath)
    const fileSize = fileStat.size

    // 读取文件内容（readFile 一次性读取，对于 500KB 限制是安全的）
    const fullContent = await readFile(filePath, 'utf-8')
    const truncated = fullContent.length > MAX_CONTENT_SIZE
    const content = truncated ? fullContent.slice(0, MAX_CONTENT_SIZE) : fullContent

    return {
      content,
      fileSize,
      truncated
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 404,
      statusMessage: `Tool result not found: ${message}`
    })
  }
})
