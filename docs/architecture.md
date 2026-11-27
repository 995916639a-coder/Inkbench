# 架构设计

墨栈使用 Electron 管理 Linux 应用窗口，React 和 TypeScript 实现界面与业务操作，Vite 提供浏览器预览。两个运行入口共用同一套 React 页面。可视化编辑器计划采用 Tiptap，正文保存为结构化数据。

## 入口和页面

| 文件 | 职责 |
| --- | --- |
| `index.html`、`src/main.tsx` | 提供共用的 HTML 入口并挂载 React。浏览器通过 Vite 打开，桌面版由 Electron 窗口加载。 |
| `src/app/App.tsx` | 组装工作台，管理当前打开项，接收页面更新并协调保存。 |
| `src/app/Sidebar.tsx` | 显示笔记和画布列表，并把新建、切换等操作交给工作台。 |
| `src/views/notes/NotesView.tsx` | 组织笔记页面和编辑流程。 |
| `src/views/canvas/CanvasView.tsx` | 组织画布界面、工具栏和鼠标交互，调用底层能力更新画布。 |
| `src/editor/RichTextEditor.tsx` | 为笔记页面和画布卡片提供共用的可视化编辑器。 |

## 底层能力

| 目录 | 职责 |
| --- | --- |
| `src/function/documents/` | 创建笔记和复制正文。 |
| `src/function/canvas-items/` | 管理文本框、笔记卡片和已提交的笔迹。 |
| `src/function/drawing/` | 将指针输入整理成一笔可保存的轨迹。 |
| `src/function/viewport/` | 计算平移、缩放和坐标转换。 |

工作台组装页面，页面调用能力，底层能力接收数据并返回结果。能力通过各自的 `index.ts` 提供上层实际使用的入口。React 组件和业务操作以具名函数为主，数据结构用 TypeScript 类型。

例如，把笔记放到画布上时，工作台向画布页面提供笔记列表。用户选定笔记和放置点后，画布页面依次调用文档、视口和画布对象模块，复制正文、换算坐标并创建卡片。工作台接收更新后的画布并保存。卡片拥有自己的标题、正文和位置。

未来可增加 `src/function/project-analysis/` 读取项目源码并生成节点和关系。工作台负责导入入口，画布页面负责组织展示和编辑。连线属于画布相关能力，分析规则留在项目分析模块。

## 桌面和工作区

| 文件 | 职责 |
| --- | --- |
| `desktop/main.ts` | 启动 Electron，创建全屏工作台窗口并处理桌面请求。 |
| `desktop/preload.ts` | 向界面提供加载、保存工作区和切换全屏的接口。 |
| `desktop/workspaceStore.ts` | 在应用数据目录读取和保存 `workspace.json`。写入同目录临时文件后替换正式文件。 |
| `src/workspace/workspace.ts` | 定义工作区数据和读取、保存接口。 |
| `src/workspace/desktopWorkspace.ts` | 通过桌面接口加载和保存正式工作区。 |
| `src/workspace/browserWorkspace.ts` | 为浏览器预览提供内存中的工作区。 |
| `src/workspace/sampleWorkspace.ts` | 提供桌面版首次启动和浏览器预览共用的示例。 |

工作区记录笔记、画布、当前打开条目和画布视口。应用首次创建工作区时添加示例，重启时从已保存的数据恢复。写入按顺序完成，保存失败时界面保留当前编辑内容并允许重试。应用正常退出前完成最后一次保存。

## 功能文档

页面和能力各自用目录同名的 Markdown 文档说明职责。例如，`views/canvas/canvas.md` 描述操作和调用顺序，`function/viewport/viewport.md` 描述视口计算。接口设计审阅时，每个关键入口会记录名称、所在文件、调用方、输入、输出和效果。有类时记录类名和被调用的方法。
