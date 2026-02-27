# Claude Lens

Claude Lens 是一个 Web UI 工具，用于浏览和分析 [Claude Code](https://claude.ai/code) 的对话历史记录。

它读取 `~/.claude/projects/` 目录下的 JSONL 文件，将原始记录解析为结构化的对话视图，帮助你回顾和检索与 Claude Code 的交互过程。

## 功能特性

- **项目树导航** — 侧边栏展示所有项目及会话列表，支持折叠展开，显示文件大小和最后活跃时间
- **对话视图** — 将 JSONL 记录重建为用户-助手的对话 turn，配对工具调用与返回结果
- **工具调用展示** — 可折叠的工具调用卡片，展示工具名称、输入参数（语法高亮）和执行结果
- **Thinking 块** — 展示 Claude 的推理思考过程
- **Minimap 导航** — 右侧缩略地图，用色块标识消息角色，支持点击跳转和拖拽定位
- **内容过滤** — 可开关 Thinking / Progress / System Events / Sidechain 的显示
- **大文件支持** — 流式解析 + 分页加载，支持 16MB+ 的 JSONL 文件
- **Markdown 渲染** — 消息内容自动识别并渲染 Markdown，支持代码高亮
- **图片预览** — 内联图片支持全屏预览

## 技术栈

- [Nuxt 4](https://nuxt.com/) + TypeScript
- [Nuxt UI v4](https://ui.nuxt.com/)
- [TailwindCSS v4](https://tailwindcss.com/)
- [date-fns](https://date-fns.org/)、[marked](https://marked.js.org/)、[highlight.js](https://highlightjs.org/)

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
├── types/              # TypeScript 类型定义（JSONL 记录类型、API 类型）
├── composables/        # Vue Composables（项目列表、会话加载、对话树构建）
├── components/
│   ├── sidebar/        # 侧边栏项目树
│   └── conversation/   # 对话展示组件（消息气泡、工具调用、Minimap 等）
├── layouts/            # Dashboard 布局
└── pages/              # 路由页面

server/
├── api/                # API 路由（项目列表、会话记录分页查询）
└── utils/              # 流式 JSONL 解析器、项目目录扫描
```

## 数据源

Claude Lens 读取 `~/.claude/projects/` 目录。该目录由 Claude Code CLI 自动生成，包含每次交互的 JSONL 格式对话记录。

## License

MIT
