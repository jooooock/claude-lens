<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { ProjectInfo } from '~/types/api'

const { projects, loading } = useProjects()
const route = useRoute()

// 当前选中的项目和会话
const currentSessionId = computed(() => route.params.sessionId as string | undefined)

// 展开状态
const expandedProjects = ref<Set<string>>(new Set())

function toggleProject(name: string) {
  if (expandedProjects.value.has(name)) {
    expandedProjects.value.delete(name)
  } else {
    expandedProjects.value.add(name)
  }
}

function formatPath(project: ProjectInfo): string {
  if (project.originalPath) {
    // 只显示最后两级目录
    const parts = project.originalPath.split('/')
    return parts.slice(-2).join('/')
  }
  return project.name
}

// 完整路径，用于 tooltip
function fullPath(project: ProjectInfo): string {
  return project.originalPath || project.name
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(ts: string): string {
  if (!ts) return ''
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true, locale: zhCN })
  } catch {
    return ''
  }
}

// 自动展开当前项目
watch(() => route.params.project, (p) => {
  if (p) expandedProjects.value.add(p as string)
}, { immediate: true })
</script>

<template>
  <div class="py-1 text-[13px]">
    <!-- 加载中 -->
    <div
      v-if="loading"
      class="px-3 py-4 text-center"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-5 animate-spin text-muted"
      />
    </div>

    <!-- 项目列表 -->
    <template v-else>
      <div
        v-for="project in projects"
        :key="project.name"
      >
        <!-- 项目标题 -->
        <button
          class="group w-full flex items-center gap-1.5 px-2.5 py-[6px] text-left cursor-pointer select-none hover:bg-[var(--sidebar-hover-bg)] rounded-md transition-colors"
          :title="fullPath(project)"
          @click="toggleProject(project.name)"
        >
          <UIcon
            :name="expandedProjects.has(project.name) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-4 text-[var(--sidebar-text-muted)] shrink-0 transition-transform duration-150"
          />
          <UIcon
            :name="expandedProjects.has(project.name) ? 'i-lucide-folder-open' : 'i-lucide-folder'"
            class="size-4 shrink-0 transition-colors duration-150"
            :class="expandedProjects.has(project.name) ? 'text-[var(--sidebar-icon-active)]' : 'text-[var(--sidebar-icon-muted)]'"
          />
          <span class="truncate font-semibold text-[var(--sidebar-text)]">{{ formatPath(project) }}</span>
          <span class="ml-auto shrink-0 text-[11px] font-medium text-[var(--sidebar-text-muted)] bg-[var(--sidebar-badge-bg)] rounded-full px-[6px] py-[1px] min-w-[20px] text-center leading-[18px]">
            {{ project.sessions.length }}
          </span>
        </button>

        <!-- 会话列表 — 带展开/收起动画 -->
        <Transition
          enter-active-class="tree-expand-enter-active"
          leave-active-class="tree-expand-leave-active"
          enter-from-class="tree-expand-enter-from"
          leave-to-class="tree-expand-leave-to"
        >
          <div
            v-if="expandedProjects.has(project.name)"
            class="ml-[28px] border-l border-[var(--sidebar-border)] overflow-hidden"
          >
            <NuxtLink
              v-for="session in project.sessions"
              :key="session.id"
              :to="`/session/${project.name}/${session.id}`"
              :title="`${session.slug || session.id}${session.lastTimestamp ? '\n' + formatTime(session.lastTimestamp) : ''}`"
              class="group flex items-center gap-1.5 ml-1.5 px-2 py-[5px] cursor-pointer rounded-md transition-colors"
              :class="[
                currentSessionId === session.id
                  ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-text)] font-semibold'
                  : 'hover:bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-text-muted)]'
              ]"
            >
              <UIcon
                name="i-lucide-scroll-text"
                class="size-4 shrink-0"
                :class="currentSessionId === session.id ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text-muted)]'"
              />
              <span class="truncate flex-1">{{ session.slug || session.id.slice(0, 8) }}</span>
              <span class="shrink-0 text-[11px] text-[var(--sidebar-meta-text)]">{{ formatSize(session.fileSize) }}</span>
            </NuxtLink>
          </div>
        </Transition>
      </div>

      <!-- 空状态 -->
      <div
        v-if="!projects?.length"
        class="px-3 py-8 text-center text-xs text-[var(--sidebar-text-muted)]"
      >
        未找到 Claude Code 项目
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 展开/收起动画 */
.tree-expand-enter-active,
.tree-expand-leave-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
  max-height: 2000px;
}
.tree-expand-enter-from,
.tree-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
