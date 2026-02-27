<script setup lang="ts">
import type { ConversationTurn } from '~/types/api'

defineProps<{
  turns: ConversationTurn[]
  loading: boolean
}>()
</script>

<template>
  <div class="px-8 py-6 space-y-5">
    <div
      v-for="(turn, i) in turns"
      :key="turn.key"
      :data-turn-index="i"
      class="space-y-3"
    >
      <!-- 系统事件（如 compact_boundary） -->
      <ConversationCompactBoundary
        v-for="evt in turn.systemEvents"
        :key="`sys-${evt.uuid}`"
        :record="evt"
      />

      <!-- 用户消息（右对齐） -->
      <div
        v-if="turn.userMessage"
        :data-turn-user="i"
        class="flex justify-end"
      >
        <div class="w-3/5">
          <ConversationMessageBubble
            role="user"
            :record="turn.userMessage"
          />
        </div>
      </div>

      <!-- Assistant 内容块（全部左对齐） -->
      <div
        v-if="turn.assistantBlocks.length"
        :data-turn-assistant="i"
        class="space-y-3"
      >
        <template
          v-for="(block, k) in turn.assistantBlocks"
          :key="k"
        >
          <!-- 文本内容 -->
          <div
            v-if="block.kind === 'text'"
            class="flex justify-start"
          >
            <div class="w-3/5">
              <ConversationMessageBubble
                role="assistant"
                :text="block.text"
              />
            </div>
          </div>

          <!-- Thinking -->
          <div
            v-else-if="block.kind === 'thinking'"
            class="flex justify-start"
          >
            <div class="w-3/5">
              <ConversationThinkingBlock
                :content="block.thinking"
              />
            </div>
          </div>

          <!-- 工具调用 -->
          <div
            v-else-if="block.kind === 'tool_call'"
            class="flex justify-start"
          >
            <div class="w-3/5">
              <ConversationToolUseBlock
                :call="block.call"
                :result="block.result"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 加载中 -->
    <div
      v-if="loading"
      class="flex justify-center py-4"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-5 animate-spin text-muted"
      />
    </div>
  </div>
</template>
