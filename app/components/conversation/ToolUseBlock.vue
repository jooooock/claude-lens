<!--
  ToolUseBlock - 工具调用展示卡片组件

  用途：
    以可折叠卡片展示单次工具调用的完整信息，包括：
    - 头部：工具图标、工具名、调用摘要（文件路径/命令/搜索模式等）
    - 展开后：输入参数（JSON 语法高亮）、执行结果（支持 JSON 和纯文本两种渲染）
    - 特殊标志：Bash 工具的错误/中断状态 badge
    - Edit/Write 工具的 structuredPatch 差异预览
    - Task（子代理）工具的元数据（agentId、耗时、Token 用量、工具调用次数）+ 查看对话按钮
    - TodoWrite 工具的任务清单渲染
    - 外部化工具结果的按需加载
    结果超过 3000 字符自动截断，可点击展开完整内容。

  Props：
    - call: ToolUseContent — 工具调用内容对象，包含 name（工具名）、id（调用 ID）、input（输入参数）
    - result?: UserRecord  — 对应的工具结果记录（可选），包含 toolUseResult 字段

  使用场景：
    在 ConversationView.vue 中，当 assistantBlock.kind === 'tool_call' 时渲染此组件。
-->
<script setup lang="ts">
import type { ToolUseContent, UserRecord, TaskToolResult, TodoItem } from '~/types/records'
import { isBashResult, isReadResult, isGrepResult, isGlobResult, isMcpResult, isEditResult, isWriteResult, isTaskResult, isTodoWriteResult } from '~/types/records'

const props = defineProps<{
  call: ToolUseContent
  result?: UserRecord
}>()

const expanded = ref(false)

/**
 * 通过 inject 获取会话上下文（project 和 sessionId），
 * 用于调用子代理/工具结果 API。由 session page 通过 provide 注入。
 */
const sessionContext = inject<{
  project: Ref<string>
  sessionId: Ref<string>
}>('sessionContext', null as any)

/** 工具名称到 Lucide 图标名的映射表，未匹配的工具使用默认的扳手图标 */
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

/** 当前工具对应的图标名，未在映射表中的工具使用通用的扳手图标 */
const icon = computed(() => {
  return toolIcons[props.call.name] || 'i-lucide-wrench'
})

/**
 * 工具调用摘要：根据不同工具类型提取关键信息用于折叠状态下的快速预览
 * - Read/Edit/Write: 显示文件路径
 * - Bash: 显示命令内容（截断到 100 字符）
 * - Grep/Glob: 显示搜索模式
 * - Task: 显示任务描述（截断到 80 字符）
 */
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

/** 将工具输入参数序列化为 JSON 并使用 highlight.js 进行语法高亮 */
const highlightedInput = computed(() => {
  const jsonStr = JSON.stringify(props.call.input, null, 2)
  return highlightJson(jsonStr)
})

/**
 * 格式化工具执行结果为纯文本：
 * 根据不同的结果类型（BashResult/ReadResult/GrepResult/GlobResult/McpResult 等）
 * 提取并拼接可读的文本内容。字符串类型直接返回，对象类型按类型逻辑处理。
 */
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

  // TodoWrite 结果由专门的 todo 渲染区域处理
  if (isTodoWriteResult(r)) {
    return ''
  }

  return JSON.stringify(r, null, 2)
})

/** 判断结果文本是否为 JSON 格式（以 { 或 [ 开头和结尾） */
const isResultJson = computed(() => isJsonLike(resultText.value))
/** 如果结果是 JSON 格式，使用 highlight.js 进行语法高亮渲染 */
const highlightedResult = computed(() => {
  if (!isResultJson.value) return ''
  return highlightJson(resultText.value)
})

/** 截断后的结果文本：超过 3000 字符时只保留前 3000 字符 */
const truncatedResult = computed(() => {
  const text = resultText.value
  if (text.length <= 3000) return text
  return text.slice(0, 3000)
})

/** 结果文本是否被截断（超过 3000 字符） */
const isResultTruncated = computed(() => resultText.value.length > 3000)
/** 用户是否选择了查看完整结果（点击"显示全部"后置为 true） */
const showFullResult = ref(false)

/** Bash 工具特有的状态标志：is_error（命令执行出错）和 interrupted（命令被中断） */
const bashFlags = computed(() => {
  if (!props.result?.toolUseResult || !isBashResult(props.result.toolUseResult)) return null
  const r = props.result.toolUseResult
  return {
    isError: r.is_error || false,
    interrupted: r.interrupted || false
  }
})

/** Task（子代理）工具的结果元数据：包含 agentId、总耗时、Token 用量、工具调用次数等 */
const taskMeta = computed<TaskToolResult | null>(() => {
  if (!props.result?.toolUseResult || !isTaskResult(props.result.toolUseResult)) return null
  return props.result.toolUseResult
})

/** Edit/Write 工具的结构化差异补丁：用于展示文件修改前后的 diff 预览 */
const structuredPatch = computed(() => {
  if (!props.result?.toolUseResult) return ''
  const r = props.result.toolUseResult
  if (isEditResult(r) && r.structuredPatch) return r.structuredPatch
  if (isWriteResult(r) && r.structuredPatch) return r.structuredPatch
  return ''
})

// =====================================================================
// 子代理对话查看功能
// =====================================================================

/** 子代理抽屉是否打开 */
const showSubagent = ref(false)

/** 打开子代理对话抽屉 */
function openSubagent() {
  showSubagent.value = true
}

// =====================================================================
// 外部化工具结果加载功能
// =====================================================================

/** 外部工具结果的完整内容 */
const externalResult = ref('')
/** 外部工具结果加载状态 */
const loadingExternal = ref(false)
/** 外部工具结果的文件大小 */
const externalFileSize = ref(0)
/** 外部工具结果是否被截断 */
const externalTruncated = ref(false)
/** 外部工具结果加载错误 */
const externalError = ref('')

/**
 * 判断是否可以尝试加载外部工具结果文件。
 * 条件：有 sessionContext、call.id 存在、且结果文本为空或被截断。
 */
const canLoadExternal = computed(() => {
  if (!sessionContext || !props.call.id) return false
  // 只要有 call.id 就可以尝试加载
  return true
})

/** 加载外部化的工具结果文件 */
async function loadExternalResult() {
  if (!sessionContext || !props.call.id) return

  loadingExternal.value = true
  externalError.value = ''

  try {
    const data = await $fetch<{ content: string, fileSize: number, truncated: boolean }>(
      `/api/sessions/${sessionContext.project.value}/${sessionContext.sessionId.value}/tool-result/${props.call.id}`
    )
    externalResult.value = data.content
    externalFileSize.value = data.fileSize
    externalTruncated.value = data.truncated
  } catch {
    externalError.value = '未找到外部结果文件'
  } finally {
    loadingExternal.value = false
  }
}

// =====================================================================
// TodoWrite 待办事项渲染
// =====================================================================

/** 提取 TodoWrite 的新待办事项列表 */
const todoItems = computed<TodoItem[]>(() => {
  if (!props.result?.toolUseResult || !isTodoWriteResult(props.result.toolUseResult)) return []
  return props.result.toolUseResult.newTodos || []
})

/** 待办事项状态对应的图标 */
const todoStatusIcons: Record<string, string> = {
  completed: 'i-lucide-circle-check',
  in_progress: 'i-lucide-loader-2',
  pending: 'i-lucide-circle'
}

/** 待办事项状态对应的颜色类 */
const todoStatusColors: Record<string, string> = {
  completed: 'text-green-500',
  in_progress: 'text-blue-500',
  pending: 'text-[var(--text-secondary)]'
}
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

      <!-- Bash 错误/中断标志 -->
      <div
        v-if="bashFlags && (bashFlags.isError || bashFlags.interrupted)"
        class="px-3.5 py-2 border-t border-[var(--card-border)] flex items-center gap-2"
      >
        <span v-if="bashFlags.isError" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-error-bg)] text-[var(--color-error-text)] border border-[var(--color-error-border)]">
          <UIcon name="i-lucide-circle-x" class="size-3" />
          错误
        </span>
        <span v-if="bashFlags.interrupted" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]">
          <UIcon name="i-lucide-pause-circle" class="size-3" />
          已中断
        </span>
      </div>

      <!-- TodoWrite 待办事项清单 -->
      <div
        v-if="todoItems.length > 0"
        class="px-3.5 py-3 border-t border-[var(--card-border)]"
      >
        <div class="text-xs text-[var(--text-secondary)] mb-2 font-medium">
          待办事项 ({{ todoItems.length }})
        </div>
        <div class="space-y-1">
          <div
            v-for="(todo, idx) in todoItems"
            :key="idx"
            class="flex items-start gap-2 text-xs py-0.5"
          >
            <UIcon
              :name="todoStatusIcons[todo.status] || 'i-lucide-circle'"
              :class="['size-3.5 mt-0.5 shrink-0', todoStatusColors[todo.status] || '']"
            />
            <span
              :class="[
                todo.status === 'completed' ? 'line-through text-[var(--text-secondary)]' : '',
                todo.status === 'in_progress' ? 'font-medium' : ''
              ]"
            >
              {{ todo.content }}
              <span v-if="todo.status === 'in_progress' && todo.activeForm" class="text-[var(--text-secondary)] ml-1">
                ({{ todo.activeForm }})
              </span>
            </span>
          </div>
        </div>
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
        <div class="flex items-center gap-3 mt-1.5">
          <button
            v-if="isResultTruncated && !showFullResult"
            class="text-xs text-primary hover:underline"
            @click.stop="showFullResult = true"
          >
            显示全部 ({{ resultText.length.toLocaleString() }} 字符)
          </button>
          <!-- 外部结果加载按钮 -->
          <button
            v-if="canLoadExternal && !externalResult && !loadingExternal"
            class="text-xs text-primary hover:underline inline-flex items-center gap-1"
            @click.stop="loadExternalResult"
          >
            <UIcon name="i-lucide-download" class="size-3" />
            加载外部结果文件
          </button>
          <span
            v-if="loadingExternal"
            class="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
            加载中...
          </span>
          <span
            v-if="externalError"
            class="text-xs text-[var(--text-secondary)]"
          >
            {{ externalError }}
          </span>
        </div>
      </div>

      <!-- 无内联结果时也显示外部结果加载入口 -->
      <div
        v-if="!resultText && canLoadExternal && !todoItems.length"
        class="px-3.5 py-3 border-t border-[var(--card-border)]"
      >
        <div class="text-xs text-[var(--text-secondary)] mb-1.5 font-medium">
          结果 Result
        </div>
        <button
          v-if="!externalResult && !loadingExternal"
          class="text-xs text-primary hover:underline inline-flex items-center gap-1"
          @click.stop="loadExternalResult"
        >
          <UIcon name="i-lucide-download" class="size-3" />
          加载外部结果文件
        </button>
        <span
          v-if="loadingExternal"
          class="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1"
        >
          <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
          加载中...
        </span>
        <span
          v-if="externalError"
          class="text-xs text-[var(--text-secondary)]"
        >
          {{ externalError }}
        </span>
      </div>

      <!-- 外部结果内容展示 -->
      <div
        v-if="externalResult"
        class="px-3.5 py-3 border-t border-[var(--card-border)]"
      >
        <div class="text-xs text-[var(--text-secondary)] mb-1.5 font-medium flex items-center gap-2">
          <UIcon name="i-lucide-file-text" class="size-3" />
          外部结果文件
          <span class="text-[10px] font-normal">({{ (externalFileSize / 1024).toFixed(1) }} KB)</span>
          <span v-if="externalTruncated" class="text-[10px] text-[var(--color-warning-text)]">已截断</span>
        </div>
        <pre class="code-block max-h-96 overflow-y-auto text-xs">{{ externalResult }}</pre>
      </div>

      <!-- Edit/Write 差异预览 -->
      <div
        v-if="structuredPatch"
        class="px-3.5 py-3 border-t border-[var(--card-border)]"
      >
        <div class="text-xs text-[var(--text-secondary)] mb-1.5 font-medium">差异 Diff</div>
        <pre class="code-block max-h-64 overflow-y-auto">{{ structuredPatch }}</pre>
      </div>

      <!-- Task Agent 元数据 -->
      <div
        v-if="taskMeta"
        class="px-3.5 py-2 border-t border-[var(--card-border)] flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]"
      >
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-lucide-git-branch" class="size-3" />
          {{ taskMeta.agentId.slice(0, 8) }}...
        </span>
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-lucide-timer" class="size-3" />
          {{ (taskMeta.totalDurationMs / 1000).toFixed(1) }}s
        </span>
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-lucide-coins" class="size-3" />
          {{ taskMeta.totalTokens.toLocaleString() }} tokens
        </span>
        <span class="inline-flex items-center gap-1">
          <UIcon name="i-lucide-wrench" class="size-3" />
          {{ taskMeta.totalToolUseCount }} 次工具调用
        </span>
        <!-- 查看子代理对话按钮 -->
        <button
          v-if="sessionContext"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-primary hover:bg-[var(--secondary-bg)] transition-colors"
          @click.stop="openSubagent"
        >
          <UIcon name="i-lucide-message-square" class="size-3" />
          查看对话
        </button>
      </div>
    </div>

    <!-- 子代理对话抽屉（Teleport 到 body，避免嵌套 overflow 问题） -->
    <ConversationSubagentSlideover
      v-if="taskMeta && sessionContext"
      :open="showSubagent"
      :project="sessionContext.project.value"
      :session-id="sessionContext.sessionId.value"
      :agent-id="taskMeta.agentId"
      @update:open="showSubagent = $event"
    />
  </div>
</template>
