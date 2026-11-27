# 设置

点击侧栏左下角「更新公告」旁的齿轮打开设置。桌面端的界面缩放支持 80% 至 150%，可一键恢复到 100%。按 Ctrl 加号、Ctrl 减号或 Ctrl 0 时，面板同步显示窗口的缩放比例。

| 文件与接口 | 调用方 | 职责 |
| --- | --- | --- |
| `SettingsDialog({ zoom, onClose })` | `App` | 打开设置弹窗，展示界面缩放并处理关闭。 |
| `WindowZoom.getPercent()` 与 `onChange(listener)` | `SettingsDialog` | 读取缩放比例，订阅设置面板或快捷键触发的变化，关闭后取消订阅。 |
| `WindowZoom.setPercent(percent)` | `SettingsDialog` | 通过桌面桥接请求调整界面缩放。 |
| `setZoomPercent(window, percent)`，`desktop/window.ts` | 桌面 IPC 和窗口快捷键 | 限制缩放范围，调整 Electron 窗口内容比例，并把结果通知界面。 |

## 界面语言

在「界面语言」下选择简体中文或 English。工作台、画布工具和编辑器的界面文案会立即切换，应用会在本地记住选择。`setInterfaceLanguage(language)` 由设置页调用，英语词条集中在 `src/i18n/en.ts`。可在笔记或思维导图中发起独立的内容翻译。[笔记和导图翻译](../../function/note-translation/note-translation.md)
