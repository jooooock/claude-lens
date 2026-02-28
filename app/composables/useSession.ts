/**
 * useSession - 会话数据加载 composable
 *
 * 根据 project 和 sessionId 参数从 /api/sessions/:project/:sessionId 接口获取会话记录。
 * 内部使用 watch 监听参数变化，自动重新加载数据（immediate: true 确保首次立即加载）。
 * 使用 $fetch 而非 useFetch，因为需要手动控制加载时机和重置状态。
 *
 * @param project   - 响应式的项目目录名引用
 * @param sessionId - 响应式的会话 ID 引用
 * @returns records（只读记录数组）、total（总数）、loading（加载状态）
 */
import type { SessionRecordsResponse } from '~/types/api'
import type { JsonlRecord } from '~/types/records'

export function useSession(project: Ref<string>, sessionId: Ref<string>) {
  const records = ref<JsonlRecord[]>([])
  const total = ref(0)
  const loading = ref(false)

  /** 加载会话记录：重置当前数据，请求 API 获取新记录，处理加载状态 */
  async function loadRecords() {
    if (loading.value) return
    if (!project.value || !sessionId.value) return

    loading.value = true
    records.value = []

    try {
      const data = await $fetch<SessionRecordsResponse>(
        `/api/sessions/${project.value}/${sessionId.value}`
      )

      records.value = data.records as JsonlRecord[]
      total.value = data.total
    } catch (err) {
      console.error('Failed to load session records:', err)
    } finally {
      loading.value = false
    }
  }

  // 切换会话时重新加载
  watch([project, sessionId], () => {
    loadRecords()
  }, { immediate: true })

  return {
    records: records as Readonly<Ref<JsonlRecord[]>>,
    total: readonly(total),
    loading: readonly(loading)
  }
}
