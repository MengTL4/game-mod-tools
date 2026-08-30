# tsw-save-edit-pro

RPG Maker 存档背包/角色/技能修改器（React + Vite + TypeScript）。

## 功能

- 解密 `.rpgsave` 存档（`base64 -> zlib -> MessagePack -> JSON`）
- 编辑库存：
  - 物品 / 武器 / 护甲 / 角色 / 技能列表浏览与批量添加
  - 已有库存直接加减、清零
- 编辑角色：
  - `actors._data.@a` 中角色的 `_hp`、`_mp`、`_tp`、`_level`、`_exp`
  - 为指定角色添加/删除技能
- 撤销栈：最多保留最近 30 步操作
- 按分类筛选并批量添加结果
- 名称模糊匹配高亮
- 自动读取项目目录 `data/` 下的数据库文件：
  - `Items.json`
  - `Weapons.json`
  - `Armors.json`
  - `Actors.json`
  - `Skills.json`

## 运行

在 monorepo 根目录：

```bash
npm install
npm run build:web
```

单独开发：

```bash
cd tsw-save-edit-pro
npm install
npm run dev
npm run build
```

## 使用步骤

1. 加载一个 `.rpgsave` 存档。
2. （可选）加载 `data_decoded_pycrypto/` 下的 `Items.json`、`Weapons.json`、`Armors.json`、`Actors.json`、`Skills.json` 以显示中文名称。
3. 在列表中筛选并点击“添加”，或使用“批量添加筛选结果”。
4. 在“角色编辑”中修改目标角色的 `_hp/_mp/_tp/_level/_exp`。
5. 在技能列表按 `stypeId` 筛选，并添加到当前编辑角色。
6. 误操作可点击“撤销最近操作”回退。
7. 点击“生成存档输出”，然后“下载存档”。

## 说明

- 工具不会自动写回游戏目录，导出的 `.rpgsave` 需要自行备份并替换。
- 如果某个数据库文件不存在或格式不对，对应项会跳过，仍可手动加载。
