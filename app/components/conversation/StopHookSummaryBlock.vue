<!--
  StopHookSummaryBlock - Stop Hook 摘要展示卡片组件

  用途：
    以蓝色（info）主题卡片展示 Stop Hook 的执行摘要信息。
    折叠状态下显示 hook 数量、是否阻止继续、是否有错误；
    展开后可查看每个 hook 的命令列表、停止原因和错误详情。

  Props：
    - record: StopHookSummaryRecord — 包含 hookCount（hook 总数）、hookInfos（各 hook 信息）、
                                       stopReason（停止原因）、preventedContinuation（是否阻止继续）、
                                       hookErrors（错误列表）

  使用场景：
    在 ConversationView.vue 的系统事件区域中，当记录类型为 stop_hook_summary 时渲染此组件。
-->
<script setup lang="ts">
import type { StopHookSummaryRecord } from '~/types/records'

const props = defineProps<{
  record: StopHookSummaryRecord
}>()

const expanded = ref(false)

/** 提取所有 hook 的命令名列表，过滤掉空值 */
const hookNames = computed(() => {
  return props.record.hookInfos.map(h => h.command).filter(Boolean)
})

/** 判断是否存在 hook 执行错误 */
const hasErrors = computed(() => {
  return props.record.hookErrors && props.record.hookErrors.length > 0
})
</script>

<template>
  <div class="card-style card-info overflow-hidden">
    <button
      class="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-[var(--color-info-bg)] transition-all duration-300"
      @click="expanded = !expanded"
    >
      <UIcon
        name="i-lucide-webhook"
        class="size-4 text-[var(--color-info-text)]"
      />
      <span class="text-sm font-semibold text-[var(--color-info-text)]">Hook 摘要</span>
      <span class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[var(--color-info-bg)] text-[var(--color-info-text)] text-xs font-medium">
        {{ record.hookCount }}
      </span>
      <span
        v-if="record.preventedContinuation"
        class="text-xs text-[var(--color-warning-text)]"
      >
        已阻止继续
      </span>
      <span
        v-if="hasErrors"
        class="text-xs text-[var(--color-error-text)]"
      >
        有错误
      </span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-3 ml-auto shrink-0 text-[var(--text-secondary)]"
      />
    </button>

    <div
      v-if="expanded"
      class="border-t border-[var(--color-info-border)] px-3.5 py-3 space-y-2 text-xs"
    >
      <!-- Hook 命令列表 -->
      <div v-if="hookNames.length">
        <div class="text-[var(--text-secondary)] mb-1">
          Hook 命令：
        </div>
        <div class="space-y-0.5">
          <div
            v-for="(cmd, i) in hookNames"
            :key="i"
            class="font-mono text-[var(--text-primary)]"
          >
            {{ cmd }}
          </div>
        </div>
      </div>

      <!-- 停止原因 -->
      <div>
        <span class="text-[var(--text-secondary)]">停止原因：</span>
        {{ record.stopReason }}
      </div>

      <!-- 错误 -->
      <div v-if="hasErrors">
        <div class="text-[var(--color-error-text)] mb-1">
          错误：
        </div>
        <pre class="code-block max-h-32 overflow-y-auto">{{ JSON.stringify(record.hookErrors, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>
