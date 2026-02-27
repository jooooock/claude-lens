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
