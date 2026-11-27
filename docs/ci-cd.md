# GitHub 检查和本地打包

首阶段用 GitHub Actions 在 Linux 上检查提交和 Pull Request。本地生成 `.deb`，供项目所有者安装和验收。

## GitHub 检查

| 项目 | 配置 |
| --- | --- |
| 触发 | 推送到 `main` 或发起、更新面向 `main` 的 Pull Request。 |
| 环境 | Ubuntu runner 和 Node.js 24。 |
| 步骤 | 安装锁定依赖，运行 TypeScript 类型检查和自动化测试，再构建共用界面和 Electron 入口。 |
| 通过条件 | 所有检查成功，构建过程正常退出。 |

工作流位于 `.github/workflows/ci.yml`。本地可运行 `npm ci`、`npm run typecheck`、`npm test` 和 `npm run build` 复现检查。自动化测试覆盖导图生成、连线、布局及旧版画布读写。

## Linux 安装验收

运行 `npm run package:linux`，在 `release/` 生成 `.deb`。安装后检查启动即全屏、可切换全屏，以及重启后工作区可恢复。
