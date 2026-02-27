import type { ProjectInfo } from '~/types/api'

export function useProjects() {
  const { data: projects, status, refresh } = useFetch<ProjectInfo[]>('/api/projects', {
    default: () => []
  })

  return {
    projects,
    loading: computed(() => status.value === 'pending'),
    refresh
  }
}
