import { join, resolve } from 'node:path'

export default defineEventHandler(async (event) => {
  const project = getRouterParam(event, 'project')!
  const sessionId = getRouterParam(event, 'sessionId')!
  const query = getQuery(event)

  const offset = Number(query.offset) || 0
  const limit = Number(query.limit) || 200
  const excludeTypesParam = (query.excludeTypes as string) || 'progress,file-history-snapshot,queue-operation'

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
    const { records, total } = await readJsonlPaginated(filePath, offset, limit, excludeTypes)

    return {
      records,
      total,
      offset,
      limit,
      hasMore: offset + records.length < total
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 404,
      statusMessage: `Session not found: ${message}`
    })
  }
})
