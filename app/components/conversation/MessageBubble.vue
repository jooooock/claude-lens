<script setup lang="ts">
import type { UserRecord, UserImageContent } from '~/types/records'

const props = defineProps<{
  role: 'user' | 'assistant'
  record?: UserRecord
  text?: string
}>()

// 提取用户消息文本
const messageText = computed(() => {
  if (props.text) return props.text
  if (!props.record) return ''

  const content = props.record.message.content
  if (typeof content === 'string') return content

  // 数组内容：提取文本部分
  return content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text', text: string }).text)
    .join('\n')
})

// 判断是否需要 markdown 渲染
const isMarkdown = computed(() => hasMarkdown(messageText.value))

// 渲染后的 HTML
const renderedHtml = computed(() => {
  if (!isMarkdown.value) return ''
  return renderMarkdown(messageText.value)
})

// 提取图片内容
const images = computed(() => {
  if (!props.record) return []
  const content = props.record.message.content
  if (typeof content === 'string') return []

  return content.filter(b => b.type === 'image') as UserImageContent[]
})

const { open: openPreview } = useImagePreview()

const expanded = ref(true)

// 内容摘要（折叠时显示）
const preview = computed(() => {
  const text = messageText.value
  if (!text) return ''
  const first = text.split('\n')[0] ?? ''
  return first.length > 80 ? first.slice(0, 80) + '...' : first
})

// Markdown 内容中的 <img> 点击事件委托
function onMarkdownClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    const src = (target as HTMLImageElement).src
    if (src) openPreview(src)
  }
}
</script>

<template>
  <div
    class="card-style overflow-hidden"
    :class="[role === 'user' ? 'card-user' : 'card-assistant']"
  >
    <!-- 卡片头部 -->
    <button
      class="w-full flex items-center gap-2 px-5 py-2.5 transition-all duration-300"
      :class="role === 'user' ? 'bg-[var(--color-user-bg)] hover:bg-[var(--color-user-bg-hover)]' : 'bg-[var(--color-assistant-bg)] hover:bg-[var(--color-assistant-bg-hover)]'"
      @click="expanded = !expanded"
    >
      <UIcon
        :name="role === 'user' ? 'i-lucide-user' : 'i-lucide-bot'"
        class="size-5"
        :class="role === 'user' ? 'text-[var(--color-user)]' : 'text-[var(--color-assistant)]'"
      />
      <span
        class="text-sm font-semibold"
        :class="role === 'user' ? 'text-[var(--color-user)]' : 'text-[var(--color-assistant)]'"
      >
        {{ role === 'user' ? '用户 User' : '助手 Assistant' }}
      </span>
      <span
        v-if="!expanded && preview"
        class="text-xs text-[var(--text-secondary)] truncate max-w-md"
      >{{ preview }}</span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-3 ml-auto shrink-0 text-[var(--text-secondary)]"
      />
    </button>

    <!-- 卡片主体 -->
    <div
      v-if="expanded"
      class="px-5 py-4 border-t border-[var(--card-border)]"
    >
      <!-- 图片 -->
      <div
        v-if="images.length"
        class="mb-3 flex flex-wrap gap-2"
      >
        <img
          v-for="(img, i) in images"
          :key="i"
          :src="`data:${img.source.media_type};base64,${img.source.data}`"
          class="max-w-sm rounded-md border border-default cursor-pointer transition-opacity hover:opacity-80"
          alt="uploaded image"
          @click="openPreview(`data:${img.source.media_type};base64,${img.source.data}`)"
        >
      </div>

      <!-- Markdown 渲染 -->
      <div
        v-if="isMarkdown"
        class="markdown-body"
        @click="onMarkdownClick"
        v-html="renderedHtml"
      />

      <!-- 纯文本 -->
      <div
        v-else
        class="body-text whitespace-pre-wrap break-words"
      >
        {{ messageText }}
      </div>
    </div>
  </div>
</template>
