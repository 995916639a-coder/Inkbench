# Inkbench 项目约定

## 项目和交付

- Inkbench 是面向程序员的 Linux 本地笔记应用。桌面版使用 Electron，以 `.deb` 交付，启动即全屏。浏览器预览通过 Vite 复用 React 和 TypeScript 界面。可视化编辑器使用 Tiptap。
- 工作区由 App 在本地管理。把笔记放到画布时复制标题和正文。思维导图支持 Markdown 生成和 PNG 导出。项目源码分析和其他内容的导出属于后续版本。
- 支持导入本地 Markdown 文件，可创建笔记或独立的画布卡片。1.1.0 新增思维导图。

## 目录和职责

| 位置 | 职责 |
| --- | --- |
| `desktop/` | Electron 的窗口、全屏和本地文件读写。 |
| `index.html`、`src/main.tsx` | 桌面和浏览器共用的界面入口。 |
| `src/app/` | 组合工作台、侧栏和页面，协调工作区保存。 |
| `src/views/` | 笔记、画布和更新公告等页面及交互。 |
| `src/function/` | 提供页面调用的底层能力，按文档、画布对象、绘制、视口等职责划分。 |
| `src/editor/` | 笔记页和卡片共用的可视化编辑器。 |
| `src/workspace/` | 工作区数据、存储接口和示例。 |
| `docs/` | 需求、架构和 CI/CD 说明。 |
| `tests/` | 关键能力和本地存储的回归测试。 |

工作台组装页面，页面调用能力。新增独立能力时，在 `src/function/` 按职责建目录，由 `index.ts` 提供上层实际使用的入口。优先使用具名函数、React 函数组件和 TypeScript 类型。页面与能力各有同名 Markdown，例如 `views/notes/notes.md` 和 `function/viewport/viewport.md`。说明应记录简单用法、代码流程、文件职责、关键入口的调用方、输入、输出和效果。有类时记录类名与上层调用的方法。

## 开发与交接

- 每次新增功能前新建独立分支，在功能分支内开发、检查和提交。独立功能从主分支开始，依赖尚未合并的功能时从对应功能分支开始。由项目所有者负责将功能分支合并到主分支。
- 小型 bug 修复或小功能补充增加补丁版本号，例如 `1.0.0 → 1.0.1`。新增主要功能模块时增加次版本号，并将补丁版本号归零，例如新增思维导图时由 `1.0.0` 升至 `1.1.0`。更新版本时同步修改 `package.json`、`package-lock.json` 和 `update.md`。
- 每轮更新结束前同步更新根目录的 `update.md`，最新版本放在顶部。公告只用短句说明用户能感知的变化和最简单的用法，同类改动合并为一条。
- 修改或新增 `function/` 能力与 `views/` 页面时，同步更新各自的 Markdown 说明。实现细节和维护记录写在对应的项目文档中。
- `README.md` 面向外部用户，只放项目简介、界面预览、功能介绍和使用方法。
- 初始开发顺序为需求与架构文档、CI/CD 方案、仓库上传、文件骨架、关键接口审阅、功能实现。用户要求分阶段审阅时，等该阶段通过后继续。
- 使用 Node.js 24 和 npm。验证运行 `npm ci`、`npm run typecheck`、`npm test` 和 `npm run build`。涉及打包时运行 `npm run package:linux`。GitHub Actions 为 `main` 的每次成功构建上传安装包，新版本会从 `update.md` 取得说明并自动发布到 Releases。

详细说明见 [首版需求](../docs/requirements.md)、[架构设计](../docs/architecture.md) 和 [CI/CD](../docs/ci-cd.md)。
