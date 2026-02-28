<!--
  ConversationView - 对话视图主体组件

  用途：
    渲染整个对话的 Turn 序列。每个 Turn 按以下顺序渲染内容：
    1. 前置系统事件（CompactBoundary 上下文压缩分隔线）
    2. 用户消息（右对齐，占 3/5 宽度）
    3. Assistant 内容块（左对齐，按序渲染文本 / Thinking / 工具调用）
    4. AssistantMetaBar（模型、Token、耗时等元数据）
    5. 后置系统事件（StopHookSummary / ApiError / LocalCommand）
    6. 进度事件（折叠式，受 showProgress 开关控制）
    底部有加载指示器。

  Props：
    - turns: ConversationTurn[]  — 对话轮次数组，由 useConversationTree composable 构建
    - loading: boolean           — 是否正在加载数据，为 true 时在底部显示加载动画
    - showProgress?: boolean     — 是否显示进度事件区域（可选，默认不显示）

  使用场景：
    嵌入在 session/[project]/[sessionId].vue 页面的滚动容器内，
    是对话历史展示的核心组件。
-->
<script setup lang="ts">
import type { ConversationTurn } from '~/types/api'
import { isCompactBoundary, isStopHookSummary, isApiError, isLocalCommand } from '~/types/records'

/** @property {ConversationTurn[]} turns - 对话轮次数组，每个 Turn 包含 userMessage、assistantBlocks、preSystemEvents、postSystemEvents、progressEvents 等 */
/** @property {boolean} loading - 数据加载状态，控制底部 spinner 的显示 */
/** @property {boolean} [showProgress] - 是否展示进度事件区域，由过滤器面板的 Progress 开关控制 */
defineProps<{
  turns: ConversationTurn[]
  loading: boolean
  showProgress?: boolean
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
      <!-- 前置系统事件：compact_boundary 上下文压缩分隔线（显示在用户消息之前） -->
      <template v-for="(evt, ei) in turn.preSystemEvents" :key="`pre-sys-${evt.uuid || ei}`">
        <ConversationCompactBoundary
          v-if="isCompactBoundary(evt)"
          :record="evt"
        />
      </template>

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

        <!-- Assistant 元数据行 -->
        <div v-if="turn.assistantMeta" class="flex justify-start">
          <div class="w-3/5">
            <ConversationAssistantMetaBar :meta="turn.assistantMeta" />
          </div>
        </div>
      </div>

      <!-- 后置系统事件：stop_hook_summary / api_error / local_command（显示在 assistant 块之后） -->
      <template v-for="(evt, ei) in turn.postSystemEvents" :key="`post-sys-${evt.uuid || ei}`">
        <ConversationApiErrorBlock
          v-if="isApiError(evt)"
          :record="evt"
        />
        <ConversationStopHookSummaryBlock
          v-else-if="isStopHookSummary(evt)"
          :record="evt"
        />
        <ConversationLocalCommandBlock
          v-else-if="isLocalCommand(evt)"
          :record="evt"
        />
        <!-- turn_duration 不单独渲染，已集成到 AssistantMetaBar -->
      </template>

      <!-- 进度事件（折叠式，受 showProgress 开关控制） -->
      <div v-if="showProgress && turn.progressEvents?.length" class="flex justify-start">
        <div class="w-3/5">
          <ConversationProgressSection :events="turn.progressEvents" />
        </div>
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
