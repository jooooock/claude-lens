/**
 * API 路由：GET /api/projects/:project/memory
 *
 * 读取项目的持久记忆文件（MEMORY.md）。Claude Code 会将项目级别的
 * 长期记忆存储在 {project}/memory/MEMORY.md 中，跨会话持久保存。
 *
 * 路径参数：
 *   - project: 项目目录名
 *
 * 返回值：
 *   - content:  MEMORY.md 文件的原始 Markdown 内容
 *   - filePath: 文件的绝对路径，方便用户在系统中定位
 */
import { join, resolve } from 'node:path'
import { readFile } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!

  // 构建 MEMORY.md 路径
  const filePath = resolve(join(CLAUDE_PROJECTS_DIR, project, 'memory', 'MEMORY.md'))

  // 路径安全校验
  if (!filePath.startsWith(CLAUDE_PROJECTS_DIR)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid path'
    })
  }

  try {
    const content = await readFile(filePath, 'utf-8')
    return { content, filePath }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 404,
      statusMessage: `Memory file not found: ${message}`
    })
  }
})
