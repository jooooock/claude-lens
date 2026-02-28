/**
 * API 路由：GET /api/sessions/:project/:sessionId
 *
 * 读取指定项目下指定会话的 JSONL 文件，返回解析后的记录数组。
 * 支持通过 excludeTypes 查询参数过滤不需要的记录类型（逗号分隔），
 * 默认排除 file-history-snapshot 类型（体积大且通常不需要展示）。
 *
 * 路径参数：
 *   - project:   项目目录名（如 "-Users-champ-Repos-github-xxx"）
 *   - sessionId: 会话 ID（不含 .jsonl 扩展名）
 *
 * 查询参数：
 *   - excludeTypes: 逗号分隔的记录类型列表，默认值为 "file-history-snapshot"
 *
 * 返回值：
 *   - records: 解析后的记录对象数组
 *   - total:   记录总数
 *
 * 安全措施：
 *   使用 resolve() 解析后检查路径是否在 CLAUDE_PROJECTS_DIR 内，防止路径遍历攻击。
 */
import { join, resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  const sessionId = getRouterParam(event, 'sessionId')!
  const query = getQuery(event)

  const excludeTypesParam = (query.excludeTypes as string) || 'file-history-snapshot'
  const excludeTypes = new Set(excludeTypesParam.split(',').filter(Boolean))

  // 路径安全校验：确保最终路径在 CLAUDE_PROJECTS_DIR 内
  const filePath = resolve(join(CLAUDE_PROJECTS_DIR, project, `${sessionId}.jsonl`))
  if (!filePath.startsWith(CLAUDE_PROJECTS_DIR)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid path'
    })
  }

  try {
    const { records, total } = await readJsonlAll(filePath, excludeTypes)

    return {
      records,
      total
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 404,
      statusMessage: `Session not found: ${message}`
    })
  }
})
