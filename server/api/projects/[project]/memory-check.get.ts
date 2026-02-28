/**
 * API 路由：GET /api/projects/:project/memory-check
 *
 * 轻量级检查项目记忆文件（MEMORY.md）是否存在，不读取文件内容。
 * 用于前端判断是否显示「项目记忆」入口按钮。
 *
 * 路径参数：
 *   - project: 项目目录名
 *
 * 返回值：
 *   - exists: 文件是否存在
 */
import { join, resolve } from 'node:path'
import { access } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!

  // 构建 MEMORY.md 路径
  const filePath = resolve(join(CLAUDE_PROJECTS_DIR, project, 'memory', 'MEMORY.md'))

  // 路径安全校验
  if (!filePath.startsWith(CLAUDE_PROJECTS_DIR)) {
    return { exists: false }
  }

  try {
    await access(filePath)
    return { exists: true }
  } catch {
    return { exists: false }
  }
})
