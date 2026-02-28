<!--
  AssistantMetaBar - 助手回复元数据行组件

  用途：
    在每轮 Assistant 回复内容块的底部，以紧凑的一行展示本次 API 调用的元数据信息。
    包括：模型名称 badge、输入/输出 Token 用量、缓存 Token、响应耗时、停止原因、时间戳。

  Props：
    - meta: AssistantMeta — 包含 model、usage、durationMs、stopReason、timestamp 等字段

  使用场景：
    嵌入在 ConversationView.vue 中每个 turn 的 assistantBlocks 渲染区域之后，
    当 turn.assistantMeta 存在时显示。
-->
<script setup lang="ts">
import { format } from 'date-fns'
import type { AssistantMeta } from '~/types/api'

const props = defineProps<{
  meta: AssistantMeta
}>()

/** 格式化 token 数量：>= 1M 显示 M 单位，>= 1k 显示 k 单位 */
function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/** 简化模型名称：去除 "claude-" 前缀和日期后缀（如 -20240301），使显示更紧凑 */
const modelShort = computed(() => {
  return props.meta.model.replace('claude-', '').replace(/-\d{8}$/, '')
})

/** 格式化时间戳为 HH:mm:ss 格式，解析失败时返回空字符串 */
const formattedTime = computed(() => {
  try {
    return format(new Date(props.meta.timestamp), 'HH:mm:ss')
  } catch {
    return ''
  }
})

/** 格式化 API 调用耗时：小于 60 秒显示 "X.Xs"，超过则显示 "XmYs" */
const formattedDuration = computed(() => {
  if (!props.meta.durationMs) return ''
  const s = props.meta.durationMs / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
})

/** 缓存 Token 总量：cache_read（缓存读取）+ cache_creation（缓存创建）之和 */
const cacheTokens = computed(() => {
  const u = props.meta.usage
  return u.cache_read_input_tokens + u.cache_creation_input_tokens
})

/** 停止原因的中文标签映射：将 API 返回的 stop_reason 转为可读文本 */
const stopReasonLabel = computed(() => {
  const m: Record<string, string> = {
    end_turn: '完成',
    tool_use: '工具调用',
    stop_sequence: '停止序列',
    max_tokens: '达到上限'
  }
  return props.meta.stopReason ? (m[props.meta.stopReason] || props.meta.stopReason) : ''
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-1.5 text-[11px] text-[var(--text-secondary)]">
    <!-- 模型 -->
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--secondary-bg)] font-medium">
      <UIcon name="i-lucide-brain" class="size-3" />
      {{ modelShort }}
    </span>

    <!-- Token 用量 -->
    <span class="inline-flex items-center gap-1">
      <UIcon name="i-lucide-coins" class="size-3" />
      {{ formatTokens(meta.usage.input_tokens) }} in / {{ formatTokens(meta.usage.output_tokens) }} out
      <template v-if="cacheTokens > 0">
        · cache {{ formatTokens(cacheTokens) }}
      </template>
    </span>

    <!-- 耗时 -->
    <span v-if="formattedDuration" class="inline-flex items-center gap-1">
      <UIcon name="i-lucide-timer" class="size-3" />
      {{ formattedDuration }}
    </span>

    <!-- Stop reason -->
    <span v-if="stopReasonLabel" class="inline-flex items-center gap-1">
      <UIcon name="i-lucide-circle-stop" class="size-3" />
      {{ stopReasonLabel }}
    </span>

    <!-- 时间戳 -->
    <span v-if="formattedTime" class="inline-flex items-center gap-1">
      <UIcon name="i-lucide-clock" class="size-3" />
      {{ formattedTime }}
    </span>
  </div>
</template>
