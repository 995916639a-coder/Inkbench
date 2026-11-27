# 架构设计

墨栈使用 Electron 管理 Linux 应用窗口，React 和 TypeScript 实现界面与业务操作，Vite 提供浏览器预览。两个运行入口共用同一套 React 页面。可视化编辑器使用 Tiptap，正文保存为结构化数据。

## 入口和页面

| 文件 | 职责 |
| --- | --- |
| `index.html`、`src/main.tsx` | 提供共用的 HTML 入口并挂载 React。浏览器通过 Vite 打开，桌面版由 Electron 窗口加载。 |
| `src/app/App.tsx` | `App` 接收工作区存储和可选的窗口大小切换回调，组装工作台并协调保存。 |
| `src/app/Sidebar.tsx` | `Sidebar` 接收条目和当前打开项，通过回调请求新建、打开、重命名或删除。 |
| `src/views/notes/NotesView.tsx` | `NotesView` 接收笔记，通过 `onChange` 返回更新后的笔记。 |
| `src/views/canvas/CanvasView.tsx` | `CanvasView` 接收画布和可选择的笔记，通过 `onChange` 返回更新后的画布。 |
| `src/views/canvas/CanvasToolbar.tsx` | `CanvasToolbar` 接收当前工具和缩放比例，通过回调请求切换工具、放置笔记、撤销笔迹和缩放。 |
| `src/views/canvas/CanvasItemsLayer.tsx`、`MindMapLayer.tsx` | 分别显示普通画布对象和导图节点，页面负责协调交互和保存。 |
| `src/views/updates/UpdatesDialog.tsx` | `UpdatesDialog` 将根目录的 `update.md` 渲染为侧栏更新公告。 |
| `src/views/settings/SettingsDialog.tsx` | `SettingsDialog` 提供桌面界面缩放控件，通过 `WindowZoom` 读写窗口比例。 |
| `src/views/translation/TranslationDialog.tsx`、`src/i18n/` | 翻译弹窗展示译文，界面词条和语言偏好由 i18next 管理。 |
| `src/editor/RichTextEditor.tsx` | `RichTextEditor` 接收结构化正文，通过 `onChange` 返回更新后的正文。 |

## 底层能力

| 目录 | 职责 |
| --- | --- |
| `src/function/documents/` | 创建笔记和复制正文。 |
| `src/function/markdown-import/` | 将本地 Markdown 文件解析为笔记和画布卡片共用的结构化正文。 |
| `src/function/mind-map/` | 管理节点和连线，从 Markdown 标题和列表生成导图。 |
| `src/function/mind-map-export/` | 将导图节点和连线绘制成 PNG。 |
| `src/function/workspace-search/` | 匹配工作区标题和内容，返回笔记、画布及导图节点的定位信息。 |
| `src/function/canvas-duplicate/` | 复制画布及其内容，为导图节点和连线分配可独立编辑的 ID。 |
| `src/function/canvas-items/` | 管理文本框、笔记卡片和已提交的笔迹。 |
| `src/function/drawing/` | 将指针输入整理成一笔可保存的轨迹。 |
| `src/function/viewport/` | 计算平移、缩放和坐标转换。 |
| `src/function/note-translation/` | 从笔记和思维导图提取可翻译文字，将译文写回原结构的副本。 |

工作台组装页面，页面调用能力，底层能力接收数据并返回结果。能力通过各自的 `index.ts` 提供上层实际使用的入口。React 组件和业务操作以具名函数为主，数据结构用 TypeScript 类型。

例如，把笔记放到画布上时，工作台向画布页面提供笔记列表。用户选定笔记和放置点后，`CanvasView` 依次调用 `copyDocumentContent()`、`screenToCanvas()` 和 `addNoteCard()`，最后用 `onChange` 把更新后的画布交给 `App`。卡片拥有自己的标题、正文和位置。

导入文件时，`App` 和 `CanvasView` 调用同一个 `importMarkdownFile()`。函数只处理用户选中的文件并返回标题与正文。将结果加入笔记或画布、保存工作区，仍由调用方处理。

导图存放在画布的可选 `mindMap` 字段里，和笔记卡片、文本框及笔迹一起保存。已有画布可以直接打开，首次添加节点时才写入导图数据。

未来可增加 `src/function/project-analysis/` 读取项目源码并生成节点和关系。工作台负责导入入口，画布页面负责组织展示和编辑。连线属于画布相关能力，分析规则留在项目分析模块。

## 桌面和工作区

| 文件 | 职责 |
| --- | --- |
| `desktop/main.ts` | 创建带系统标题栏的最大化窗口，初始化工作区存储并处理桌面请求。 |
| `desktop/window.ts` | `registerWindowShortcuts(window)` 处理 F11 和界面缩放快捷键。界面缩放使用 Electron 的页面缩放，画布视口独立保存。 |
| `desktop/preload.ts` | 将 `DesktopBridge` 提供给界面，用于加载、保存、管理窗口大小以及读取、调整和监听界面缩放。 |
| `desktop/translationService.ts`、`desktop/translationWorker.ts` | 通过独立进程在 CPU 上运行安装包内的翻译模型，并通过桌面桥接返回译文。 |
| `desktop/workspaceStore.ts` | `createWorkspaceStore(filePath)` 返回文件存储，在应用数据目录读写 `workspace.json`。保存时写入同目录临时文件，再替换正式文件。 |
| `src/workspace/workspace.ts` | 定义 `Workspace`、`CanvasDocument` 和加载、保存接口。`createCanvas(id, title?)` 创建空白画布。 |
| `src/workspace/desktopWorkspace.ts` | 定义桌面接口 `DesktopBridge`。桌面窗口通过 `window.inkbench` 提供该接口。 |
| `src/workspace/browserWorkspace.ts` | `createBrowserWorkspaceStorage()` 返回内存存储，用于浏览器预览。 |
| `src/workspace/sampleWorkspace.ts` | `createSampleWorkspace()` 返回首启和浏览器预览共用的示例工作区。 |

| 对外接口 | 调用方 | 输入与结果 |
| --- | --- | --- |
| `loadWorkspace()` | `App` | 返回已保存的工作区。尚未创建工作区时返回 `null`，由工作台载入示例。 |
| `saveWorkspace(workspace)` | `App` | 接收完整工作区，写入完成后返回。 |
| `toggleMaximized()` | `App` | 通过桌面桥接请求最大化或还原窗口，与 F11 共用 Electron 主进程中的 `toggleMaximized(window)`。 |

工作区记录数据版本、笔记、画布、当前打开条目以及侧栏是否收起。每张画布保存自己的视口。读取或保存失败会报告错误，界面保留当前内容并允许重试。写入按顺序完成，应用退出前会等待最后一次保存。若写入失败，退出窗口提供返回编辑的选项。

## 功能文档

页面和能力各自用目录同名的 Markdown 文档说明职责。页面文档描述用法和调用顺序，能力文档列出函数名、所在文件、调用方、输入和输出。可以从画布操作顺着调用链看到坐标转换函数。[画布页面](../src/views/canvas/canvas.md) · [视口能力](../src/function/viewport/viewport.md)
