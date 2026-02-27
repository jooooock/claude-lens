<script setup lang="ts">
import type { ConversationTurn } from '~/types/api'

interface MinimapBlock {
  kind: 'user' | 'assistant' | 'system'
  turnIndex: number
  height: number
}

const props = defineProps<{
  turns: ConversationTurn[]
  scrollContainer?: HTMLElement
}>()

// 色块颜色映射 — 使用 CSS 变量（运行时解析）
const colorMap: Record<MinimapBlock['kind'], string> = {
  user: 'var(--color-user)',
  assistant: 'var(--color-assistant)',
  system: 'var(--color-warning)'
}

// 对数缩放色块高度（更高的最小值和更大的缩放因子，提升可见性）
function calcHeight(textLength: number): number {
  if (textLength <= 0) return 6
  return Math.min(14, Math.max(6, Math.round(Math.log2(textLength / 10) * 3)))
}

// 以 turn 为单位生成 minimap 块（每个 turn 最多 3 个色块）
const blocks = computed<MinimapBlock[]>(() => {
  const result: MinimapBlock[] = []
  props.turns.forEach((turn, i) => {
    // 1. 仅 compact_boundary 系统事件 → 琥珀色块
    const hasCompact = turn.systemEvents.some(e => 'subtype' in e && e.subtype === 'compact_boundary')
    if (hasCompact) {
      result.push({ kind: 'system', turnIndex: i, height: 4 })
    }
    // 2. 用户消息 → 蓝色块
    if (turn.userMessage) {
      const content = turn.userMessage.message.content
      const len = typeof content === 'string' ? content.length : JSON.stringify(content).length
      result.push({ kind: 'user', turnIndex: i, height: calcHeight(len) })
    }
    // 3. 助手响应 → 合并所有 text block 为一个绿色块
    const textBlocks = turn.assistantBlocks.filter(b => b.kind === 'text')
    if (textBlocks.length > 0) {
      const totalLen = textBlocks.reduce((sum, b) => sum + (b as { kind: 'text', text: string }).text.length, 0)
      result.push({ kind: 'assistant', turnIndex: i, height: calcHeight(totalLen) })
    }
  })
  return result
})

// minimap 外层容器 ref（用于指示器定位）
const containerEl = ref<HTMLElement>()
// minimap 色块容器 ref
const minimapEl = ref<HTMLElement>()

// 视口指示器
const indicatorTop = ref(0)
const indicatorHeight = ref(30)

// 滚动同步（throttled）
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    updateIndicator()
    ticking = false
  })
}

// 获取指示器轨道高度：取容器可见高度和色块内容高度的较小值
// 避免指示器移到色块下方的空白区域
function getTrackHeight(): number {
  const container = containerEl.value
  const map = minimapEl.value
  if (!container || !map) return 0
  return Math.min(container.clientHeight, map.scrollHeight)
}

function updateIndicator() {
  const el = props.scrollContainer
  if (!el) return

  const trackHeight = getTrackHeight()
  if (trackHeight <= 0) return

  const scrollableHeight = el.scrollHeight - el.clientHeight
  if (scrollableHeight <= 0) {
    indicatorTop.value = 0
    indicatorHeight.value = trackHeight
    return
  }

  const viewportRatio = el.clientHeight / el.scrollHeight
  const scrollRatio = el.scrollTop / scrollableHeight

  indicatorHeight.value = Math.max(20, viewportRatio * trackHeight)
  indicatorTop.value = scrollRatio * (trackHeight - indicatorHeight.value)
}

// 点击色块跳转（根据类型定位到具体区域）
function jumpToBlock(block: MinimapBlock) {
  const selectorMap: Record<MinimapBlock['kind'], string> = {
    user: `[data-turn-user="${block.turnIndex}"]`,
    assistant: `[data-turn-assistant="${block.turnIndex}"]`,
    system: `[data-turn-index="${block.turnIndex}"]`
  }
  const target = document.querySelector(selectorMap[block.kind])
    || document.querySelector(`[data-turn-index="${block.turnIndex}"]`)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 拖拽视口指示器
let isDragging = false
let dragStartY = 0
let dragStartScrollTop = 0

function onDragStart(e: MouseEvent) {
  isDragging = true
  dragStartY = e.clientY
  dragStartScrollTop = props.scrollContainer?.scrollTop || 0
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  e.preventDefault()
}

function onDragMove(e: MouseEvent) {
  if (!isDragging || !props.scrollContainer) return

  const deltaY = e.clientY - dragStartY
  const trackHeight = getTrackHeight()
  if (trackHeight <= 0) return
  const scrollableHeight = props.scrollContainer.scrollHeight - props.scrollContainer.clientHeight
  const ratio = deltaY / trackHeight

  const el = props.scrollContainer
  el.scrollTop = dragStartScrollTop + ratio * scrollableHeight
}

function onDragEnd() {
  isDragging = false
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

// 点击 minimap 空白区域跳转
function onMinimapClick(e: MouseEvent) {
  const el = props.scrollContainer
  const container = containerEl.value
  if (!el || !container) return

  const rect = container.getBoundingClientRect()
  const clickY = e.clientY - rect.top
  const trackHeight = getTrackHeight()
  if (trackHeight <= 0) return
  const ratio = Math.min(1, clickY / trackHeight)
  const scrollableHeight = el.scrollHeight - el.clientHeight

  el.scrollTo({ top: ratio * scrollableHeight, behavior: 'smooth' })
}

// 监听滚动容器
watch(() => props.scrollContainer, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener('scroll', onScroll)
  if (el) {
    el.addEventListener('scroll', onScroll, { passive: true })
    nextTick(updateIndicator)
  }
}, { immediate: true })

// turns 变化时更新指示器
watch(() => props.turns.length, () => {
  nextTick(updateIndicator)
})

onUnmounted(() => {
  props.scrollContainer?.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div
    ref="containerEl"
    class="minimap shrink-0 w-12 border-l border-[var(--card-border)] bg-[var(--card-bg)] relative select-none overflow-hidden"
    @click.self="onMinimapClick"
  >
    <!-- 色块容器 -->
    <div
      ref="minimapEl"
      class="flex flex-col gap-[3px] p-1.5 relative z-10"
      @click.self="onMinimapClick"
    >
      <div
        v-for="(block, i) in blocks"
        :key="i"
        class="minimap-block rounded-[2px] cursor-pointer transition-opacity hover:opacity-70"
        :style="{
          backgroundColor: colorMap[block.kind],
          height: `${block.height}px`,
          minHeight: '2px'
        }"
        :title="block.kind"
        @click.stop="jumpToBlock(block)"
      />
    </div>

    <!-- 视口指示器 -->
    <div
      class="absolute left-0 w-full pointer-events-auto cursor-grab active:cursor-grabbing"
      :style="{
        top: `${indicatorTop}px`,
        height: `${indicatorHeight}px`,
        background: 'color-mix(in srgb, var(--color-user) 8%, transparent)',
        border: '1.5px solid color-mix(in srgb, var(--color-user) 25%, transparent)',
        borderRadius: '3px'
      }"
      @mousedown="onDragStart"
    />
  </div>
</template>
