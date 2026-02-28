/**
 * API 路由：GET /api/projects
 *
 * 扫描 ~/.claude/projects/ 目录，返回所有项目及其会话列表。
 * 内部调用 scanProjects() 函数，该函数并行读取所有项目目录和会话元数据，
 * 结果按最近活跃时间降序排列。
 *
 * 返回值：ProjectInfo[] — 项目信息数组，每个项目包含 name、originalPath、sessions、hasMemory
 */
export default defineEventHandler(async () => {
  return await scanProjects()
})
