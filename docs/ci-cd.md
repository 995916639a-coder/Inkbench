# GitHub 检查和 Linux 打包

GitHub Actions 在 Linux 上检查推送和 Pull Request。合并到 `main` 后，同一次运行会在检查通过后生成并上传 `.deb`。

## GitHub 检查

| 项目 | 配置 |
| --- | --- |
| 触发 | 推送到 `main` 或发起、更新面向 `main` 的 Pull Request。 |
| 环境 | Ubuntu runner 和 Node.js 24。 |
| 步骤 | 安装锁定依赖，运行 TypeScript 类型检查和自动化测试。Pull Request 构建界面与 Electron 入口，`main` 的推送完成构建并打包。 |
| 产物 | 成功的 `main` 运行提供 `inkbench-linux-amd64`，其中包含以应用版本命名的 `.deb`。 |

工作流位于 `.github/workflows/ci.yml`。本地可运行 `npm ci`、`npm run typecheck`、`npm test` 和 `npm run build` 复现检查。自动化测试覆盖导图生成、连线、布局及旧版画布读写。

## 下载安装包

在 GitHub 的 Actions 页面打开对应的 Build 运行，在底部 Artifacts 下载 `inkbench-linux-amd64`，解压即可得到 `.deb`。需要发布到 Releases 时，可在该版本的 Release 中添加这个安装包。[GitHub Actions](https://github.com/995916639a-coder/Inkbench/actions/workflows/ci.yml)

本机也可以运行 `npm run package:linux`，在 `release/` 生成 `.deb`。安装后检查启动即全屏、可切换全屏，以及重启后工作区可恢复。
