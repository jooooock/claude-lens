<!--
  LocalCommandBlock - 本地命令展示组件

  用途：
    以紧凑的信息条形式显示用户在 Claude Code CLI 中执行的本地命令，
    如 /clear（清空对话）、/compact（压缩上下文）等斜杠命令。
    不可折叠，仅展示命令内容。

  Props：
    - record: LocalCommandRecord — 本地命令记录对象，包含 content 字段（命令文本）

  使用场景：
    在 ConversationView.vue 的系统事件区域中，当记录类型为 local_command 时渲染此组件。
-->
<script setup lang="ts">
import type { LocalCommandRecord } from '~/types/records'

defineProps<{
  record: LocalCommandRecord
}>()
</script>

<template>
  <div class="card-style card-info overflow-hidden">
    <div class="flex items-center gap-2 px-3.5 py-2.5">
      <UIcon
        name="i-lucide-terminal"
        class="size-4 text-[var(--color-info-text)]"
      />
      <span class="text-sm font-semibold text-[var(--color-info-text)]">本地命令</span>
      <span class="text-xs text-[var(--text-secondary)] truncate">{{ record.content }}</span>
    </div>
  </div>
</template>
