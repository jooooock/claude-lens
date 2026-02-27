<script setup lang="ts">
import type { ToolUseContent, UserRecord } from '~/types/records'
import { isBashResult, isReadResult, isGrepResult, isGlobResult, isMcpResult } from '~/types/records'

const props = defineProps<{
  call: ToolUseContent
  result?: UserRecord
}>()

const expanded = ref(false)

// 工具名 -> 图标映射
const toolIcons: Record<string, string> = {
  Read: 'i-lucide-file-text',
  Edit: 'i-lucide-file-pen',
  Write: 'i-lucide-file-plus',
  Bash: 'i-lucide-terminal',
  Grep: 'i-lucide-search',
  Glob: 'i-lucide-folder-search',
  Task: 'i-lucide-git-branch',
  TodoWrite: 'i-lucide-list-checks',
  AskUserQuestion: 'i-lucide-message-circle-question',
  ExitPlanMode: 'i-lucide-clipboard-check',
  Skill: 'i-lucide-zap',
  EnterPlanMode: 'i-lucide-clipboard-list'
}

const icon = computed(() => {
  return toolIcons[props.call.name] || 'i-lucide-wrench'
})

// 工具调用摘要
const summary = computed(() => {
  const input = props.call.input
  if (!input) return ''

  switch (props.call.name) {
    case 'Read':
      return input.file_path as string || ''
    case 'Edit':
      return input.file_path as string || ''
    case 'Write':
      return input.file_path as string || ''
    case 'Bash':
      return (input.command as string || '').slice(0, 100)
    case 'Grep':
      return `${input.pattern || ''}`
    case 'Glob':
      return `${input.pattern || ''}`
    case 'Task':
      return (input.description as string || input.prompt as string || '').slice(0, 80)
    default:
      return ''
  }
})

// 高亮后的 JSON 输入
const highlightedInput = computed(() => {
  const jsonStr = JSON.stringify(props.call.input, null, 2)
  return highlightJson(jsonStr)
})

// 格式化工具结果
const resultText = computed(() => {
  if (!props.result?.toolUseResult) return ''

  const r = props.result.toolUseResult

  if (typeof r === 'string') return r

  if (isMcpResult(r)) {
    return r.map(item => item.text || JSON.stringify(item)).join('\n')
  }

  if (isBashResult(r)) {
    let text = ''
    if (r.stdout) text += r.stdout
    if (r.stderr) text += (text ? '\n' : '') + `[stderr] ${r.stderr}`
    return text
  }

  if (isReadResult(r)) {
    return typeof r.file === 'string' ? r.file : JSON.stringify(r.file, null, 2)
  }

  if (isGrepResult(r)) {
    return `${r.numFiles} files, ${r.numLines} lines\n${r.content}`
  }

  if (isGlobResult(r)) {
    return r.filenames.join('\n')
  }

  return JSON.stringify(r, null, 2)
})

// 高亮后的结果（如果是 JSON）
const isResultJson = computed(() => isJsonLike(resultText.value))
const highlightedResult = computed(() => {
  if (!isResultJson.value) return ''
  return highlightJson(resultText.value)
})

const truncatedResult = computed(() => {
  const text = resultText.value
  if (text.length <= 3000) return text
  return text.slice(0, 3000)
})

const isResultTruncated = computed(() => resultText.value.length > 3000)
const showFullResult = ref(false)
</script>

<template>
  <div class="card-style card-tool overflow-hidden">
    <!-- 工具调用头部 -->
    <button
      class="w-full flex items-center gap-2 px-3.5 py-2.5 bg-[var(--color-tool-bg)] hover:bg-[var(--color-tool-bg-hover)] transition-all duration-300"
      @click="expanded = !expanded"
    >
      <UIcon
        :name="icon"
        class="size-5 text-[var(--color-tool)]"
      />
      <span class="text-sm font-semibold text-[var(--color-tool)]">工具 {{ call.name }}</span>
      <span
        v-if="summary"
        class="text-xs text-[var(--text-secondary)] truncate max-w-md"
      >{{ summary }}</span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-3 ml-auto shrink-0 text-[var(--text-secondary)]"
      />
    </button>

    <!-- 展开内容 -->
    <div
      v-if="expanded"
      class="border-t border-[var(--card-border)]"
    >
      <!-- 输入参数 -->
      <div class="px-3.5 py-3">
        <div class="text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
          输入 Input
        </div>
        <pre class="code-block hljs max-h-64 overflow-y-auto"><code v-html="highlightedInput" /></pre>
      </div>

      <!-- 结果 -->
      <div
        v-if="resultText"
        class="px-3.5 py-3 border-t border-[var(--card-border)]"
      >
        <div class="text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
          结果 Result
        </div>
        <!-- JSON 高亮结果 -->
        <pre
          v-if="isResultJson && !isResultTruncated"
          class="code-block hljs max-h-96 overflow-y-auto"
        ><code v-html="highlightedResult" /></pre>
        <!-- 纯文本结果 -->
        <pre
          v-else
          class="code-block max-h-96 overflow-y-auto"
        >{{ showFullResult ? resultText : truncatedResult }}</pre>
        <button
          v-if="isResultTruncated && !showFullResult"
          class="text-xs text-primary mt-1.5 hover:underline"
          @click.stop="showFullResult = true"
        >
          显示全部 ({{ resultText.length.toLocaleString() }} 字符)
        </button>
      </div>
    </div>
  </div>
</template>
