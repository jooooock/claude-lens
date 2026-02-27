<script setup lang="ts">
defineProps<{
  content: string
}>()

const expanded = ref(false)
</script>

<template>
  <div class="card-style card-thinking overflow-hidden">
    <!-- 头部 -->
    <button
      class="w-full flex items-center gap-2 px-3.5 py-2.5 bg-[var(--color-thinking-bg)] hover:bg-[var(--color-thinking-bg-hover)] transition-all duration-300"
      @click="expanded = !expanded"
    >
      <UIcon
        name="i-lucide-brain"
        class="size-5 text-[var(--color-thinking)]"
      />
      <span class="text-sm font-semibold text-[var(--color-thinking)]">思考 Thinking</span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-3 ml-auto text-[var(--text-secondary)]"
      />
    </button>
    <!-- 主体 -->
    <div
      v-if="expanded"
      class="px-3.5 py-3 border-t border-dashed border-[var(--card-border)]"
    >
      <pre class="body-text text-[var(--text-secondary)] whitespace-pre-wrap break-words leading-relaxed max-h-96 overflow-y-auto">{{ content }}</pre>
    </div>
  </div>
</template>
