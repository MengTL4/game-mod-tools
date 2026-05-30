# ZS2 Modkit

这是《再刷一把2：金色传说》的本地工具项目目录，集中放置运行时修改器、离线存档树形编辑器、数据解包脚本、运行时 bridge 和文档。

## 快速入口

首次使用前先确认本机有命令行版 Node.js/npm：

```powershell
node --version
npm.cmd --version
```

脚本最低要求 Node.js 18+；新装建议直接安装当前 LTS 版。任选一种：

```powershell
winget install -e --id OpenJS.NodeJS.LTS
```

也可以去 [Node.js 官网](https://nodejs.org/zh-cn/download) 下载 Windows LTS 安装包。安装后重新打开 PowerShell，让 `node` 和 `npm.cmd` 进入 PATH。

如果 Windows 提示“无法加载 .ps1，因为在此系统上禁止运行脚本”，任选一种处理：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

或者进入项目目录后，不修改执行策略，单次绕过执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\tools\launch-gui.ps1"
```

先进入项目目录。最推荐把 `zs2_modkit` 放在游戏根目录下，也就是和 `Game.exe`、`www` 同级；这种布局不需要配置游戏路径，直接启动即可：

```powershell
cd "<你的 zs2_modkit 目录>"
.\tools\launch-gui.ps1
```

只有当 `zs2_modkit` 不在游戏根目录下时，才需要复制本地配置并把 `gameRoot` 改成自己的游戏根目录：

```powershell
Copy-Item .\config.example.json .\config.local.json
notepad .\config.local.json
```

`gameRoot` 指向包含 `Game.exe` 和 `www\index.html` 的目录。`config.local.json` 已被 Git 忽略，每个用户可以写自己的路径。

常用脚本：

```text
tools/launch-gui.ps1          启动 GUI 修改器
tools/launch-save-editor.ps1  启动离线存档树形编辑器
tools/launch-runtime.ps1      只启动 bridge 版游戏
tools/setup-runtime.ps1       从配置的游戏目录生成/刷新 NW 运行时链接
tools/clean-runtime.ps1       清理生成的 NW 运行时链接、输出和本地依赖
tools/trainer-send.mjs        CLI 发送修改器命令
tools/extract-all.ps1         导出 data.pak、useData、存档
tools/extract-data-pak.mjs    导出 data.pak
tools/extract-usedata.mjs     导出 useData
tools/extract-saves.ps1       导出存档
tools/encrypt-saves.ps1       重新打包存档
```

文档：

```text
docs/工具使用说明.md
docs/技术实现文档.md
```

## 结构

```text
app/gui/                 GUI 修改器 NW 应用，app.ts 编译为 app.js
app/save-editor/         纯网页离线存档树形编辑器
runtime/trainer/         bridge 版游戏启动器
runtime/bridge/          注入游戏页面的 bridge 脚本
runtime/bridge-state/    命令队列、状态、日志
runtime/save-harness/    保留的 NW harness/字节码提取目标
tools/                   CLI 和数据脚本
output/extract/          解包导出结果
output/repack/           重新打包输出
output/backup/           GUI 备份目录
docs/                    使用和技术文档
skills/                  复刻本项目用的 Codex skill
```

推荐把这个目录放在游戏根目录下，此时工具会自动用 `zs2_modkit` 的父目录作为游戏目录。也可以放在任意位置，只要通过 `-GameRoot`、环境变量 `ZS2_GAME_ROOT` 或 `config.local.json` 指定游戏根目录即可。

## 运行时生成

`app/gui`、`runtime/trainer`、`runtime/save-harness` 里的 NW 运行时文件不是项目源码，而是由脚本从配置的游戏根目录生成的硬链接/目录联接。`app/save-editor` 是纯网页工具，不需要 NW 运行时。游戏更新后执行：

```powershell
.\tools\setup-runtime.ps1 -Force
```

启动 GUI、启动 bridge、导出存档时，如果运行时文件缺失，也会自动调用 setup。

`setup-runtime.ps1` 还会安装工具脚本依赖，并从当前游戏版本的 `www/js/*.jsc.pak` 重新提取 harness 需要的字节码。也就是说游戏更新后刷新脚本即可，不需要手动把运行时文件搬进项目。

依赖安装默认使用：

```text
https://registry.npmmirror.com
```

如需指定其它 npm registry：

```powershell
.\tools\setup-runtime.ps1 -NpmRegistry "https://registry.npmmirror.com"
```

也可以设置环境变量：

```powershell
$env:ZS2_NPM_REGISTRY = "https://registry.npmmirror.com"
```

## GUI TypeScript

GUI 修改器源码是 `app/gui/app.ts`，NW 实际加载的是编译后的 `app/gui/app.js`。开发时手动构建：

```powershell
cd .\app\gui
npm.cmd install --registry https://registry.npmmirror.com
npm.cmd run build
```

`tools/launch-gui.ps1` 会在发现 `app.ts` 比 `app.js` 新，或 `app.js` 缺失时自动执行同样的构建流程；启动前也会检查 `output/extract/data`。如果 `data.pak` 还没导出、关键 JSON 缺失，或游戏更新后数据过期，会自动运行 `extract-data-pak.mjs` 生成 GUI 列表数据。

GUI 里已经按当前游戏移除参考项目里的钓鱼功能和熟练系统。当前主要分类：

```text
常用        金币、变量、开关、倍率、战斗选项、保存
物品角色    物品添加、角色编辑、技能添加、天赋点
宝宝        宝宝列表、宝宝技能添加、可学习点数/技能槽位
成长解锁    称号解锁、换装解锁
脱机挂机    地图挂机
敌群挂机    敌群挂机
调试        自定义 JSON 命令
```

物品、技能、角色、变量、开关、地图、敌群等长列表默认分页显示。列表首次打开停在首页，搜索会重新回到首页；直接选择 ID 时再跳到包含该项的页。

需要清空这些生成产物时执行：

```powershell
.\tools\clean-runtime.ps1
```

默认会删除 NW 运行时链接、harness 字节码、GUI 编译产物、Vite 产物、bridge 状态和 `output/extract`、`output/repack` 下的生成输出；不会删除 `output/backup`。如果需要连依赖也一起清理：

```powershell
.\tools\clean-runtime.ps1 -IncludeDependencies
```

## 离线存档树形编辑器

这个模块不启动游戏、不走 NW 运行时，只在浏览器里处理本地 `.rpgsave` 文件：

```powershell
.\tools\launch-save-editor.ps1
```

打开页面后选择 `config.rpgsave`、`global.rpgsave` 或 `fileN.rpgsave`，编辑 JSON 树，再导出新的 `.rpgsave`。如果文件名不是标准的 `file1.rpgsave` 这种格式，手动填槽位 ID；`global` 是 `0`。

当前游戏的存档格式是：

```text
base64 -> zlib inflate -> MessagePack -> JSON
```

离线存档编辑器只做原始 JSON 树编辑，不提供天赋、称号、换装等快捷按钮。这类快捷修改放在运行时 GUI 修改器里。

## 复刻 Skill

项目内置了一个用于从零复刻这套工具的 Codex skill：

```text
zs2_modkit/skills/
```

它包含：

- `SKILL.md`：触发说明和核心流程。
- `references/rebuild-playbook.md`：从零实现路线。
- `references/formats-and-contracts.md`：数据格式、bridge 命令和验证合约。
- `assets/zs2_modkit_template`：不含运行时生成产物的干净模板。
- `scripts/scaffold-zs2-modkit.ps1`：把模板复制到目标游戏目录的脚本。

在当前游戏根目录下可以这样测试 scaffold：

```powershell
.\zs2_modkit\skills\scripts\scaffold-zs2-modkit.ps1 -GameRoot "." -DryRun
```

要对另一个游戏目录生成项目：

```powershell
& ".\zs2_modkit\skills\scripts\scaffold-zs2-modkit.ps1" `
  -GameRoot "目标游戏目录" `
  -RunSetup
```

如果需要让 Codex 自动发现这个 skill，可以把 `zs2_modkit/skills` 作为 `zs2-modkit-builder` 放到 Codex 的全局 skills 目录；随项目归档时保持当前路径即可。

## 当前适配点

- `manifest.enc` bootstrap key: `e5c8bec60f27777fdc7161d01125819d`
- `www/data.pak`: `PAKX` 头 + 二进制索引 + 顺序 `PAK1` 条目；条目内旧 AES JSON envelope 会用 `manifest.key` 再解一层，最终导出可读 RPG Maker JSON。
- `www/useData`: 文件无 `.data` 后缀，格式是 `gzip -> 跳过 20 字节前缀 -> MessagePack`。
- `www/save/*.rpgsave`: `base64 -> zlib inflate -> MessagePack`，没有参考项目的 AES/HMAC v2 外壳。
- 运行时修改器启动原始 `Game.exe`，并用 `--load-extension=<zs2_modkit/runtime/bridge>` 注入 bridge；这样游戏看到的可执行文件路径仍是原安装目录。

## 验证

常规检查：

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
node --check .\app.js
Pop-Location

Push-Location .\app\save-editor
npm.cmd install
npm.cmd run build
Pop-Location
```

运行时检查：

```powershell
.\tools\setup-runtime.ps1 -Force
.\tools\extract-all.ps1
.\tools\encrypt-saves.ps1
node .\tools\trainer-send.mjs ping
```

`ping` 正常时会返回 `ok=true`，并确认 bridge 状态中 `hasParty`、`hasVariables`、`hasSwitches`、`hasDataManager`、`hooksPatched` 可用。

## 许可证

本仓库使用 GPL-3.0-only，详见 [LICENSE](LICENSE)。
