# game-mod-tools

游戏 Mod / 存档工具合集。本仓库由以下独立仓库合并而来，各项目的完整 git 提交历史已保留：

| 目录 | 说明 | 原仓库 |
| --- | --- | --- |
| `zs2_modkit/` | zs2 modkit | github.com/MengTL4/zs2_modkit |
| `nwr_modkit/` | nwr modkit | github.com/MengTL4/nwr_modkit |
| `dq2_modkit/` | dq2 modkit | github.com/MengTL4/dq2_modkit |
| `The-Stupendous-World-SaveEdit/` | The Stupendous World 存档编辑器 | github.com/MengTL4/The-Stupendous-World-SaveEdit |
| `The-Stupendous-World-SaveEditPro/` | The Stupendous World 存档编辑器 Pro | github.com/MengTL4/The-Stupendous-World-SaveEditPro |

## 技术栈

- **React 18 + TypeScript + Vite**
- **Tailwind CSS + 共享 shadcn/ui 风格组件库**：`packages/ui`
- 不再手写 CSS；所有前端 UI 使用 `packages/ui` 组件与 Tailwind 工具类。

## 构建

```bash
# 根目录安装并构建所有已改造应用
npm install
npm run build
```

## 改造进度

- ✅ `The-Stupendous-World-SaveEdit` / `The-Stupendous-World-SaveEditPro`
- ✅ `zs2_modkit/app/save-editor`
- ✅ `nwr_modkit/app/save-editor`
- ✅ `dq2_modkit/app/save-editor`
- ✅ `*_modkit/app/gui`（NW.js 运行时修改器，静态 HTML → React + TypeScript）
- ✅ `runtime/bridge/*.js`、`*_modkit/tools/*.ts`（JavaScript → TypeScript）

各子项目相互独立，具体使用方法见各自目录下的 README。
