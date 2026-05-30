# ZS2 Modkit

《再刷一把2：金色传说》的本地单机工具集，包含运行时修改器、离线存档编辑器、数据导出/重打包脚本和浏览器 bridge 注入逻辑。工具文件全部放在 `zs2_modkit` 下，默认不修改原游戏的 `package.json`、`www/index.html` 或数据文件。

## 功能概览

- GUI 修改器：金币、变量、开关、倍率、战斗选项、物品添加、角色编辑、技能添加、天赋点、称号、换装、地图挂机、敌群挂机等。
- 宝宝分类：宝宝列表、宝宝技能添加、可学习点数/技能槽位修改。
- 离线存档编辑器：读取 `.rpgsave`，转换为 JSON 树形编辑，支持导入、导出和校验；不再内置快捷修改按钮。
- 数据工具：解包 `www/data.pak`、`www/useData`、`www/save/*.rpgsave`，并可将存档 JSON 重新打包回 `.rpgsave`。
- 运行时 bridge：启动原始 `Game.exe` 并通过本地 extension 注入，不替换游戏文件。

参考项目里的钓鱼功能和熟练系统已移除，因为当前游戏没有对应系统。

## 环境要求

- Windows
- 已安装《再刷一把2：金色传说》
- Node.js/npm 命令行可用
- PowerShell

首次使用建议确认：

```powershell
node --version
npm.cmd --version
```

如果 `zs2_modkit` 不在游戏根目录下，可以复制 `config.example.json` 为 `config.local.json`，并把 `gameRoot` 改成包含 `www/index.html` 的游戏目录。也可以通过脚本参数 `-GameRoot` 或环境变量 `ZS2_GAME_ROOT` 指定。

## 快速开始

进入工具目录：

```powershell
cd "F:\SteamLibrary\steamapps\common\再刷一把2：金色传说\zs2_modkit"
```

启动 GUI 修改器：

```powershell
.\tools\launch-gui.ps1
```

如果 PowerShell 拦截 `.ps1`，可以单次绕过：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tools\launch-gui.ps1"
```

启动离线存档编辑器：

```powershell
.\tools\launch-save-editor.ps1
```

## 常用脚本

```text
tools/launch-gui.ps1          启动 GUI 修改器
tools/launch-runtime.ps1      只启动带 bridge 的游戏
tools/trainer-send.mjs        CLI 发送修改器命令
tools/launch-save-editor.ps1  启动离线存档树形编辑器
tools/extract-all.ps1         导出 data.pak、useData、存档
tools/extract-data-pak.mjs    导出 www/data.pak
tools/extract-usedata.mjs     导出 www/useData
tools/extract-saves.ps1       导出 www/save/*.rpgsave
tools/encrypt-saves.ps1       将存档 JSON 重新打包为 .rpgsave
tools/setup-runtime.ps1       生成 GUI 所需 NW 运行时链接并安装依赖
tools/clean-runtime.ps1       清理生成产物、运行状态和本地依赖
```

## 目录结构

```text
app/gui/                 GUI 修改器 NW 应用，源码为 app.ts
app/save-editor/         Vite + React 离线存档树形编辑器
runtime/bridge/          本地 extension 和 page bridge
runtime/bridge-state/    命令队列、状态、事件和日志，运行时生成
runtime/save-harness/    NW harness/字节码提取目标
runtime/trainer/         只启动游戏并注入 bridge 的轻量 NW 入口
tools/                   CLI 和数据脚本
output/extract/          导出的数据、useData、存档 JSON，运行时生成
output/repack/           重新打包后的存档，运行时生成
output/backup/           GUI 备份目录，运行时生成
docs/                    使用和技术文档
```

仓库只保留源码、脚本、配置示例和包锁。`node_modules`、NW 运行时硬链接、解包数据、存档、日志、Vite `dist` 和 TypeScript 构建缓存都被 `.gitignore` 排除。

## 当前适配点

- `manifest.enc` bootstrap key: `e5c8bec60f27777fdc7161d01125819d`
- `www/data.pak`: `PAKX` 头 + 二进制索引 + 顺序 `PAK1` 条目；条目内旧 AES JSON envelope 会用 `manifest.key` 再解一层，最终导出可读 RPG Maker JSON。
- `www/useData`: 文件无 `.data` 后缀，格式是 `gzip -> 跳过 20 字节前缀 -> MessagePack`。
- `www/save/*.rpgsave`: `base64 -> zlib inflate -> MessagePack`，没有参考项目的 AES/HMAC v2 外壳。
- 运行时修改器启动原始 `Game.exe`，并用 `--load-extension=<zs2_modkit/runtime/bridge>` 注入 bridge；这样游戏看到的可执行文件路径仍是原安装目录。

## 验证

常用检查：

```powershell
node --check .\tools\modkit-config.mjs
node --check .\tools\extract-data-pak.mjs
node --check .\tools\extract-usedata.mjs
node --check .\tools\extract-saves.mjs
node --check .\tools\encrypt-saves.mjs
node --check .\tools\trainer-send.mjs
node --check .\runtime\bridge\page-bridge.js
```

构建：

```powershell
Push-Location .\app\gui
npm.cmd install
npm.cmd run build
Pop-Location

Push-Location .\app\save-editor
npm.cmd install
npm.cmd run build
Pop-Location
```

运行时验证：

```powershell
.\tools\setup-runtime.ps1 -Force
.\tools\extract-all.ps1
.\tools\encrypt-saves.ps1
node .\tools\trainer-send.mjs ping
```

`ping` 正常时会返回 `ok=true`，并确认 bridge 状态中 `hasParty`、`hasVariables`、`hasSwitches`、`hasDataManager`、`hooksPatched` 可用。

## 清理

预览清理范围：

```powershell
.\tools\clean-runtime.ps1 -IncludeDependencies -DryRun
```

实际清理：

```powershell
.\tools\clean-runtime.ps1 -IncludeDependencies
```

这会清理本地生成的 NW 运行时链接、GUI 编译产物、Vite 产物、解包/重打包输出、bridge 状态日志和依赖目录。清理后再次启动工具时，脚本会按需重新安装依赖、提取数据或生成运行时链接。

## 许可证

本仓库使用 GPL-3.0-only，详见 [LICENSE](LICENSE)。
