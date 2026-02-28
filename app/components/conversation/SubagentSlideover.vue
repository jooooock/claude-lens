<!--
  SubagentSlideover - 子代理对话抽屉面板

  用途：
    以侧边抽屉（USlideover）形式展示子代理（subagent）的完整对话历史。
    当用户在 ToolUseBlock 中点击 Task 工具的「查看对话」按钮时弹出，
    加载子代理的 JSONL 文件并复用 ConversationView 渲染对话。

  Props：
    - open:      控制抽屉的显示/隐藏
    - project:   项目目录名（用于 API 请求路径）
    - sessionId: 主会话 ID
    - agentId:   子代理 ID（从 TaskToolResult.agentId 获取）

  数据流：
    props 变化 → watch 触发 API 请求 → 记录数据 → useConversationTree → ConversationView

  支持递归：
    子代理对话中如果也包含 Task 工具调用，可以再次点击查看嵌套子代理。
-->
<script setup lang="ts">
import type { JsonlRecord } from '~/types/records'
import type { ConversationFilters } from '~/types/api'

const props = defineProps<{
  open: boolean
  project: string
  sessionId: string
  agentId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

/** 子代理的记录数据 */
const records = ref<JsonlRecord[]>([])
/** 数据加载状态 */
const loading = ref(false)
/** 加载错误信息 */
const error = ref('')

/** 子代理对话的过滤器（showSidechains 必须为 true，因为子代理记录均标记为 isSidechain） */
const filters = ref<ConversationFilters>({
  showProgress: false,
  showSystemEvents: true,
  showSidechains: true,
  showThinking: true
})

/** 将记录组织为对话 Turn 树 */
const { turns } = useConversationTree(records, filters)

/** 加载子代理的 JSONL 记录 */
async function loadSubagent() {
  if (!props.agentId || !props.project || !props.sessionId) return

  loading.value = true
  error.value = ''
  records.value = []

  try {
    const data = await $fetch<{ records: JsonlRecord[], total: number }>(
      `/api/sessions/${props.project}/${props.sessionId}/subagent/${props.agentId}`
    )
    records.value = data.records as JsonlRecord[]
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '加载子代理对话失败'
    console.error('Failed to load subagent:', err)
  } finally {
    loading.value = false
  }
}

/** 监听抽屉打开 → 加载数据（immediate: true 确保首次挂载时也触发） */
watch(() => props.open, (isOpen) => {
  if (isOpen && records.value.length === 0) {
    loadSubagent()
  }
}, { immediate: true })
</script>

<template>
  <USlideover
    :open="open"
    :title="`子代理对话 ${agentId.slice(0, 8)}...`"
    :description="`会话 ${sessionId.slice(0, 12)}... 的子代理`"
    class="w-[80vw] max-w-4xl"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="h-full overflow-y-auto">
        <!-- 加载中 -->
        <div
          v-if="loading"
          class="flex items-center justify-center py-20"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 animate-spin text-primary"
          />
          <span class="ml-2 text-sm text-[var(--text-secondary)]">加载子代理对话...</span>
        </div>

        <!-- 错误 -->
        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center py-20 text-center"
        >
          <UIcon
            name="i-lucide-alert-circle"
            class="size-8 text-[var(--color-error-text)] mb-2"
          />
          <p class="text-sm text-[var(--color-error-text)]">
            {{ error }}
          </p>
          <button
            class="mt-3 text-xs text-primary hover:underline"
            @click="loadSubagent"
          >
            重试
          </button>
        </div>

        <!-- 对话内容 -->
        <ConversationView
          v-else
          :turns="turns"
          :loading="false"
          :show-progress="false"
        />
      </div>
    </template>
  </USlideover>
</template>
