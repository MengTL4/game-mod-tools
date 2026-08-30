# game-mod-tools 项目记忆

## 构建约定

- 根目录使用 `npm install && npm run build` 构建全部产物。
- `runtime/bridge` 构建通过 `scripts/build-bridges.mjs` 顺序执行，避免 npm `--prefix` 段错误。
- zs2 runtime/bridge 的 `page-bridge.js` 由 `zs2_modkit/tools/build-bridge.ts` 从 `src/parts/` 合并生成，不直接走 tsc。

## 类型约定

- tools 下 .ts 脚本通过 `tsx` 运行，`tsconfig.json` 设置 `noEmit: true`。
- 各 tools 目录提供 `npm run typecheck` 用于 CI 校验。
- runtime/bridge 使用 `module: "None"` 输出浏览器可执行脚本。

## 已跟踪但应忽略的文件

- `dist/`、`*.tsbuildinfo`、`vite.config.ts.timestamp-*.mjs` 已加入 `.gitignore`；若后续又从历史提交中恢复，需 `git rm --cached` 清理。
