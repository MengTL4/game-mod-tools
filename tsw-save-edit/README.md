# tsw-save-edit

RPG Maker 存档加解密网页工具，支持大体积 JSON 树形编辑。

## 功能

- 解密：`base64 -> zlib -> MessagePack -> JSON`
- 加密：JSON 回写为存档文本
- 树形 JSON 编辑（可逐节点展开/收缩）
- 标记类型安全往返：
  - `$binary`
  - `$ext`
  - `$map`
  - `$bigint`
- 可选保留源存档前后缀（例如 `1#SR|...`）

## 运行

在 monorepo 根目录：

```bash
npm install
npm run build:web
```

单独开发：

```bash
cd tsw-save-edit
npm install
npm run dev
npm run build
```

## Python 辅助脚本（可选）

项目根目录还保留了旧版 Python CLI，用于批量解密 `useData` / `data.pak`：

```bash
python useData_tool.py batch-decode useData useData_decoded --overwrite
python data_pak_tool.py batch-decode data.pak data_decoded_pycrypto --overwrite
python save_tool.py --help
```

## 说明

- 工具不会自动改游戏资源文件，只处理你手动加载/导出的文本。
- `useData_tool.py` / `data_pak_tool.py` 是历史 Python 实现，新的 web 工具只负责单文件存档加解密与 JSON 编辑。
