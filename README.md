# Sync Reminder

为官方 Obsidian Sync 增加电脑、Android、iOS 都可显示的中文浮窗。

- 正在同步：浮窗持续显示“正在同步中…”，提醒等待后再编辑。
- 同步完成：收到官方明确的完成状态后显示“同步完成”，默认 5 秒后隐藏，可设置持续显示。
- 检查、暂停、未连接、错误、无法识别状态分别显示，不将停止活动当作同步完成。
- 默认在右上角显示紧凑提示，可切换右下角；支持手机安全区域，不遮挡点击操作。
- “仅显示小图标”：使用 30px 图标浮窗，同步时旋转，完成显示绿色勾号，异常使用对应图标。
- “仅提醒启动时的同步”：首次确认同步完成后提示 5 秒，随后本次启动不再自动提示（包括异常提示）。切回前台不会重置；重启应用或重新启用插件会重置。此模式优先于“同步完成后持续显示”，仍可使用命令手动查看状态。

## 安装

从 [GitHub Releases](https://github.com/HEIXIZHU/sync-reminder/releases) 下载 `main.js`、`manifest.json`、`styles.css`，放入仓库的 `.obsidian/plugins/sync-reminder/` 目录。在 Obsidian 设置 → 第三方插件中刷新列表，启用 **Sync Reminder**。如果没有出现，重启 Obsidian。需要开启官方核心插件 **Sync** 并连接远程仓库。

手机端将 `main.js`、`manifest.json`、`styles.css` 放入对应仓库的 `.obsidian/plugins/sync-reminder/`。无需复制源码或安装 Node.js。如果使用官方 Sync 传递插件，请在两端的 Sync 设置中启用第三方插件和相关配置同步，等待文件传输完成，再重启手机 Obsidian 并确认插件已启用。

## 接口与限制

官方公开的插件类型定义没有 Sync 状态 API。目前采用只读内部接口：`app.internalPlugins` 中的 Sync 实例、`getStatus()`、`status-change` / `new-log` 事件以及 `syncLog` 内存日志。事件订阅失败时每秒查询一次；卸载清理事件、计时器和浮窗。没有修改、暂停或触发同步。

已核对本机桌面 Obsidian 1.14.4 的实现。手机使用同一份不依赖 Node.js 的运行文件，但尚未在真实 Android / iOS 设备上验证。内部接口可能随版本变化；缺失时显示“无法确认同步状态”，请查看官方同步图标或活动日志。

官方同步日志不会在应用关闭后保留，不能按固定磁盘日志文件读取。日志后备只识别明确的 `Fully synced`，单个文件的 `Upload complete` / `Download complete` 不代表整个仓库完成。

提示表示官方 Sync 当前报告的本机同步状态。它不能保证另一台设备已经上传了全部改动，也不锁定编辑器或保证消除冲突；应先在原设备等待同步完成，再切换设备。后台挂起期间插件无法工作。

## 开发和验证

无需额外依赖：`npm run build` 将 `plugin.js` 和 `status.js` 合并为独立 `main.js`；`npm test` 验证状态判定。发布和手机安装仅需三个运行文件。

真实设备验收：从另一设备修改文件 → 打开本设备，确认同步中持续显示 → 完成提示出现；暂停同步、关闭网络、恢复网络、后台切回以及禁用插件时分别检查提示和清理情况。命令面板中的“显示官方同步状态”可重新显示当前提示，“预览同步浮窗”仅显示标记为预览的通知。

资料：
- [官方插件 API 类型定义](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)
- [官方 Sync 状态和日志说明](https://obsidian.md/help/sync/messages)
