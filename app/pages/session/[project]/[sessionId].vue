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

/**
 * 通过 provide/inject 向深层子组件（如 ToolUseBlock）传递会话上下文。
 * ToolUseBlock 需要 project 和 sessionId 来调用子代理/工具结果 API。
 */
provide('sessionContext', { project, sessionId })

/** 项目记忆文件是否存在（控制入口按钮显隐） */
const memoryExists = ref(false)
/** 项目记忆抽屉是否打开 */
const showMemory = ref(false)
/** 项目记忆内容 */
const memoryContent = ref('')
/** 项目记忆文件的绝对路径 */
const memoryFilePath = ref('')
/** 项目记忆加载状态 */
const memoryLoading = ref(false)

/** 检查项目记忆文件是否存在（轻量级，不读取内容） */
async function checkMemoryExists() {
  try {
    const data = await $fetch<{ exists: boolean }>(`/api/projects/${project.value}/memory-check`)
    memoryExists.value = data.exists
  } catch {
    memoryExists.value = false
  }
}

// 页面加载时立即检查
checkMemoryExists()

/** 加载项目记忆 */
async function loadMemory() {
  if (memoryContent.value || memoryLoading.value) {
    showMemory.value = true
    return
  }
  memoryLoading.value = true
  showMemory.value = true
  try {
    const data = await $fetch<{ content: string, filePath: string }>(`/api/projects/${project.value}/memory`)
    memoryContent.value = data.content
    memoryFilePath.value = data.filePath
  } catch {
    memoryContent.value = ''
  } finally {
    memoryLoading.value = false
  }
}

/** 调试日志抽屉是否打开 */
const showDebugLog = ref(false)
/** 调试日志内容 */
const debugContent = ref('')
/** 调试日志文件的绝对路径 */
const debugFilePath = ref('')
/** 调试日志加载状态 */
const debugLoading = ref(false)
/** 调试日志文件大小 */
const debugFileSize = ref(0)
/** 调试日志是否截断 */
const debugTruncated = ref(false)

/** 加载调试日志 */
async function loadDebugLog() {
  if (debugContent.value || debugLoading.value) {
    showDebugLog.value = true
    return
  }
  debugLoading.value = true
  showDebugLog.value = true
  try {
    const data = await $fetch<{ content: string, fileSize: number, truncated: boolean, filePath: string }>(
      `/api/sessions/${project.value}/${sessionId.value}/debug`
    )
    debugContent.value = data.content
    debugFileSize.value = data.fileSize
    debugTruncated.value = data.truncated
    debugFilePath.value = data.filePath
  } catch {
    debugContent.value = ''
  } finally {
    debugLoading.value = false
  }
}

/**
 * 当前正在执行复制动画的路径标识。
 * 用于在复制按钮上短暂显示 ✓ 图标反馈。
 */
const copiedId = ref('')

/** 复制文件路径到剪贴板，显示短暂的成功反馈 */
async function copyFilePath(path: string, id: string) {
  try {
    await navigator.clipboard.writeText(path)
    copiedId.value = id
    setTimeout(() => {
      copiedId.value = ''
    }, 2000)
  } catch {
    // 剪贴板 API 不可用时静默失败
  }
}

/** 调用后端 API 在系统文件管理器中打开文件 */
async function openInFileManager(path: string) {
  try {
    await $fetch('/api/open-file', {
      method: 'POST',
      body: { filePath: path }
    })
  } catch {
    // 打开失败时静默处理
  }
}

/** 切换会话时重置记忆和日志缓存，并重新检查记忆文件是否存在 */
watch([project, sessionId], () => {
  memoryContent.value = ''
  memoryFilePath.value = ''
  memoryExists.value = false
  debugContent.value = ''
  debugFilePath.value = ''
  showMemory.value = false
  showDebugLog.value = false
  checkMemoryExists()
})
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
          v-if="memoryExists"
          icon="i-lucide-brain"
          size="xs"
          color="neutral"
          variant="ghost"
          title="项目记忆"
          @click="loadMemory"
        />
        <UButton
          icon="i-lucide-bug"
          size="xs"
          color="neutral"
          variant="ghost"
          title="调试日志"
          @click="loadDebugLog"
        />
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

    <!-- 项目记忆抽屉（加宽至 80vw，与子代理抽屉一致） -->
    <USlideover
      :open="showMemory"
      title="项目记忆"
      :description="memoryFilePath || 'MEMORY.md — 项目级持久记忆'"
      class="w-[80vw] max-w-4xl"
      @update:open="showMemory = $event"
    >
      <template #body>
        <div class="p-4">
          <!-- 文件路径操作栏：仅在加载完成且有路径时显示 -->
          <div
            v-if="memoryFilePath"
            class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]"
          >
            <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-[var(--text-secondary)]" />
            <code class="flex-1 text-xs text-[var(--text-secondary)] truncate select-all" :title="memoryFilePath">{{ memoryFilePath }}</code>
            <UButton
              :icon="copiedId === 'memory' ? 'i-lucide-check' : 'i-lucide-copy'"
              size="xs"
              color="neutral"
              variant="ghost"
              title="复制路径"
              @click="copyFilePath(memoryFilePath, 'memory')"
            />
            <UButton
              icon="i-lucide-folder-open"
              size="xs"
              color="neutral"
              variant="ghost"
              title="在文件管理器中打开"
              @click="openInFileManager(memoryFilePath)"
            />
          </div>

          <div
            v-if="memoryLoading"
            class="flex items-center justify-center py-10"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
            <span class="ml-2 text-sm text-[var(--text-secondary)]">加载中...</span>
          </div>
          <div
            v-else-if="memoryContent"
            class="markdown-body"
            v-html="renderMarkdown(memoryContent)"
          />
          <div
            v-else
            class="text-center py-10 text-sm text-[var(--text-secondary)]"
          >
            未找到项目记忆文件
          </div>
        </div>
      </template>
    </USlideover>

    <!-- 调试日志抽屉（加宽至 80vw，与子代理抽屉一致） -->
    <USlideover
      :open="showDebugLog"
      title="调试日志"
      :description="debugFilePath ? `${debugFilePath}${debugFileSize > 0 ? ` (${(debugFileSize / 1024).toFixed(1)} KB)` : ''}` : ''"
      class="w-[80vw] max-w-4xl"
      @update:open="showDebugLog = $event"
    >
      <template #body>
        <div class="p-4">
          <!-- 文件路径操作栏：仅在加载完成且有路径时显示 -->
          <div
            v-if="debugFilePath"
            class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)]"
          >
            <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-[var(--text-secondary)]" />
            <code class="flex-1 text-xs text-[var(--text-secondary)] truncate select-all" :title="debugFilePath">{{ debugFilePath }}</code>
            <UButton
              :icon="copiedId === 'debug' ? 'i-lucide-check' : 'i-lucide-copy'"
              size="xs"
              color="neutral"
              variant="ghost"
              title="复制路径"
              @click="copyFilePath(debugFilePath, 'debug')"
            />
            <UButton
              icon="i-lucide-folder-open"
              size="xs"
              color="neutral"
              variant="ghost"
              title="在文件管理器中打开"
              @click="openInFileManager(debugFilePath)"
            />
          </div>

          <div
            v-if="debugLoading"
            class="flex items-center justify-center py-10"
          >
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-primary" />
            <span class="ml-2 text-sm text-[var(--text-secondary)]">加载中...</span>
          </div>
          <template v-else-if="debugContent">
            <div v-if="debugTruncated" class="mb-3 text-xs text-[var(--color-warning-text)]">
              日志内容已截断（仅显示前 100KB）
            </div>
            <pre class="code-block text-xs max-h-[80vh] overflow-auto whitespace-pre-wrap">{{ debugContent }}</pre>
          </template>
          <div
            v-else
            class="text-center py-10 text-sm text-[var(--text-secondary)]"
          >
            未找到调试日志文件
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
