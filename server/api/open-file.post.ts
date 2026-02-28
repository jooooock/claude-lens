/**
 * API 路由：POST /api/open-file
 *
 * 在系统文件管理器中打开指定文件所在的目录并选中该文件。
 * 仅允许打开 ~/.claude/ 目录下的文件，防止任意路径访问。
 *
 * 请求体：
 *   - filePath: 要在文件管理器中显示的文件绝对路径
 *
 * 返回值：
 *   - success: 操作是否成功
 *
 * 平台支持：
 *   - macOS：使用 `open -R` 在 Finder 中选中文件
 *   - Linux：使用 `xdg-open` 打开文件所在目录
 */
import { exec } from 'node:child_process'
import { platform, homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { access } from 'node:fs/promises'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

/** ~/.claude 目录的绝对路径，作为安全边界 */
const CLAUDE_HOME_DIR = join(homedir(), '.claude')

export default defineEventHandler(async (event) => {
  const body = await readBody<{ filePath: string }>(event)

  if (!body?.filePath || typeof body.filePath !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 filePath 参数'
    })
  }

  const { filePath } = body

  // 安全校验：仅允许打开 ~/.claude/ 目录下的文件
  if (!filePath.startsWith(CLAUDE_HOME_DIR)) {
    throw createError({
      statusCode: 403,
      statusMessage: '仅允许打开 ~/.claude 目录下的文件'
    })
  }

  // 检查文件是否存在
  try {
    await access(filePath)
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: '文件不存在'
    })
  }

  try {
    const os = platform()
    if (os === 'darwin') {
      // macOS：在 Finder 中选中文件
      await execAsync(`open -R "${filePath}"`)
    } else if (os === 'linux') {
      // Linux：打开文件所在目录
      await execAsync(`xdg-open "${dirname(filePath)}"`)
    } else {
      throw createError({
        statusCode: 500,
        statusMessage: `不支持的操作系统: ${os}`
      })
    }

    return { success: true }
  } catch (err: unknown) {
    // 如果已经是 H3Error（来自上面的 throw），直接重新抛出
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `打开文件失败: ${message}`
    })
  }
})
