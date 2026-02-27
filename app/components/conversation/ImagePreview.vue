<script setup lang="ts">
const { src, isOpen, close } = useImagePreview()

// 变换状态
const scale = ref(1)
const rotate = ref(0)
const translateX = ref(0)
const translateY = ref(0)

// 拖拽状态
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartTX = 0
let dragStartTY = 0

// 图片区域容器 ref（用于计算光标相对位置）
const containerEl = ref<HTMLElement>()

const imageStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotate.value}deg)`,
  cursor: isDragging ? 'grabbing' : 'grab',
  // 拖拽时禁用过渡，避免延迟感
  transition: isDragging ? 'none' : 'transform 0.15s ease'
}))

// 重置变换
function reset() {
  scale.value = 1
  rotate.value = 0
  translateX.value = 0
  translateY.value = 0
}

// 打开时重置
watch(isOpen, (val) => {
  if (val) {
    reset()
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

// 以指定屏幕坐标为中心缩放
// transform: translate(tx,ty) scale(s) rotate(r)
// 屏幕坐标 = 图像坐标 * s + tx  →  调整 tx 使光标下的点不动
function zoomAt(newScale: number, clientX: number, clientY: number) {
  const container = containerEl.value
  if (!container) {
    scale.value = newScale
    return
  }
  const rect = container.getBoundingClientRect()
  // 光标相对容器中心的位置
  const mx = clientX - (rect.left + rect.width / 2)
  const my = clientY - (rect.top + rect.height / 2)

  const ratio = newScale / scale.value
  translateX.value = mx * (1 - ratio) + translateX.value * ratio
  translateY.value = my * (1 - ratio) + translateY.value * ratio
  scale.value = newScale
}

// 工具栏缩放（以视口中心为原点）
function zoomIn() {
  const s = Math.min(5, scale.value * 1.3)
  // 工具栏按钮无光标信息，以容器中心为原点（mx=0, my=0）
  const ratio = s / scale.value
  translateX.value *= ratio
  translateY.value *= ratio
  scale.value = s
}

function zoomOut() {
  const s = Math.max(0.2, scale.value / 1.3)
  const ratio = s / scale.value
  translateX.value *= ratio
  translateY.value *= ratio
  scale.value = s
}

// 旋转
function rotateLeft() {
  rotate.value -= 90
}

function rotateRight() {
  rotate.value += 90
}

// 滚轮缩放（以光标为原点）
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const newScale = e.deltaY < 0
    ? Math.min(5, scale.value * 1.2)
    : Math.max(0.2, scale.value / 1.2)
  zoomAt(newScale, e.clientX, e.clientY)
}

// 拖拽
function onPointerDown(e: PointerEvent) {
  isDragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartTX = translateX.value
  dragStartTY = translateY.value
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging) return
  // translate 在 scale 之前应用，1px 偏移 = 1px 屏幕移动
  translateX.value = dragStartTX + (e.clientX - dragStartX)
  translateY.value = dragStartTY + (e.clientY - dragStartY)
}

function onPointerUp() {
  isDragging = false
}

// 键盘快捷键
function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'Escape':
      close()
      break
    case '=':
    case '+':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case 'r':
      rotateRight()
      break
    case '0':
      reset()
      break
  }
}

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex flex-col"
      >
        <!-- 遮罩层 -->
        <div
          class="absolute inset-0 bg-black/80"
          @click="close"
        />

        <!-- 工具栏 -->
        <div class="relative z-10 flex items-center justify-center gap-1 py-2">
          <button
            class="toolbar-btn"
            title="缩小 (-)"
            @click="zoomOut"
          >
            <UIcon
              name="i-lucide-zoom-out"
              class="size-4"
            />
          </button>
          <span class="text-white/70 text-xs min-w-[3.5rem] text-center select-none">{{ Math.round(scale * 100) }}%</span>
          <button
            class="toolbar-btn"
            title="放大 (+)"
            @click="zoomIn"
          >
            <UIcon
              name="i-lucide-zoom-in"
              class="size-4"
            />
          </button>
          <div class="w-px h-4 bg-white/20 mx-1" />
          <button
            class="toolbar-btn"
            title="左旋 90°"
            @click="rotateLeft"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="size-4"
            />
          </button>
          <button
            class="toolbar-btn"
            title="右旋 90° (R)"
            @click="rotateRight"
          >
            <UIcon
              name="i-lucide-rotate-cw"
              class="size-4"
            />
          </button>
          <div class="w-px h-4 bg-white/20 mx-1" />
          <button
            class="toolbar-btn"
            title="重置 (0)"
            @click="reset"
          >
            <UIcon
              name="i-lucide-maximize"
              class="size-4"
            />
          </button>
          <button
            class="toolbar-btn"
            title="关闭 (Esc)"
            @click="close"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4"
            />
          </button>
        </div>

        <!-- 图片区域 -->
        <div
          ref="containerEl"
          class="relative z-0 flex-1 flex items-center justify-center overflow-hidden"
          @click.self="close"
          @wheel.prevent="onWheel"
        >
          <img
            :src="src"
            :style="imageStyle"
            class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
            alt="preview"
            draggable="false"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @click.stop
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.15s;
}
.toolbar-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}
</style>
