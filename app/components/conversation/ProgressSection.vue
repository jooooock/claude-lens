<!--
  ProgressSection - 进度事件折叠区域组件

  用途：
    以可折叠的卡片形式展示一组进度事件（ProgressRecord）。
    折叠状态下显示事件总数和按类型（Hook/Bash/MCP/Agent）的分组统计标签；
    展开后逐条显示每个进度事件的图标、类型标签和详细描述。

  Props：
    - events: ProgressRecord[] — 进度事件记录数组，每条包含 data 字段（区分 hook_progress / bash_progress / mcp_progress / agent_progress）

  使用场景：
    在 ConversationView.vue 中，当 showProgress 开关开启且 turn.progressEvents 非空时，
    渲染在每个 Turn 的 Assistant 内容块之后。
-->
<script setup lang="ts">
import type { ProgressRecord, HookProgressData, BashProgressData, McpProgressData, AgentProgressData } from '~/types/records'

const props = defineProps<{
  events: ProgressRecord[]
}>()

const expanded = ref(false)

/** 按进度事件类型分组统计数量，返回 { hook, bash, mcp, agent } 各自的计数 */
const summary = computed(() => {
  const counts = { hook: 0, bash: 0, mcp: 0, agent: 0 }
  for (const e of props.events) {
    const t = e.data.type
    if (t === 'hook_progress') counts.hook++
    else if (t === 'bash_progress') counts.bash++
    else if (t === 'mcp_progress') counts.mcp++
    else if (t === 'agent_progress') counts.agent++
  }
  return counts
})

/** 生成摘要标签数组，如 ["Hook x2", "Bash x3"]，用于折叠状态下的快速概览 */
const summaryTags = computed(() => {
  const tags: string[] = []
  const s = summary.value
  if (s.hook) tags.push(`Hook ×${s.hook}`)
  if (s.bash) tags.push(`Bash ×${s.bash}`)
  if (s.mcp) tags.push(`MCP ×${s.mcp}`)
  if (s.agent) tags.push(`Agent ×${s.agent}`)
  return tags
})

/**
 * 格式化单条进度事件为展示所需的结构
 * @param e - 进度事件记录
 * @returns 包含 icon（图标名）、label（类型标签）、detail（详情描述）的对象
 */
function formatEvent(e: ProgressRecord): { icon: string, label: string, detail: string } {
  const d = e.data
  switch (d.type) {
    case 'hook_progress': {
      const h = d as HookProgressData
      return { icon: 'i-lucide-webhook', label: 'Hook', detail: `${h.hookEvent}: ${h.hookName}` }
    }
    case 'bash_progress': {
      const b = d as BashProgressData
      const time = b.elapsedTimeSeconds ? `${b.elapsedTimeSeconds.toFixed(1)}s` : ''
      const lines = b.totalLines ? `${b.totalLines} 行` : ''
      return { icon: 'i-lucide-terminal', label: 'Bash', detail: [time, lines].filter(Boolean).join(' · ') || b.output?.slice(0, 80) || '' }
    }
    case 'mcp_progress': {
      const m = d as McpProgressData
      return { icon: 'i-lucide-plug', label: 'MCP', detail: `${m.serverName}.${m.toolName}: ${m.status}` }
    }
    case 'agent_progress': {
      const a = d as AgentProgressData
      return { icon: 'i-lucide-git-branch', label: 'Agent', detail: a.agentId || '' }
    }
    default:
      return { icon: 'i-lucide-activity', label: '进度', detail: '' }
  }
}
</script>

<template>
  <div class="card-style overflow-hidden">
    <button
      class="w-full flex items-center gap-2 px-3.5 py-2 bg-[var(--secondary-bg)] hover:bg-[var(--card-border)] transition-all duration-300"
      @click="expanded = !expanded"
    >
      <UIcon
        name="i-lucide-activity"
        class="size-3.5 text-[var(--text-secondary)]"
      />
      <span class="text-xs font-medium text-[var(--text-secondary)]">进度事件</span>
      <span class="inline-flex items-center justify-center min-w-5 h-4 px-1 rounded-full bg-[var(--card-border)] text-[10px] font-medium">
        {{ events.length }}
      </span>
      <span class="text-[10px] text-[var(--text-grey)] ml-1">{{ summaryTags.join(' · ') }}</span>
      <UIcon
        :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-3 ml-auto shrink-0 text-[var(--text-secondary)]"
      />
    </button>

    <div
      v-if="expanded"
      class="border-t border-[var(--card-border)] max-h-64 overflow-y-auto"
    >
      <div
        v-for="(evt, i) in events"
        :key="i"
        class="flex items-center gap-2 px-3.5 py-1.5 text-[11px] border-b border-[var(--card-border)] last:border-b-0"
      >
        <UIcon
          :name="formatEvent(evt).icon"
          class="size-3 text-[var(--text-secondary)] shrink-0"
        />
        <span class="font-medium text-[var(--text-secondary)] w-10 shrink-0">{{ formatEvent(evt).label }}</span>
        <span class="truncate text-[var(--text-primary)]">{{ formatEvent(evt).detail }}</span>
      </div>
    </div>
  </div>
</template>
