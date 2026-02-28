<!--
  MessageBubble - 用户/助手消息气泡卡片组件

  用途：
    通用的消息展示卡片，支持用户消息和助手文本消息两种角色。
    功能包括：
    - 可折叠/展开的卡片头部（显示角色图标、角色名称、折叠预览）
    - 头部嵌入 RecordMetadata 弹窗（仅用户消息有 record 时显示）
    - Markdown 内容自动检测和渲染（含代码高亮）
    - 纯文本的 whitespace-pre-wrap 展示
    - 用户上传图片的缩略图展示和大图预览

  Props：
    - role: 'user' | 'assistant' — 消息角色，决定卡片颜色主题和对齐方向
    - record?: UserRecord         — 用户记录对象（用户消息时传入，包含完整 message 内容和元数据）
    - text?: string               — 纯文本内容（助手文本块时直接传入文本）

  使用场景：
    在 ConversationView.vue 中：
    - 用户消息：传入 role="user" 和 :record="turn.userMessage"
    - 助手文本：传入 role="assistant" 和 :text="block.text"
-->
<script setup lang="ts">
import type { UserRecord, UserImageContent } from '~/types/records'

const props = defineProps<{
  role: 'user' | 'assistant'
  record?: UserRecord
  text?: string
}>()

/**
 * 提取消息文本内容：
 * - 如果直接传入了 text prop，优先使用
 * - 如果 record.message.content 是字符串，直接返回
 * - 如果是数组（多模态内容），提取所有 type="text" 的部分拼接
 */
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

/** 判断消息文本是否包含 Markdown 语法（标题、列表、粗体、代码块、链接等） */
const isMarkdown = computed(() => hasMarkdown(messageText.value))

/** 将 Markdown 文本渲染为 HTML（经 DOMPurify 消毒处理），非 Markdown 时返回空字符串 */
const renderedHtml = computed(() => {
  if (!isMarkdown.value) return ''
  return renderMarkdown(messageText.value)
})

/** 从用户消息的多模态内容数组中提取所有 type="image" 的图片项 */
const images = computed(() => {
  if (!props.record) return []
  const content = props.record.message.content
  if (typeof content === 'string') return []

  return content.filter(b => b.type === 'image') as UserImageContent[]
})

const { open: openPreview } = useImagePreview()

const expanded = ref(true)

/** 内容摘要（折叠时显示）：取消息文本的第一行，超过 80 字符截断并加省略号 */
const preview = computed(() => {
  const text = messageText.value
  if (!text) return ''
  const first = text.split('\n')[0] ?? ''
  return first.length > 80 ? first.slice(0, 80) + '...' : first
})

/**
 * Markdown 渲染内容中的事件委托处理器：
 * 当用户点击渲染后的 <img> 标签时，打开图片大图预览
 */
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
      <!-- 记录元数据弹窗 -->
      <ConversationRecordMetadata
        v-if="record"
        :record="record"
      />
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
