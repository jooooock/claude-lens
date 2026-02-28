/**
 * useProjects - 项目列表数据 composable
 *
 * 使用 Nuxt 的 useFetch 从 /api/projects 接口获取项目列表数据。
 * 返回响应式的 projects 数组、loading 加载状态和 refresh 手动刷新函数。
 *
 * 使用场景：在侧边栏 ProjectTree 组件中获取并展示项目树。
 */
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
