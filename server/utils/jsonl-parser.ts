import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

/**
 * 流式逐行解析 JSONL 文件
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
 * 分页读取 JSONL 文件，支持按类型过滤
 */
export async function readJsonlPaginated(
  filePath: string,
  offset: number,
  limit: number,
  excludeTypes?: Set<string>
): Promise<{ records: Record<string, unknown>[], total: number }> {
  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  const records: Record<string, unknown>[] = []
  let filteredIndex = 0
  let totalFiltered = 0

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

    totalFiltered++

    if (filteredIndex >= offset && records.length < limit) {
      try {
        records.push(JSON.parse(line))
      } catch {
        // 跳过格式错误的行
      }
    }

    filteredIndex++
  }

  return { records, total: totalFiltered }
}

/**
 * 从 JSONL 文件提取会话元数据（读取前几条和最后一条记录）
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
