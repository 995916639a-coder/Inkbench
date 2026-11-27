# 设置

点击侧栏左下角「更新公告」旁的齿轮打开设置。桌面端的界面缩放支持 80% 至 150%，可一键恢复到 100%。按 Ctrl 加号、Ctrl 减号或 Ctrl 0 时，面板同步显示窗口的缩放比例。

| 文件与接口 | 调用方 | 职责 |
| --- | --- | --- |
| `SettingsDialog({ zoom, onClose })` | `App` | 打开设置弹窗，展示界面缩放并处理关闭。 |
| `WindowZoom.getPercent()` 与 `onChange(listener)` | `SettingsDialog` | 读取缩放比例，订阅设置面板或快捷键触发的变化，关闭后取消订阅。 |
| `WindowZoom.setPercent(percent)` | `SettingsDialog` | 通过桌面桥接请求调整界面缩放。 |
| `setZoomPercent(window, percent)`，`desktop/window.ts` | 桌面 IPC 和窗口快捷键 | 限制缩放范围，调整 Electron 窗口内容比例，并把结果通知界面。 |

## 语言功能设计

界面语言可用 `i18next` 和 `react-i18next`。各页面从简体中文或英文词条读取界面文字，语言偏好存入本地设置。在设置面板改变语言后，菜单、按钮和提示即时刷新。笔记和画布数据继续沿用原有结构。[react-i18next](https://react.i18next.com/latest/usetranslation-hook)

笔记翻译可作为独立的 `src/function/note-translation/` 能力接入。笔记页提取 Tiptap 文档中的标题、段落和列表文字，保留代码块、行内代码、链接目标和 Markdown 结构。用户从笔记页发起翻译并预览结果，可以保存成副本。

桌面端可以用 Transformers.js 和 ONNX Runtime 在独立进程运行模型。构建时，用 electron-builder 的 `extraResources` 将运行所需模型文件随 `.deb` 安装。引擎读取应用资源目录并关闭远程模型下载。用户只需正常安装墨栈，首次翻译即可离线运行。现有两套量化 OPUS-MT 模型合计约 228 MiB，指打包前的模型和分词文件。选型时需实测安装包大小、CPU 推理时延和中英技术文档质量，并核对各模型的分发许可。[Transformers.js 本地模型配置](https://huggingface.co/docs/transformers.js/custom_usage) · [英译中模型](https://huggingface.co/Xenova/opus-mt-en-zh) · [中译英模型](https://huggingface.co/Xenova/opus-mt-zh-en)
