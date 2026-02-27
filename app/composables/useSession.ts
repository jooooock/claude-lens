import type { SessionRecordsResponse } from '~/types/api'
import type { JsonlRecord } from '~/types/records'

export function useSession(project: Ref<string>, sessionId: Ref<string>) {
  const records = ref<JsonlRecord[]>([])
  const total = ref(0)
  const loading = ref(false)

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
