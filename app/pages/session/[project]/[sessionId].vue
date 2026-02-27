<script setup lang="ts">
import type { ConversationFilters } from '~/types/api'

const route = useRoute()
const project = computed(() => route.params.project as string)
const sessionId = computed(() => route.params.sessionId as string)

const { records, loading, hasMore, loadMore } = useSession(project, sessionId)

const filters = ref<ConversationFilters>({
  showProgress: false,
  showSystemEvents: true,
  showSidechains: false,
  showThinking: true
})

const { turns } = useConversationTree(records, filters)

const showFilters = ref(false)

// 滚动容器 ref，供 minimap 和加载更多共用
const scrollEl = ref<HTMLElement>()

// 滚动到底部时加载更多
function onScroll() {
  const el = scrollEl.value
  if (!el) return
  if (loading.value || !hasMore.value) return

  const threshold = 200
  if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
    loadMore()
  }
}
</script>

<template>
  <div class="flex flex-col h-svh max-h-svh bg-[var(--site-bg)]">
    <!-- 顶部工具栏 -->
    <div class="shrink-0 border-b border-[var(--card-border)] px-5 py-3 flex items-center justify-between bg-[var(--card-bg)]/80 backdrop-blur-sm">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon
          name="i-lucide-scroll-text"
          class="size-4 text-primary shrink-0"
        />
        <span class="text-sm font-medium truncate">{{ sessionId }}</span>
      </div>
      <div class="flex items-center gap-1">
        <UButton
          :icon="showFilters ? 'i-lucide-filter-x' : 'i-lucide-filter'"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="showFilters = !showFilters"
        />
      </div>
    </div>

    <!-- 过滤器 -->
    <div
      v-if="showFilters"
      class="shrink-0 border-b border-[var(--card-border)] px-5 py-3 flex items-center gap-4 bg-[var(--card-bg)]/60 backdrop-blur-sm"
    >
      <label class="flex items-center gap-1.5 text-xs">
        <USwitch
          v-model="filters.showThinking"
          size="xs"
        />
        Thinking
      </label>
      <label class="flex items-center gap-1.5 text-xs">
        <USwitch
          v-model="filters.showProgress"
          size="xs"
        />
        Progress
      </label>
      <label class="flex items-center gap-1.5 text-xs">
        <USwitch
          v-model="filters.showSystemEvents"
          size="xs"
        />
        System
      </label>
      <label class="flex items-center gap-1.5 text-xs">
        <USwitch
          v-model="filters.showSidechains"
          size="xs"
        />
        Sidechain
      </label>
    </div>

    <!-- 对话内容 + Minimap -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 对话主体 -->
      <div
        ref="scrollEl"
        class="flex-1 overflow-y-auto"
        @scroll="onScroll"
      >
        <ConversationView
          :turns="turns"
          :loading="loading"
          :has-more="hasMore"
          @load-more="loadMore"
        />
      </div>

      <!-- Minimap 导航 -->
      <ConversationMinimap
        :turns="turns"
        :scroll-container="scrollEl"
      />
    </div>
    <!-- 图片大图预览（仅客户端渲染，避免 Teleport SSR 水合不匹配） -->
    <ClientOnly>
      <ConversationImagePreview />
    </ClientOnly>
  </div>
</template>
