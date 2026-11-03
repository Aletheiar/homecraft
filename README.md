# 玻璃金字塔 · 个人站点

一个建在 [Homecraft](https://github.com/terryHu7/homecraft) 引擎上的三维个人网站：庭院里是一座玻璃金字塔，中厅有四扇通往图书室、工作室、博主传送客厅与「关于本站」的门。

## 本地预览

```bash
python3 tools/serve.py
```

会挑一个空闲端口、在浏览器里打开，并打印地址。改动保存后直接刷新即可，缓存是关掉的。

## 目录

```
index.html        页面内容：每个 <article class="page" data-station="id"> 是一张卡片
homecraft.json    公开站点元数据：站名、URL、logo、一句话介绍
home.config.js    设置：名字、皮肤、语言、天气城市、Dock、留言簿
world/            这个世界本身
  layout.js       数据：庭院边界、出生点、各站点与展牌位置
  build.js        建造：build(ctx) 搭方块与家具，setup(app) 定义动态行为
  portals.js      四座门的位置与朝向
  pyramid.js      金字塔本体与内部中厅
  boundaries.js   墙体、玻璃斜面扫掠碰撞与西侧开口
assets/           图片、模型（GLB）、样式
engine/           引擎（模板 0.1.1 起，本仓库自行维护）
tools/            serve.py 本地预览、check.mjs 自检、build.sh 打包
about/ articles/  关于页与文章页（独立入口，也可由门进入）
```

站点自身的内容放在 `world/`、`index.html`、`home.config.js`、`homecraft.json`、`assets/`；`engine/` 是与站点无关的共享引擎。

## 自检

```bash
npm run check        # check:site + 无头浏览器启动检查，截图落在 tools/.check/
```

`?debug` 加在网址后面会显示 draw call、三角面数与帧时间。

`check:site` 目前固定报三条，都是已知状态：`homecraft.json` 没有 intro、logo 仍是模板的草方块、`engine/` 与 0.1.1 清单有差异（正常，本仓库改过引擎）。这些不该靠编造元数据或回退引擎来消掉。

## 状态

- 上游已冻结：远程 `import/upstream-0.1.1` tag 指向模板基线，不再跟随官方更新，引擎改动自己修自己测。
- 尚未上线：没有部署配置，也没有做公网部署。
- 内容是占位的：3 篇示例文章、3 个示例友链、关于页简介待填。
- 已知超预算：场景约 65 万三角面（预算 20 万），主要来自外景 `assets/models/newheaven-scenery.glb`（12.5 MB）。
