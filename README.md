# RPGMV Modkit

> 面向 RPG Maker MV/MZ 游戏的 Mod / 存档工具 monorepo。
> Runtime trainers, save editors, and data codecs for RPG Maker MV/MZ games.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 包含项目

| 目录 | 目标游戏 | 主要能力 |
|------|---------|---------|
| [`zs2-modkit`](./zs2-modkit) | 《再刷一把2：金色传说》 | 运行时 GUI 修改器、离线存档编辑器、数据/存档编解码 |
| [`nwr-modkit`](./nwr-modkit) | 《梦魇：无归》 | 运行时 GUI 修改器、离线存档编辑器、监狱/护栏诊断 |
| [`dq2-modkit`](./dq2-modkit) | 《大千世界2 The Stupendous World Demo》 | 运行时 GUI 修改器、离线存档编辑器、数据解密 |
| [`tsw-save-edit`](./tsw-save-edit) | 《大千世界》 | Web 存档编辑器（JSON 树 + 结构化字段） |
| [`tsw-save-edit-pro`](./tsw-save-edit-pro) | 《大千世界》 | Web 存档背包/物品编辑器 |

## 技术栈

- **React 18 + TypeScript + Vite**
- **Tailwind CSS + shadcn/ui 风格共享组件库**：[`packages/ui`](./packages/ui)
- 所有前端 UI 使用 `packages/ui` 组件与 Tailwind 工具类，不再手写 CSS。

## 快速开始

需要 Node.js 18+ 与 npm。

```bash
# 安装依赖
npm install

# 构建全部应用与 bridge
npm run build
```

构建完成后，各子项目产物位于各自目录的 `dist/` 中。

## 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm run ui:build` | 构建共享 UI 库 |
| `npm run build:web` | 构建 `tsw-save-edit` 与 `tsw-save-edit-pro` |
| `npm run build:save-editors` | 构建各 modkit 的离线存档编辑器 |
| `npm run build:gui` | 构建各 modkit 的运行时 GUI 修改器 |
| `npm run build:bridge` | 构建运行时注入 bridge |
| `npm run build` | 依次执行以上全部 |

## 项目结构

```text
.
├── packages/ui              # 共享 React / Tailwind 组件库
├── zs2-modkit               # 再刷一把2 modkit
│   ├── app/gui              # 运行时修改器（NW.js / 浏览器）
│   ├── app/save-editor      # 离线存档编辑器
│   ├── runtime/bridge       # 运行时注入 bridge
│   ├── tools/               # 数据/存档编解码脚本
│   └── docs/                # 文档
├── nwr-modkit               # 梦魇：无归 modkit
├── dq2-modkit               # 大千世界2 modkit
├── tsw-save-edit            # 大千世界存档编辑器
└── tsw-save-edit-pro        # 大千世界存档编辑器 Pro
```

## 历史

本仓库由多个独立项目合并而来，保留了各自的完整 Git 提交历史：

| 原仓库 | 新目录 |
|--------|--------|
| `github.com/MengTL4/zs2_modkit` | [`zs2-modkit`](./zs2-modkit) |
| `github.com/MengTL4/nwr_modkit` | [`nwr-modkit`](./nwr-modkit) |
| `github.com/MengTL4/dq2_modkit` | [`dq2-modkit`](./dq2-modkit) |
| `github.com/MengTL4/The-Stupendous-World-SaveEdit` | [`tsw-save-edit`](./tsw-save-edit) |
| `github.com/MengTL4/The-Stupendous-World-SaveEditPro` | [`tsw-save-edit-pro`](./tsw-save-edit-pro) |

## 注意

- 本项目仅提供工具源码与可复现脚本，**不包含任何游戏本体、解密后的游戏数据、运行时二进制或用户存档**。
- 使用修改器与存档编辑器可能影响游戏体验，请自行备份存档。
- 各子项目的具体用法、安装位置与配置见各自目录下的 README。

## 许可证

`zs2-modkit` 采用 [GPL-3.0](./zs2-modkit/LICENSE)。
其他子项目许可证见各自目录；如无单独声明，默认遵循仓库根目录许可证。
