import type { PaginatedRecordsResponse } from '~/types/api'
import type { JsonlRecord } from '~/types/records'

export function useSession(project: Ref<string>, sessionId: Ref<string>) {
  const records = ref<JsonlRecord[]>([])
  const total = ref(0)
  const loading = ref(false)
  const hasMore = ref(false)
  const offset = ref(0)
  const pageSize = 200

  async function loadRecords(reset = false) {
    if (loading.value) return
    if (!project.value || !sessionId.value) return

    loading.value = true

    if (reset) {
      records.value = []
      offset.value = 0
    }

    try {
      const data = await $fetch<PaginatedRecordsResponse>(
        `/api/sessions/${project.value}/${sessionId.value}`,
        {
          params: {
            offset: offset.value,
            limit: pageSize
          }
        }
      )

      records.value.push(...data.records as JsonlRecord[])
      total.value = data.total
      hasMore.value = data.hasMore
      offset.value += data.records.length
    } catch (err) {
      console.error('Failed to load session records:', err)
    } finally {
      loading.value = false
    }
  }

  // 首次加载
  watch([project, sessionId], () => {
    loadRecords(true)
  }, { immediate: true })

  return {
    records: records as Readonly<Ref<JsonlRecord[]>>,
    total: readonly(total),
    loading: readonly(loading),
    hasMore: readonly(hasMore),
    loadMore: () => loadRecords(false)
  }
}
