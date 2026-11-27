# 架构设计

墨栈使用 Electron 管理 Linux 应用窗口，React 和 TypeScript 实现界面与业务操作，Vite 提供浏览器预览。两个运行入口共用同一套 React 页面。可视化编辑器计划采用 Tiptap，正文保存为结构化数据。

## 入口和页面

| 文件 | 职责 |
| --- | --- |
| `index.html`、`src/main.tsx` | 提供共用的 HTML 入口并挂载 React。浏览器通过 Vite 打开，桌面版由 Electron 窗口加载。 |
| `src/app/App.tsx` | `App` 接收工作区存储和可选的全屏切换回调，组装工作台并协调保存。 |
| `src/app/Sidebar.tsx` | `Sidebar` 接收条目和当前打开项，通过回调请求新建、打开、重命名或删除。 |
| `src/views/notes/NotesView.tsx` | `NotesView` 接收笔记，通过 `onChange` 返回更新后的笔记。 |
| `src/views/canvas/CanvasView.tsx` | `CanvasView` 接收画布和可选择的笔记，通过 `onChange` 返回更新后的画布。 |
| `src/editor/RichTextEditor.tsx` | `RichTextEditor` 接收结构化正文，通过 `onChange` 返回更新后的正文。 |

## 底层能力

| 目录 | 职责 |
| --- | --- |
| `src/function/documents/` | 创建笔记和复制正文。 |
| `src/function/canvas-items/` | 管理文本框、笔记卡片和已提交的笔迹。 |
| `src/function/drawing/` | 将指针输入整理成一笔可保存的轨迹。 |
| `src/function/viewport/` | 计算平移、缩放和坐标转换。 |

工作台组装页面，页面调用能力，底层能力接收数据并返回结果。能力通过各自的 `index.ts` 提供上层实际使用的入口。React 组件和业务操作以具名函数为主，数据结构用 TypeScript 类型。

例如，把笔记放到画布上时，工作台向画布页面提供笔记列表。用户选定笔记和放置点后，`CanvasView` 依次调用 `copyDocumentContent()`、`screenToCanvas()` 和 `addNoteCard()`，最后用 `onChange` 把更新后的画布交给 `App`。卡片拥有自己的标题、正文和位置。

未来可增加 `src/function/project-analysis/` 读取项目源码并生成节点和关系。工作台负责导入入口，画布页面负责组织展示和编辑。连线属于画布相关能力，分析规则留在项目分析模块。

## 桌面和工作区

| 文件 | 职责 |
| --- | --- |
| `desktop/main.ts` | 创建全屏窗口，初始化工作区存储并处理桌面请求。 |
| `desktop/preload.ts` | 将 `DesktopBridge` 提供给界面，用于加载、保存及切换全屏。 |
| `desktop/workspaceStore.ts` | `createWorkspaceStore(filePath)` 返回文件存储，在应用数据目录读写 `workspace.json`。保存时写入同目录临时文件，再替换正式文件。 |
| `src/workspace/workspace.ts` | 定义 `Workspace`、`CanvasDocument` 和加载、保存接口。`createCanvas(id, title?)` 创建空白画布。 |
| `src/workspace/desktopWorkspace.ts` | 定义桌面接口 `DesktopBridge`。桌面窗口通过 `window.inkbench` 提供该接口。 |
| `src/workspace/browserWorkspace.ts` | `createBrowserWorkspaceStorage()` 返回内存存储，用于浏览器预览。 |
| `src/workspace/sampleWorkspace.ts` | `createSampleWorkspace()` 返回首启和浏览器预览共用的示例工作区。 |

| 对外接口 | 调用方 | 输入与结果 |
| --- | --- | --- |
| `loadWorkspace()` | `App` | 返回已保存的工作区。尚未创建工作区时返回 `null`，由工作台载入示例。 |
| `saveWorkspace(workspace)` | `App` | 接收完整工作区，写入完成后返回。 |
| `toggleFullscreen()` | `App` | 切换 Electron 窗口全屏状态，并返回切换后的状态。 |

工作区记录数据版本、笔记、画布和当前打开条目。每张画布保存自己的视口。读取或保存失败会报告错误，界面保留当前内容并允许重试。写入按顺序完成，应用正常退出前完成最后一次保存。

## 功能文档

页面和能力各自用目录同名的 Markdown 文档说明职责。页面文档描述用法和调用顺序，能力文档列出函数名、所在文件、调用方、输入和输出。可以从画布操作顺着调用链看到坐标转换函数。[画布页面](../src/views/canvas/canvas.md) · [视口能力](../src/function/viewport/viewport.md)

源文件中的声明是本轮审阅对象，函数体和运行时导出随实现阶段补齐。
