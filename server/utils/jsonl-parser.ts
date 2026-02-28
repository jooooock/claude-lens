/**
 * JSONL 文件解析工具模块
 *
 * 提供三种 JSONL 文件读取方式：
 * 1. streamJsonlRecords — 异步生成器，逐行流式解析，适合大文件的渐进处理
 * 2. readJsonlAll       — 一次性读取全部记录，支持按类型快速过滤（在 JSON.parse 前做字符串匹配）
 * 3. extractSessionMeta — 只提取会话元数据（slug、首尾时间戳、cwd），遍历全文但只保留关键信息
 *
 * 所有函数都使用 Node.js readline 接口进行流式行读取，内存友好，支持 16MB+ 的大文件。
 */
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

/**
 * 流式逐行解析 JSONL 文件（异步生成器）
 *
 * 使用 readline 接口逐行读取文件，每行解析为 JSON 对象后 yield 返回。
 * 跳过空行和 JSON 格式错误的行。
 *
 * @param filePath - JSONL 文件的绝对路径
 * @yields 每行解析得到的 JSON 对象
 */
export async function* streamJsonlRecords(filePath: string): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      yield JSON.parse(line)
    } catch {
      // 跳过格式错误的行
    }
  }
}

/**
 * 读取 JSONL 文件的全部记录，支持按类型过滤
 *
 * 优化策略：在调用 JSON.parse 之前，先用字符串 includes 检查 "type":"xxx" 模式，
 * 快速跳过不需要的记录类型，避免大量无用的 JSON 解析开销。
 *
 * @param filePath     - JSONL 文件的绝对路径
 * @param excludeTypes - 需要排除的记录类型集合（可选）
 * @returns 包含 records（记录数组）和 total（总数）的对象
 */
export async function readJsonlAll(
  filePath: string,
  excludeTypes?: Set<string>
): Promise<{ records: Record<string, unknown>[], total: number }> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  const records: Record<string, unknown>[] = []

  for await (const line of rl) {
    if (!line.trim()) continue

    // 在 JSON.parse 之前做快速类型过滤
    if (excludeTypes) {
      let skip = false
      for (const t of excludeTypes) {
        if (line.includes(`"type":"${t}"`) || line.includes(`"type": "${t}"`)) {
          skip = true
          break
        }
      }
      if (skip) continue
    }

    try {
      records.push(JSON.parse(line))
    } catch {
      // 跳过格式错误的行
    }
  }

  return { records, total: records.length }
}

/**
 * 从 JSONL 文件中提取会话元数据
 *
 * 遍历整个文件，但只提取以下关键信息：
 * - slug:           会话标题（取第一个有效值）
 * - firstTimestamp:  首条记录的时间戳
 * - lastTimestamp:   最后一条记录的时间戳（持续更新）
 * - cwd:            工作目录（取第一个有效值）
 *
 * 用于侧边栏的会话列表展示，无需加载完整记录。
 *
 * @param filePath - JSONL 文件的绝对路径
 * @returns 会话元数据对象
 */
export async function extractSessionMeta(filePath: string): Promise<{
  slug?: string
  firstTimestamp: string
  lastTimestamp: string
  cwd?: string
}> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  let slug: string | undefined
  let cwd: string | undefined
  let firstTimestamp = ''
  let lastTimestamp = ''
  let lineCount = 0

  for await (const line of rl) {
    if (!line.trim()) continue
    lineCount++

    try {
      const record = JSON.parse(line)

      // 从首条记录获取时间戳
      if (lineCount === 1 && record.timestamp) {
        firstTimestamp = record.timestamp
      }

      // 提取 slug 和 cwd（取第一个有效值）
      if (!slug && record.slug) {
        slug = record.slug
      }
      if (!cwd && record.cwd) {
        cwd = record.cwd
      }

      // 持续更新 lastTimestamp
      if (record.timestamp) {
        lastTimestamp = record.timestamp
      }
    } catch {
      // 跳过
    }
  }

  return { slug, firstTimestamp, lastTimestamp, cwd }
}
