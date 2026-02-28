/**
 * API 路由：GET /api/sessions/:project/:sessionId/subagent/:agentId
 *
 * 读取指定会话下指定子代理（subagent）的 JSONL 对话文件。
 * 子代理文件存储在 {project}/{sessionId}/subagents/agent-{agentId}.jsonl 中，
 * 记录格式与主会话 JSONL 一致，可复用 readJsonlAll 解析。
 *
 * 路径参数：
 *   - project:   项目目录名
 *   - sessionId: 主会话 ID
 *   - agentId:   子代理 ID（如 "a273b25"）
 *
 * 返回值：
 *   - records: 子代理的记录数组
 *   - total:   记录总数
 */
import { join, resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  const sessionId = getRouterParam(event, 'sessionId')!
  const agentId = getRouterParam(event, 'agentId')!

  // 构建子代理 JSONL 文件路径
  const filePath = resolve(join(
    CLAUDE_PROJECTS_DIR,
    project,
    sessionId,
    'subagents',
    `agent-${agentId}.jsonl`
  ))

  // 路径安全校验：确保路径在 CLAUDE_PROJECTS_DIR 内
  if (!filePath.startsWith(CLAUDE_PROJECTS_DIR)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid path'
    })
  }

  try {
    // 子代理也排除 file-history-snapshot（体积大且不需要展示）
    const excludeTypes = new Set(['file-history-snapshot'])
    const { records, total } = await readJsonlAll(filePath, excludeTypes)

    return { records, total }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 404,
      statusMessage: `Subagent not found: ${message}`
    })
  }
})
