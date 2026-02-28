<!--
  SessionStatsBar - 会话统计面板组件

  用途：
    在会话详情页顶部展示当前会话的汇总统计信息，以网格布局排列多个统计卡片。
    统计项包括：输入/输出 Token 用量、缓存命中率、使用的模型、对话轮次/总耗时、
    工具调用次数、API 错误数（仅错误 > 0 时显示）、Claude Code 版本号。

  Props：
    - stats: SessionStats    — 会话统计数据对象，由 useSessionStats composable 计算得出
    - collapsed: boolean     — 是否折叠统计面板（折叠时整个面板隐藏）

  Emits：
    - toggle — 通知父组件切换面板的折叠/展开状态

  使用场景：
    嵌入在 session/[project]/[sessionId].vue 页面的工具栏下方，
    通过 showStats 状态控制折叠/展开。
-->
<script setup lang="ts">
import type { SessionStats } from '~/types/api'

/** @property {SessionStats} stats - 会话统计数据对象，包含 Token 用量、模型列表、工具调用数等汇总信息 */
/** @property {boolean} collapsed - 是否折叠统计面板，为 true 时隐藏整个面板内容 */
defineProps<{
  stats: SessionStats
  collapsed: boolean
}>()

/** 触发折叠/展开切换事件，由父组件监听并更新 showStats 状态 */
defineEmits<{
  toggle: []
}>()

/** 格式化 token 数量：大于 1000 用 k，大于 100 万用 M */
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/** 格式化毫秒为可读时间 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m${secs}s`
}
</script>

<template>
  <div
    v-if="!collapsed"
    class="border-b border-[var(--card-border)] bg-[var(--card-bg)]/60 backdrop-blur-sm"
  >
    <div class="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
      <!-- 输入 Token -->
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-arrow-down-to-line"
          class="size-3.5 text-[var(--color-info-text)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            输入 Token
          </div>
          <div class="font-semibold">
            {{ formatTokens(stats.totalInputTokens) }}
          </div>
        </div>
      </div>

      <!-- 输出 Token -->
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-arrow-up-from-line"
          class="size-3.5 text-[var(--color-assistant)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            输出 Token
          </div>
          <div class="font-semibold">
            {{ formatTokens(stats.totalOutputTokens) }}
          </div>
        </div>
      </div>

      <!-- 缓存命中率 -->
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-database"
          class="size-3.5 text-[var(--color-warning-text)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            缓存命中
          </div>
          <div class="font-semibold">
            {{ stats.cacheHitRate.toFixed(1) }}%
            <span class="text-[var(--text-secondary)] font-normal ml-1">
              ({{ formatTokens(stats.totalCacheReadTokens) }})
            </span>
          </div>
        </div>
      </div>

      <!-- 模型 -->
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-brain"
          class="size-3.5 text-[var(--primary-color)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            模型
          </div>
          <div class="font-semibold truncate max-w-32">
            {{ stats.modelsUsed.map(m => m.replace('claude-', '')).join(', ') || '-' }}
          </div>
        </div>
      </div>

      <!-- Turn 数 / 耗时 -->
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-message-square"
          class="size-3.5 text-[var(--color-user)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            对话
          </div>
          <div class="font-semibold">
            {{ stats.turnCount }} turns
            <span
              v-if="stats.totalDurationMs > 0"
              class="text-[var(--text-secondary)] font-normal ml-1"
            >
              / {{ formatDuration(stats.totalDurationMs) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 工具调用 -->
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-wrench"
          class="size-3.5 text-[var(--color-tool)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            工具调用
          </div>
          <div class="font-semibold">
            {{ stats.totalToolCalls }}
          </div>
        </div>
      </div>

      <!-- API 错误 -->
      <div
        v-if="stats.apiErrorCount > 0"
        class="flex items-center gap-2"
      >
        <UIcon
          name="i-lucide-alert-triangle"
          class="size-3.5 text-[var(--color-error-text)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            API 错误
          </div>
          <div class="font-semibold text-[var(--color-error-text)]">
            {{ stats.apiErrorCount }}
          </div>
        </div>
      </div>

      <!-- 版本 -->
      <div
        v-if="stats.claudeCodeVersion"
        class="flex items-center gap-2"
      >
        <UIcon
          name="i-lucide-tag"
          class="size-3.5 text-[var(--text-secondary)]"
        />
        <div>
          <div class="text-[var(--text-secondary)]">
            版本
          </div>
          <div class="font-semibold">
            v{{ stats.claudeCodeVersion }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
