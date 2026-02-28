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

/**
 * 检测用户消息是否为斜杠命令（如 /insights, /compact 等）。
 * Claude Code 的斜杠命令在 JSONL 中以 XML 格式存储：
 *   <command-message>insights</command-message>\n<command-name>/insights</command-name>
 * 返回解析出的命令名（如 "/insights"），若不是命令消息则返回 null。
 *
 * 严格检查：移除所有已知命令 XML 标签后，剩余内容必须为空。
 * 这避免了用户粘贴的包含命令 XML 的普通文本被误匹配。
 */
const commandName = computed<string | null>(() => {
  if (props.role !== 'user') return null
  const text = messageText.value
  if (!text) return null
  // 严格检查：移除所有已知命令 XML 标签后，剩余内容必须为空
  const stripped = text
    .replace(/<command-name>[^<]*<\/command-name>/g, '')
    .replace(/<command-message>[^<]*<\/command-message>/g, '')
    .replace(/<command-args>[^<]*<\/command-args>/g, '')
    .trim()
  if (stripped) return null
  const match = text.match(/<command-name>\s*(\/[^<]+?)\s*<\/command-name>/)
  return match ? match[1]!.trim() : null
})

/**
 * 检测用户消息是否为本地命令输出（Hook 或脚本的执行结果）。
 * Claude Code 的本地命令输出在 JSONL 中以 XML 格式存储：
 *   <local-command-stdout>Goodbye!</local-command-stdout>
 *   <local-command-stderr>error message</local-command-stderr>
 * 返回解析出的 stdout/stderr 内容，若不是本地命令输出则返回 null。
 *
 * 严格检查：移除所有 stdout/stderr XML 标签后，剩余内容必须为空。
 * 这避免了用户粘贴的包含这些 XML 标签的普通文本（如 JSON 文本）被误匹配。
 */
const localCommandOutput = computed<{ stdout?: string, stderr?: string } | null>(() => {
  if (props.role !== 'user') return null
  const text = messageText.value
  if (!text) return null
  // 严格检查：移除所有 stdout/stderr/caveat XML 标签后，剩余内容必须为空
  const stripped = text
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .replace(/<local-command-stderr>[\s\S]*?<\/local-command-stderr>/g, '')
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .trim()
  if (stripped) return null
  const stdoutMatch = text.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)
  const stderrMatch = text.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)
  if (!stdoutMatch && !stderrMatch) return null
  return {
    stdout: stdoutMatch?.[1] || undefined,
    stderr: stderrMatch?.[1] || undefined
  }
})

/**
 * 从本地命令输出中提取 caveat（注意事项）标签内容。
 * Claude Code 的本地命令输出中可能包含 caveat 信息：
 *   <local-command-caveat>注意事项文本</local-command-caveat>
 * 仅在 localCommandOutput 已匹配时才解析（共享同一条记录）。
 */
const localCommandCaveat = computed<string | null>(() => {
  // 仅在 localCommandOutput 匹配时提取 caveat（同一条本地命令记录）
  if (!localCommandOutput.value) return null
  const text = messageText.value
  if (!text) return null
  const match = text.match(/<local-command-caveat>([\s\S]*?)<\/local-command-caveat>/)
  return match ? match[1]!.trim() : null
})

/**
 * 检测用户消息是否为后台任务通知。
 * Claude Code 的后台任务完成通知在 JSONL 中以 XML 格式存储：
 *   <task-notification>
 *     <task-id>beba7b9</task-id>
 *     <status>completed</status>
 *     <summary>Background command ... completed (exit code 0)</summary>
 *   </task-notification>
 * 返回解析出的 taskId、status、summary，若不是任务通知则返回 null。
 *
 * 注意：真实的 task-notification 记录中，标签后面可能有系统注入的尾部文字
 * （如 "Read the output file..."），因此不能用"移除标签后为空"的严格检查。
 * 改为检查内容以 <task-notification 开头，排除用户粘贴 JSON 包裹 XML 的情况。
 */
const taskNotification = computed<{ taskId: string, status: string, summary: string } | null>(() => {
  if (props.role !== 'user') return null
  const text = messageText.value
  if (!text) return null
  // 严格检查：内容必须以 <task-notification 开头（排除 JSON 等包裹的情况）
  if (!/^\s*<task-notification[\s>]/.test(text)) return null
  const match = text.match(/<task-notification>([\s\S]*?)<\/task-notification>/)
  if (!match) return null
  const inner = match[1]!
  const taskId = inner.match(/<task-id>([\s\S]*?)<\/task-id>/)?.[1]?.trim() || ''
  const status = inner.match(/<status>([\s\S]*?)<\/status>/)?.[1]?.trim() || ''
  const summary = inner.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || ''
  return { taskId, status, summary }
})

/** 内容摘要（折叠时显示）：命令消息显示命令名，本地命令输出显示截断的输出，普通消息取第一行 */
const preview = computed(() => {
  if (commandName.value) return commandName.value
  if (localCommandOutput.value) {
    const out = localCommandOutput.value.stdout || localCommandOutput.value.stderr || ''
    return out.length > 60 ? out.slice(0, 60) + '...' : out
  }
  if (taskNotification.value) {
    return taskNotification.value.summary || `Task ${taskNotification.value.taskId}`
  }
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
      <!-- 斜杠命令：渲染为样式化的命令徽章，而非显示原始 XML 标签 -->
      <div
        v-if="commandName"
        class="flex items-center gap-2"
      >
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--secondary-bg)] border border-[var(--card-border)]">
          <UIcon
            name="i-lucide-terminal"
            class="size-4 text-primary"
          />
          <span class="text-sm font-mono font-semibold text-primary">{{ commandName }}</span>
        </span>
      </div>

      <!-- 本地命令输出：终端风格渲染 stdout/stderr/caveat -->
      <div
        v-else-if="localCommandOutput"
        class="space-y-2"
      >
        <!-- stdout 输出 -->
        <div
          v-if="localCommandOutput.stdout"
          class="flex items-start gap-2"
        >
          <UIcon
            name="i-lucide-terminal"
            class="size-3.5 mt-1 shrink-0 text-green-500"
          />
          <pre class="code-block flex-1 text-xs max-h-64 overflow-y-auto">{{ localCommandOutput.stdout }}</pre>
        </div>
        <!-- stderr 输出 -->
        <div
          v-if="localCommandOutput.stderr"
          class="flex items-start gap-2"
        >
          <UIcon
            name="i-lucide-circle-x"
            class="size-3.5 mt-1 shrink-0 text-[var(--color-error-text)]"
          />
          <pre class="code-block flex-1 text-xs max-h-64 overflow-y-auto border-l-2 border-[var(--color-error-border)]">{{ localCommandOutput.stderr }}</pre>
        </div>
        <!-- caveat 注意事项（淡化的系统提示） -->
        <div
          v-if="localCommandCaveat"
          class="flex items-start gap-2 mt-1"
        >
          <UIcon
            name="i-lucide-info"
            class="size-3.5 mt-0.5 shrink-0 text-[var(--text-secondary)]"
          />
          <span class="text-xs text-[var(--text-secondary)] italic">{{ localCommandCaveat }}</span>
        </div>
      </div>

      <!-- 普通消息内容：图片、任务通知、文字可同时显示（非互斥） -->
      <template v-else>
        <!-- 图片 -->
        <div
          v-if="images.length"
          class="flex flex-wrap gap-2"
          :class="{ 'mb-3': messageText || taskNotification }"
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

        <!-- 后台任务通知：样式化卡片展示任务状态和摘要 -->
        <div
          v-if="taskNotification"
          class="flex items-start gap-3"
        >
          <!-- 状态图标 -->
          <UIcon
            :name="taskNotification.status === 'completed' ? 'i-lucide-circle-check' : taskNotification.status === 'failed' ? 'i-lucide-circle-x' : 'i-lucide-loader-2'"
            class="size-4 mt-0.5 shrink-0"
            :class="[
              taskNotification.status === 'completed' ? 'text-green-500' : '',
              taskNotification.status === 'failed' ? 'text-[var(--color-error-text)]' : '',
              taskNotification.status !== 'completed' && taskNotification.status !== 'failed' ? 'text-[var(--color-warning-text)] animate-spin' : ''
            ]"
          />
          <div class="flex-1 min-w-0">
            <!-- 状态徽章 + 任务 ID -->
            <div class="flex items-center gap-2 mb-1">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="[
                  taskNotification.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : '',
                  taskNotification.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : '',
                  taskNotification.status !== 'completed' && taskNotification.status !== 'failed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''
                ]"
              >
                {{ taskNotification.status }}
              </span>
              <span class="text-xs font-mono text-[var(--text-secondary)]">
                {{ taskNotification.taskId }}
              </span>
            </div>
            <!-- 摘要 -->
            <p
              v-if="taskNotification.summary"
              class="text-sm text-[var(--text-primary)]"
            >
              {{ taskNotification.summary }}
            </p>
          </div>
        </div>

        <!-- Markdown 渲染（与 taskNotification 互斥，但与图片可共存） -->
        <div
          v-else-if="isMarkdown"
          class="markdown-body"
          @click="onMarkdownClick"
          v-html="renderedHtml"
        />

        <!-- 纯文本（仅当有文本且非 Markdown、非 taskNotification 时） -->
        <div
          v-else-if="messageText"
          class="body-text whitespace-pre-wrap break-words"
        >
          {{ messageText }}
        </div>
      </template>
    </div>
  </div>
</template>
