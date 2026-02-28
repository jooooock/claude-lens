<!--
  default - 应用默认布局

  用途：
    定义整个应用的 Dashboard 风格布局结构：
    - 左侧：可折叠、可调整宽度的侧边栏（UDashboardSidebar），包含应用 Logo、
      项目树组件（SidebarProjectTree）和底部的版本号 + 主题切换按钮
    - 右侧：主内容面板（UDashboardPanel），通过 <slot/> 渲染子路由页面内容

  布局参数：
    - 侧边栏默认宽度 20%，可拖拽调整范围 15%~35%
    - 侧边栏支持折叠（collapsible）

  使用场景：
    作为 Nuxt 的默认布局，包裹所有页面（index.vue 和 session/[project]/[sessionId].vue）。
-->
<script setup lang="ts">
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      id="projects-sidebar"
      collapsible
      resizable
      :min-size="15"
      :default-size="20"
      :max-size="35"
    >
      <template #header>
        <div class="flex items-center gap-2.5 px-2">
          <div class="flex items-center justify-center size-8 rounded-lg bg-[var(--primary-color)] shadow-sm">
            <UIcon
              name="i-lucide-scan-eye"
              class="size-5 text-white"
            />
          </div>
          <span class="font-bold text-base tracking-wide text-[var(--sidebar-text)]">Claude Lens</span>
        </div>
      </template>

      <SidebarProjectTree />

      <template #footer>
        <div class="flex items-center justify-between px-2">
          <span class="text-xs text-muted">v0.1.0</span>
          <UColorModeButton size="xs" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="main-content"
      grow
    >
      <slot />
    </UDashboardPanel>
  </UDashboardGroup>
</template>
