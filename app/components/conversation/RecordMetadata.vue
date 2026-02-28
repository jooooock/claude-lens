<!--
  RecordMetadata - 记录元数据弹窗组件

  用途：
    通过 UPopover 弹窗展示单条对话记录的详细元数据信息，包括：
    时间戳、工作目录（cwd）、Git 分支、Claude Code 版本号、记录 UUID、
    以及 Sidechain（子代理分支）标志。
    嵌入在 MessageBubble 头部的角色标签旁，使用 @click.stop 阻止事件冒泡
    以避免触发 MessageBubble 的折叠/展开行为。

  Props：
    - record: ConversationRecord — 对话记录基础对象，包含 timestamp、cwd、gitBranch、
                                    version、uuid、isSidechain 等公共字段

  使用场景：
    嵌入在 MessageBubble.vue 的卡片头部区域，作为信息图标按钮触发弹窗。
-->
<script setup lang="ts">
import { format } from 'date-fns'
import type { ConversationRecord } from '~/types/records'

const props = defineProps<{
  record: ConversationRecord
}>()

/** 格式化时间戳为 "yyyy-MM-dd HH:mm:ss" 格式，解析失败时返回原始字符串 */
const formattedTime = computed(() => {
  try {
    return format(new Date(props.record.timestamp), 'yyyy-MM-dd HH:mm:ss')
  } catch {
    return props.record.timestamp
  }
})

/** 简化工作目录路径：超过 3 层时只保留最后 2 层，前面用 "..." 替代 */
const shortCwd = computed(() => {
  const parts = props.record.cwd.split('/')
  return parts.length > 3 ? `.../${parts.slice(-2).join('/')}` : props.record.cwd
})
</script>

<template>
  <UPopover>
    <button
      class="inline-flex items-center justify-center size-5 rounded hover:bg-[var(--secondary-bg)] transition-colors"
      title="记录元数据"
      @click.stop
    >
      <UIcon name="i-lucide-info" class="size-3 text-[var(--text-secondary)]" />
    </button>

    <template #content>
      <div class="p-3 space-y-1.5 text-xs min-w-56 max-w-80">
        <!-- 时间戳 -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-clock" class="size-3 text-[var(--text-secondary)] shrink-0" />
          <span class="text-[var(--text-secondary)]">时间：</span>
          <span class="font-mono">{{ formattedTime }}</span>
        </div>

        <!-- 工作目录 -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-folder" class="size-3 text-[var(--text-secondary)] shrink-0" />
          <span class="text-[var(--text-secondary)]">目录：</span>
          <span class="font-mono truncate" :title="record.cwd">{{ shortCwd }}</span>
        </div>

        <!-- Git 分支 -->
        <div v-if="record.gitBranch" class="flex items-center gap-2">
          <UIcon name="i-lucide-git-branch" class="size-3 text-[var(--text-secondary)] shrink-0" />
          <span class="text-[var(--text-secondary)]">分支：</span>
          <span class="font-mono">{{ record.gitBranch }}</span>
        </div>

        <!-- 版本 -->
        <div v-if="record.version" class="flex items-center gap-2">
          <UIcon name="i-lucide-tag" class="size-3 text-[var(--text-secondary)] shrink-0" />
          <span class="text-[var(--text-secondary)]">版本：</span>
          <span class="font-mono">v{{ record.version }}</span>
        </div>

        <!-- UUID -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-fingerprint" class="size-3 text-[var(--text-secondary)] shrink-0" />
          <span class="text-[var(--text-secondary)]">UUID：</span>
          <span class="font-mono truncate" :title="record.uuid">{{ record.uuid?.slice(0, 8) ?? '—' }}...</span>
        </div>

        <!-- Sidechain 标志 -->
        <div v-if="record.isSidechain" class="flex items-center gap-2">
          <UIcon name="i-lucide-git-fork" class="size-3 text-[var(--color-warning-text)] shrink-0" />
          <span class="text-[var(--color-warning-text)] font-medium">Sidechain</span>
        </div>
      </div>
    </template>
  </UPopover>
</template>
