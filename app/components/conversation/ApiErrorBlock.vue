<!--
  ApiErrorBlock - API 错误展示卡片组件

  用途：
    以红色主题卡片展示 API 调用过程中产生的错误信息。
    折叠状态下显示错误类型和状态码概览，展开后可查看详细错误消息、
    重试间隔时间以及原始 JSON 错误对象。

  Props：
    - record: ApiErrorRecord — API 错误记录对象，包含 error 对象（status/type/message）、
                                retryAttempt（当前重试次数）、maxRetries（最大重试次数）、retryInMs（重试间隔）

  使用场景：
    在 ConversationView.vue 的系统事件区域中，当记录类型为 api_error 时渲染此组件。
-->
<script setup lang="ts">
import type { ApiErrorRecord } from '~/types/records'

const props = defineProps<{
  record: ApiErrorRecord
}>()

const expanded = ref(false)

/** 提取 HTTP 状态码，无状态码时显示 "?" */
const statusCode = computed(() => props.record.error?.status || '?')
/** 提取错误消息文本，无消息时显示 "未知错误" */
const errorMessage = computed(() => props.record.error?.error?.message || '未知错误')
/** 提取错误类型标识，如 "invalid_request_error"、"rate_limit_error" 等 */
const errorType = computed(() => props.record.error?.error?.type || '')
</script>

<template>
  <div class="card-style card-error overflow-hidden">
    <button
      class="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-[var(--color-error-bg)] transition-all duration-300"
      @click="expanded = !expanded"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-4 text-[var(--color-error-text)]"
      />
      <span class="text-sm font-semibold text-[var(--color-error-text)]">API 错误</span>
      <span class="text-xs text-[var(--text-secondary)]">
        {{ statusCode }} · {{ errorType }}
      </span>
      <span class="text-xs text-[var(--text-secondary)] ml-auto">
        重试 {{ record.retryAttempt }}/{{ record.maxRetries }}
      </span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-3 shrink-0 text-[var(--text-secondary)]"
      />
    </button>

    <div
      v-if="expanded"
      class="border-t border-[var(--color-error-border)] px-3.5 py-3 space-y-2 text-xs"
    >
      <div>
        <span class="text-[var(--text-secondary)]">错误消息：</span>
        <span class="text-[var(--color-error-text)]">{{ errorMessage }}</span>
      </div>
      <div>
        <span class="text-[var(--text-secondary)]">重试间隔：</span>
        {{ record.retryInMs }}ms
      </div>
      <div v-if="record.error">
        <div class="text-[var(--text-secondary)] mb-1">
          原始错误：
        </div>
        <pre class="code-block max-h-48 overflow-y-auto">{{ JSON.stringify(record.error, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
