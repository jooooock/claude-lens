<script setup lang="ts">
import type { SystemRecord, CompactBoundaryRecord } from '~/types/records'

const props = defineProps<{
  record: SystemRecord
}>()

const isCompactBoundary = computed(() => {
  return 'subtype' in props.record && props.record.subtype === 'compact_boundary'
})

const preTokens = computed(() => {
  if (!isCompactBoundary.value) return 0
  return (props.record as CompactBoundaryRecord).compactMetadata?.preTokens || 0
})

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
</script>

<template>
  <div
    v-if="isCompactBoundary"
    class="flex items-center gap-3 py-4 my-2"
  >
    <div class="flex-1 border-t-2 border-dashed border-[var(--color-warning)]" />
    <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
      <UIcon
        name="i-lucide-scissors"
        class="size-4 text-[var(--color-warning)]"
      />
      <span class="text-sm font-semibold text-[var(--color-warning-text)]">上下文已压缩 Context Compacted</span>
      <UBadge
        color="neutral"
        variant="subtle"
        size="sm"
      >
        {{ formatTokens(preTokens) }} tokens
      </UBadge>
    </div>
    <div class="flex-1 border-t-2 border-dashed border-[var(--color-warning)]" />
  </div>
</template>
