# 更新公告

## 怎么用

点击侧栏左下角的「更新公告」查看版本记录。点关闭按钮或按 Esc 返回工作台。

## 代码怎么走

| 文件或入口 | 调用方 | 输入与效果 |
| --- | --- | --- |
| `Sidebar.tsx` 的 `onShowUpdates()` | 侧栏的公告按钮 | 通知工作台打开公告。 |
| `UpdatesDialog`，`UpdatesDialog.tsx` | `App` | 将项目根目录的 `update.md` 渲染到公告弹窗。用户关闭弹窗时调用 `onClose()`。 |
| `updates.css` | `UpdatesDialog` | 定义公告的布局、样式和滚动区域。 |

每次更新把版本标题和本次变更补到 [update.md](../../../update.md) 顶部。构建时会把内容打包进桌面版和浏览器预览。
