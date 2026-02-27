<script setup lang="ts">
import type { ConversationTurn } from '~/types/api'

interface MinimapBlock {
  kind: 'user' | 'assistant' | 'system'
  turnIndex: number
  weight: number
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
      result.push({ kind: 'system', turnIndex: i, weight: 4 })
    }
    // 2. 用户消息 → 蓝色块
    if (turn.userMessage) {
      const content = turn.userMessage.message.content
      const len = typeof content === 'string' ? content.length : JSON.stringify(content).length
      result.push({ kind: 'user', turnIndex: i, weight: calcHeight(len) })
    }
    // 3. 助手响应 → 合并所有 text block 为一个绿色块
    const textBlocks = turn.assistantBlocks.filter(b => b.kind === 'text')
    if (textBlocks.length > 0) {
      const totalLen = textBlocks.reduce((sum, b) => sum + (b as { kind: 'text', text: string }).text.length, 0)
      result.push({ kind: 'assistant', turnIndex: i, weight: calcHeight(totalLen) })
    }
  })
  return result
})

// 布局常量
const DEFAULT_GAP = 3
const MIN_BLOCK_HEIGHT = 1
const MIN_GAP = 0.5
const PADDING = 6 // p-1.5 = 6px 上下各 3px

// 鱼眼放大常量
const MAGNIFICATION = 12 // 鼠标处的峰值放大倍数
const SIGMA = 60 // 高斯扩散半径（px），控制放大影响范围

// minimap 外层容器 ref（用于指示器定位）
const containerEl = ref<HTMLElement>()
// minimap 色块容器 ref
const minimapEl = ref<HTMLElement>()

// 容器可见高度（响应式）
const containerHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

// 鼠标悬浮状态
const isHovering = ref(false)
const hoverY = ref(0)

// 过渡动画控制：仅在鼠标进入/离开时短暂启用，移动过程中禁用
const enableTransition = ref(false)
let transitionTimer: ReturnType<typeof setTimeout> | null = null

function setTransitionBriefly() {
  enableTransition.value = true
  if (transitionTimer) clearTimeout(transitionTimer)
  transitionTimer = setTimeout(() => {
    enableTransition.value = false
  }, 200)
}

// mousemove rAF 节流 + 容器 rect 缓存
let moveRafId = 0
let cachedRect: DOMRect | null = null

// 基础布局：根据容器高度按比例分配色块像素高度和 gap
const layout = computed(() => {
  const count = blocks.value.length
  if (count === 0) return { blockHeights: [] as number[], gap: DEFAULT_GAP, compressed: false }

  const availableHeight = containerHeight.value - PADDING * 2
  if (availableHeight <= 0) return { blockHeights: blocks.value.map(b => b.weight), gap: DEFAULT_GAP, compressed: false }

  const totalWeight = blocks.value.reduce((sum, b) => sum + b.weight, 0)
  const gapCount = count - 1
  const naturalTotal = totalWeight + gapCount * DEFAULT_GAP

  // 不需要压缩：直接用原始 weight 作为像素高度
  if (naturalTotal <= availableHeight) {
    return { blockHeights: blocks.value.map(b => b.weight), gap: DEFAULT_GAP, compressed: false }
  }

  // 需要压缩：色块和 gap 按比例同步缩放
  const scale = availableHeight / naturalTotal
  let gap = Math.max(MIN_GAP, DEFAULT_GAP * scale)
  let blockSpace = availableHeight - gapCount * gap

  // 极端情况：色块最小高度都放不下
  if (blockSpace < count * MIN_BLOCK_HEIGHT) {
    const gapSpace = availableHeight - count * MIN_BLOCK_HEIGHT
    gap = (gapCount > 0 && gapSpace > gapCount * MIN_GAP)
      ? gapSpace / gapCount
      : MIN_GAP
    blockSpace = availableHeight - gapCount * gap
  }

  // 按 weight 比例分配 blockSpace
  const blockScale = blockSpace / totalWeight
  const blockHeights = blocks.value.map(b => Math.max(MIN_BLOCK_HEIGHT, b.weight * blockScale))

  // 修正：MIN_BLOCK_HEIGHT 下限可能导致总和超过 blockSpace，从 gap 中吸收
  const actualTotal = blockHeights.reduce((s, h) => s + h, 0)
  if (actualTotal > blockSpace && gapCount > 0) {
    const excess = actualTotal - blockSpace
    gap = Math.max(MIN_GAP, gap - excess / gapCount)
  }

  return { blockHeights, gap, compressed: true }
})

// 鱼眼布局：鼠标附近色块放大，远处色块压缩，总高度不变
const fisheyeLayout = computed(() => {
  const base = layout.value
  if (!isHovering.value || !base.compressed || base.blockHeights.length === 0) {
    return base
  }

  const count = base.blockHeights.length
  const gap = base.gap
  const twoSigmaSq = 2 * SIGMA * SIGMA

  // 计算每个 block 在基础布局中的中心 Y 坐标
  const centers: number[] = []
  let y = PADDING
  for (let i = 0; i < count; i++) {
    centers[i] = y + base.blockHeights[i]! / 2
    y += base.blockHeights[i]! + gap
  }

  // 高斯放大：鼠标附近的 block 获得更大的权重
  const focusFactors: number[] = []
  for (let i = 0; i < count; i++) {
    const dist = centers[i]! - hoverY.value
    focusFactors[i] = 1 + MAGNIFICATION * Math.exp(-(dist * dist) / twoSigmaSq)
  }

  // 用 focusFactor 调整权重，然后按比例分配总空间
  const effectiveWeights = blocks.value.map((b, i) => b.weight * focusFactors[i]!)
  const totalEffective = effectiveWeights.reduce((s, w) => s + w, 0)

  const availableHeight = containerHeight.value - PADDING * 2
  const gapCount = count - 1
  const blockSpace = availableHeight - gapCount * gap

  const blockHeights = effectiveWeights.map(w => Math.max(MIN_BLOCK_HEIGHT, (w / totalEffective) * blockSpace))

  return { blockHeights, gap, compressed: true }
})

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

// 鼠标事件
function onMouseEnter() {
  isHovering.value = true
  cachedRect = containerEl.value?.getBoundingClientRect() ?? null
  setTransitionBriefly()
}
function onMouseLeave() {
  isHovering.value = false
  cachedRect = null
  if (moveRafId) {
    cancelAnimationFrame(moveRafId)
    moveRafId = 0
  }
  setTransitionBriefly()
}
function onMouseMove(e: MouseEvent) {
  if (moveRafId) return
  const clientY = e.clientY
  moveRafId = requestAnimationFrame(() => {
    moveRafId = 0
    if (!cachedRect) return
    hoverY.value = clientY - cachedRect.top
  })
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

onMounted(() => {
  if (containerEl.value) {
    containerHeight.value = containerEl.value.clientHeight
    resizeObserver = new ResizeObserver((entries) => {
      containerHeight.value = entries[0]!.contentRect.height
    })
    resizeObserver.observe(containerEl.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  props.scrollContainer?.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div
    ref="containerEl"
    class="minimap shrink-0 w-12 border-l border-[var(--card-border)] bg-[var(--card-bg)] relative select-none overflow-hidden"
    @click.self="onMinimapClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
  >
    <!-- 色块容器 -->
    <div
      ref="minimapEl"
      class="flex flex-col p-1.5 relative z-10"
      :style="{ gap: `${fisheyeLayout.gap}px` }"
      @click.self="onMinimapClick"
    >
      <div
        v-for="(block, i) in blocks"
        :key="i"
        class="minimap-block rounded-[2px] cursor-pointer hover:opacity-70"
        :class="enableTransition ? 'transition-[height] duration-150 ease-out' : ''"
        :style="{
          backgroundColor: colorMap[block.kind],
          height: `${fisheyeLayout.blockHeights[i]}px`,
          minHeight: `${MIN_BLOCK_HEIGHT}px`
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
