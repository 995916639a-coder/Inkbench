# CI/CD 方案草稿

首阶段用 GitHub Actions 在 Linux 上检查提交和 Pull Request。本地生成 `.deb`，供项目所有者安装和验收。

## GitHub 检查

| 项目 | 草案 |
| --- | --- |
| 触发 | 推送到 `main` 或发起、更新面向 `main` 的 Pull Request。 |
| 环境 | Linux runner，Node.js 主版本与本地开发约定一致。 |
| 步骤 | 安装锁定依赖，运行 TypeScript 类型检查，再构建共用界面和 Electron 入口。 |
| 通过条件 | 所有检查成功，构建过程正常退出。 |

依赖锁文件和构建脚本就绪后，再添加 GitHub Actions 配置。届时在本地先跑同样的检查，确保两个入口都能完成构建。

## Linux 安装验收

在本地构建 `.deb`，安装后检查启动即全屏、可切换全屏，以及重启后工作区可恢复。
