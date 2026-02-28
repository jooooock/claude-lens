<!--
  index - 应用首页（空状态占位页）

  用途：
    当用户未选择任何会话时显示的空状态页面。
    居中展示一个消息图标和提示文案，引导用户从左侧侧边栏选择项目和会话。

  使用场景：
    作为默认路由（/）的页面组件，在用户打开应用或未选择会话时显示。
-->
<template>
  <div class="flex items-center justify-center h-full">
    <div class="text-center">
      <UIcon
        name="i-lucide-message-square-text"
        class="size-16 text-muted mx-auto mb-4"
      />
      <h2 class="text-lg font-medium text-muted">
        选择一个会话开始查看
      </h2>
      <p class="text-sm text-dimmed mt-1">
        从左侧选择一个项目和会话
      </p>
    </div>
  </div>
</template>
