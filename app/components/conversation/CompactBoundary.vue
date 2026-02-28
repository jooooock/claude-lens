<script setup lang="ts">
/**
 * CompactBoundary — 上下文压缩分隔线组件
 *
 * 渲染 compact_boundary 系统记录，展示：
 * 1. 琥珀色虚线分隔线 + 剪刀图标 + "上下文已压缩" 标题
 * 2. 元数据徽章：触发方式（auto/manual）、压缩前 token 数、时间戳
 * 3. 可展开的压缩摘要内容区域（来自 isCompactSummary 用户记录）
 */
import { format } from 'date-fns'
import type { SystemRecord, CompactBoundaryRecord } from '~/types/records'

const props = defineProps<{
  record: SystemRecord
  /** 压缩后保留的上下文摘要文本（来自 isCompactSummary 用户记录） */
  summary?: string
}>()

/** 类型守卫：确认是 compact_boundary 记录 */
const isCompactBoundary = computed(() => {
  return 'subtype' in props.record && props.record.subtype === 'compact_boundary'
})

/** 提取 compactMetadata 中的压缩前 token 数 */
const preTokens = computed(() => {
  if (!isCompactBoundary.value) return 0
  return (props.record as CompactBoundaryRecord).compactMetadata?.preTokens || 0
})

/** 提取触发方式：auto（自动）或 manual（手动 /compact 命令） */
const trigger = computed(() => {
  if (!isCompactBoundary.value) return 'auto'
  return (props.record as CompactBoundaryRecord).compactMetadata?.trigger || 'auto'
})

/** 格式化时间戳为 HH:mm:ss */
const formattedTime = computed(() => {
  try {
    return format(new Date(props.record.timestamp), 'HH:mm:ss')
  } catch {
    return ''
  }
})

/** 摘要区域展开/折叠状态 */
const expanded = ref(false)

/** 将 token 数格式化为可读形式（如 168858 → "168.9k"） */
function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** 使用 Markdown 渲染摘要文本 */
const renderedSummary = computed(() => {
  if (!props.summary) return ''
  return renderMarkdown(props.summary)
})
</script>

<template>
  <div
    v-if="isCompactBoundary"
    class="my-2"
  >
    <!-- 分隔线 + 徽章区域 -->
    <div class="flex items-center gap-3 py-4">
      <!-- 左侧虚线 -->
      <div class="flex-1 border-t-2 border-dashed border-[var(--color-warning)]" />

      <!-- 中央徽章 -->
      <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
        <UIcon
          name="i-lucide-scissors"
          class="size-4 text-[var(--color-warning)]"
        />
        <span class="text-sm font-semibold text-[var(--color-warning-text)]">
          上下文已压缩 Context Compacted
        </span>
        <!-- 触发方式徽章 -->
        <UBadge
          :color="trigger === 'manual' ? 'primary' : 'neutral'"
          variant="subtle"
          size="sm"
        >
          {{ trigger === 'manual' ? '手动' : '自动' }}
        </UBadge>
        <!-- token 数 -->
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ formatTokens(preTokens) }} tokens
        </UBadge>
        <!-- 时间戳 -->
        <span
          v-if="formattedTime"
          class="text-xs text-[var(--color-warning-text)]/60"
        >
          {{ formattedTime }}
        </span>
      </div>

      <!-- 右侧虚线 -->
      <div class="flex-1 border-t-2 border-dashed border-[var(--color-warning)]" />
    </div>

    <!-- 可展开的摘要区域 -->
    <div
      v-if="summary"
      class="mx-auto max-w-3xl"
    >
      <!-- 展开/折叠按钮 -->
      <button
        class="flex items-center gap-1.5 text-xs text-[var(--color-warning-text)]/70 hover:text-[var(--color-warning-text)] cursor-pointer transition-colors mx-auto"
        @click="expanded = !expanded"
      >
        <UIcon
          :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-3.5"
        />
        {{ expanded ? '收起压缩摘要' : '查看压缩摘要' }}
      </button>

      <!-- 摘要内容 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[2000px]"
        leave-from-class="opacity-100 max-h-[2000px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div
          v-if="expanded"
          class="mt-3 rounded-lg border border-[var(--color-warning-border)]/50 bg-[var(--color-warning-bg)]/30 overflow-hidden"
        >
          <!-- 摘要头部标签 -->
          <div class="px-4 py-2 border-b border-[var(--color-warning-border)]/30 flex items-center gap-2">
            <UIcon
              name="i-lucide-file-text"
              class="size-3.5 text-[var(--color-warning-text)]/60"
            />
            <span class="text-xs font-medium text-[var(--color-warning-text)]/60">
              压缩摘要 Compacted Summary
            </span>
          </div>
          <!-- 摘要正文：Markdown 渲染 -->
          <div
            class="px-4 py-3 text-sm leading-relaxed markdown-body max-h-[500px] overflow-y-auto"
            v-html="renderedSummary"
          />
        </div>
      </Transition>
    </div>
  </div>
</template>
