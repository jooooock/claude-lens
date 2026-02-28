# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

claude-lens 是一个 Web UI 工具，用于展示和分析 Claude Code 项目目录（`~/.claude/projects/`）中的 JSONL 对话历史。

## 技术栈

- Nuxt 4 + TypeScript
- TailwindCSS v4（通过 `@tailwindcss/vite`）
- Nuxt UI v4（`@nuxt/ui`）
- date-fns（日期格式化）
- 包管理器：yarn v1.22

## 常用命令

```bash
yarn dev          # 启动开发服务器 (http://localhost:3000)
yarn build        # 构建生产版本
yarn lint         # ESLint 检查
yarn typecheck    # TypeScript 类型检查
```

## 项目架构

```
app/
├── types/          # TypeScript 类型定义（records.ts 定义 6 种 JSONL 记录类型）
├── composables/    # Vue composables（useProjects, useSession, useConversationTree）
├── components/
│   ├── sidebar/    # 侧边栏项目树
│   └── conversation/  # 对话展示组件（MessageBubble, ToolUseBlock, ThinkingBlock 等）
├── layouts/        # Dashboard 布局（UDashboardGroup + Sidebar + Panel）
└── pages/          # 路由页面（index + session/[project]/[sessionId]）

server/
├── api/            # API 路由
│   ├── projects/   # GET /api/projects — 项目列表
│   └── sessions/   # GET /api/sessions/:project/:sessionId — 分页会话记录
└── utils/          # 服务端工具（流式 JSONL 解析器、项目目录扫描）
```

### 数据流

1. Server 读取 `~/.claude/projects/` 目录，流式解析 JSONL 文件（支持 16MB+ 大文件）
2. API 返回分页记录（默认 200 条/页），支持按类型过滤（excludeTypes 参数）
3. 客户端 `useConversationTree` 将扁平记录组织为对话 turn，配对 tool_use 与 toolUseResult
4. 组件按类型渲染：用户消息、Assistant 文本、Thinking 块、工具调用（可折叠展开）

### 关键类型文件

- `app/types/records.ts` — 6 种 JSONL 记录类型定义，所有组件和 API 的基础
- `app/types/api.ts` — API 响应类型 + ConversationTurn/AssistantBlock 等 UI 类型

## 开发语言

项目文档使用中文，代码注释和 commit message 也请使用中文。

## 约定

- 尽量使用详细和直观的注释，解释每一个细节
- 每次修改确保minimap样式及指示器位置正确
- 每次修改完后需要保障CI能够通过，无类型错误
