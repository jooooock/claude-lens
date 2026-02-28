<!--
  session/[project]/[sessionId] - 会话详情页

  用途：
    展示指定项目下指定会话的完整对话历史，包括：
    1. 顶部工具栏：显示会话 ID，提供统计面板和过滤器的切换按钮
    2. 统计面板（SessionStatsBar）：Token 用量、模型、轮次等汇总数据
    3. 过滤器面板：Thinking / Progress / System / Sidechain 四个开关
    4. 对话主体（ConversationView）：完整的对话 Turn 序列
    5. Minimap 导航栏：对话缩略导航
    6. 图片大图预览（仅客户端渲染，避免 SSR Teleport 水合问题）

  路由参数：
    - project:   项目目录名
    - sessionId: 会话 ID

  数据流：
    route.params → useSession（加载记录）→ useSessionStats（计算统计）
                                          → useConversationTree（构建 Turn 树）→ 渲染
-->
<script setup lang="ts">
import type { ConversationFilters } from '~/types/api'

const route = useRoute()
/** 从路由参数提取项目目录名 */
const project = computed(() => route.params.project as string)
/** 从路由参数提取会话 ID */
const sessionId = computed(() => route.params.sessionId as string)

/** 加载会话记录数据 */
const { records, loading } = useSession(project, sessionId)
/** 根据记录计算会话统计信息 */
const { stats } = useSessionStats(records)

/** 对话内容过滤器配置 */
const filters = ref<ConversationFilters>({
  showProgress: false,
  showSystemEvents: true,
  showSidechains: false,
  showThinking: true
})

/** 将扁平记录组织为结构化的对话 Turn 序列 */
const { turns } = useConversationTree(records, filters)

/** 过滤器面板是否展开 */
const showFilters = ref(false)
/** 统计面板是否展开 */
const showStats = ref(true)

/** 滚动容器 ref，供 ConversationView 和 Minimap 组件共用以实现滚动同步 */
const scrollEl = ref<HTMLElement>()
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
          icon="i-lucide-chart-bar"
          size="xs"
          color="neutral"
          variant="ghost"
          :class="{ 'text-primary': showStats }"
          title="统计面板"
          @click="showStats = !showStats"
        />
        <UButton
          :icon="showFilters ? 'i-lucide-filter-x' : 'i-lucide-filter'"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="showFilters = !showFilters"
        />
      </div>
    </div>

    <!-- 会话统计 -->
    <ConversationSessionStatsBar
      v-if="!loading && stats.turnCount > 0"
      :stats="stats"
      :collapsed="!showStats"
      @toggle="showStats = !showStats"
    />

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
      >
        <ConversationView
          :turns="turns"
          :loading="loading"
          :show-progress="filters.showProgress"
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
