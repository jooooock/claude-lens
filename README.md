# Claude Lens

Claude Lens 是一个 Web UI 工具，用于浏览和分析 [Claude Code](https://claude.ai/code) 的对话历史记录。

它读取 `~/.claude/projects/` 目录下的 JSONL 文件，将原始记录解析为结构化的对话视图，帮助你回顾和检索与 Claude Code 的交互过程。

## 功能特性

### 项目树导航

侧边栏展示所有 Claude Code 项目及其会话列表，支持折叠展开。每个会话显示文件大小（B/KB/MB）和相对时间戳，当前活跃会话高亮标记。

### 对话视图

将 JSONL 记录重建为用户-助手的对话 turn。用户消息右对齐，助手回复左对齐，自动配对 `tool_use` 调用与 `tool_result` 返回结果。消息支持折叠/展开，折叠时显示文本预览。

### 工具调用展示

可折叠的工具调用卡片，为不同工具（Read、Edit、Write、Bash、Grep、Glob 等）提供专属图标。输入参数以语法高亮的 JSON 展示，执行结果按类型格式化（Bash stdout/stderr、文件路径、搜索结果等），长结果自动截断。

### Thinking 块

展示 Claude 的推理思考过程，以虚线边框区分样式，支持折叠/展开。

### Fish-eye Minimap

右侧缩略地图导航器，用色块标识消息角色（蓝色=用户，绿色=助手，琥珀色=系统）。悬停时以高斯分布实现鱼眼放大效果（12 倍峰值放大，σ=60px），显示当前视口位置指示器，支持点击跳转和拖拽滚动。

### 图片预览

内联 Base64 图片点击后进入全屏预览模式，支持：
- 缩放（0.2x ~ 5x，鼠标滚轮光标感知缩放）
- 90° 旋转（左/右）
- 拖拽平移
- 键盘快捷键：`+` 放大、`-` 缩小、`R` 旋转、`0` 重置、`Esc` 关闭

### 内容过滤

可独立开关以下内容的显示：
- Thinking 块（Claude 推理过程）
- Progress 事件（Hook/Agent/Bash/MCP 进度）
- System 事件（上下文压缩边界等）
- Sidechain 消息

### Markdown 渲染 & 代码高亮

消息内容自动识别 Markdown 语法并渲染为 HTML（经 DOMPurify 安全处理）。代码块支持 13 种语言的语法高亮：JSON、JavaScript、TypeScript、HTML/XML、CSS、Bash、Python、YAML、Markdown、Diff 等。

### 大文件支持

后端采用流式 JSONL 解析器（基于 readline），逐行处理文件，API 支持按类型预过滤（JSON 解析前的快速字符串匹配），支持 16MB+ 大文件。

### 深色模式

完整的亮色/深色主题支持，基于 CSS 变量系统实现，深色模式采用 GitHub Dark 风格配色。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Nuxt 4](https://nuxt.com/) + TypeScript |
| UI 组件 | [Nuxt UI v4](https://ui.nuxt.com/) |
| 样式 | [TailwindCSS v4](https://tailwindcss.com/) |
| Markdown | [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify) |
| 代码高亮 | [highlight.js](https://highlightjs.org/) |
| 日期处理 | [date-fns](https://date-fns.org/) |
| 图标 | [Lucide](https://lucide.dev/) + [Simple Icons](https://simpleicons.org/) |
| 包管理器 | yarn v1.22 |

## 快速开始

```bash
# 安装依赖
yarn install

# 启动开发服务器
yarn dev
```

打开 http://localhost:3000 即可使用。

## 常用命令

```bash
yarn dev          # 启动开发服务器
yarn build        # 构建生产版本
yarn preview      # 预览生产构建
yarn lint         # ESLint 代码检查
yarn typecheck    # TypeScript 类型检查
```

## 项目结构

```
app/
├── types/              # TypeScript 类型定义
│   ├── records.ts      #   6 种 JSONL 记录类型 + 工具结果类型守卫
│   └── api.ts          #   ConversationTurn / AssistantBlock 等 UI 类型
├── composables/        # Vue Composables
│   ├── useProjects.ts  #   项目列表获取
│   ├── useSession.ts   #   会话记录加载（监听路由变化）
│   ├── useConversationTree.ts  # 扁平记录 → 对话 turn 树构建
│   ├── useMarkdown.ts  #   Markdown 渲染 / JSON 高亮 / 语法检测
│   └── useImagePreview.ts     # 图片预览状态（单例模式）
├── components/
│   ├── sidebar/
│   │   └── ProjectTree.vue     # 侧边栏项目树导航
│   └── conversation/
│       ├── ConversationView.vue    # 主对话渲染器
│       ├── ConversationMinimap.vue # Fish-eye 缩略导航
│       ├── MessageBubble.vue       # 消息气泡（文本 / Markdown / 图片）
│       ├── ToolUseBlock.vue        # 工具调用 + 结果展示
│       ├── ThinkingBlock.vue       # 思考过程展示
│       ├── CompactBoundary.vue     # 上下文压缩分界线
│       └── ImagePreview.vue        # 全屏图片预览器
├── layouts/
│   └── default.vue     # Dashboard 布局（UDashboardGroup + Sidebar + Panel）
├── pages/
│   ├── index.vue       # 首页空状态
│   └── session/[project]/[sessionId].vue  # 会话详情页
└── assets/css/
    └── main.css        # CSS 变量主题系统（亮色 / 深色）

server/
├── api/
│   ├── projects/index.get.ts              # GET /api/projects
│   └── sessions/[project]/[sessionId].get.ts  # GET /api/sessions/:project/:sessionId
└── utils/
    ├── jsonl-parser.ts     # 流式 JSONL 解析（异步生成器 + 类型过滤）
    └── projects-scanner.ts # 项目目录扫描（并行文件操作）

shared/
└── types/
    └── project.ts      # ProjectInfo / SessionInfo 共享类型
```

## 数据流

```
~/.claude/projects/        server/utils/            server/api/
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│  JSONL file        │───▶│  projects-scanner  │───▶│  GET /projects     │
│  (Conversation     │    │  jsonl-parser      │    │  GET /sessions     │
│   record)          │    │                    │    │                    │
└────────────────────┘    └────────────────────┘    └─────────┬──────────┘
                                                              │
                          app/composables/                    │
                          ┌──────────────────────┐            │
                          │  useProjects         │◀───────────┘
                          │  useSession          │
                          │  useConversationTree │──▶ ConversationTurn[]
                          └─────────┬────────────┘
                                    │
                          app/components/
                          ┌──────────────────────┐
                          │  ConversationView    │
                          │  MessageBubble       │
                          │  ToolUseBlock        │
                          │  ThinkingBlock       │
                          │  ConversationMinimap │
                          └──────────────────────┘
```

1. Server 扫描 `~/.claude/projects/` 目录，流式解析 JSONL 文件
2. API 返回结构化记录，支持按类型过滤（`excludeTypes` 参数）
3. `useConversationTree` 将扁平记录组织为对话 turn，配对 tool_use 与 tool_result
4. 组件按类型渲染：用户消息、Assistant 文本、Thinking 块、工具调用（可折叠）

## 数据源

Claude Lens 读取 `~/.claude/projects/` 目录。该目录由 Claude Code CLI 自动生成，包含每次交互的 JSONL 格式对话记录。

## License

MIT
