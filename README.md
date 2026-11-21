# EPR / 五相阵列 · 交互式拆解可视化

用 Three.js 程序化构建的轨道光能阵列，包含开放宇宙博物馆总览与独立卫星详情页。

![五相阵列主页面](preview-five-phase.png)

## 在线入口

- 卫星详情：`index.html`
- 博物馆总览：`museum/index.html`
- LS-07 独立页：`satellites/ls07/index.html?from=museum`

## 结构

```text
index.html                       单文件卫星详情
museum/                          博物馆总览
satellites/ls07/                 LS-07 独立详情页
src/                             源码
build.mjs / package.json         构建
preview-five-phase*.png          预览
```

## 本地运行

```bash
npm install
npm run build
python -m http.server 8080
```

打开 `http://localhost:8080/`。

博物馆：

```text
http://localhost:8080/museum/
```

## GitHub Pages

仓库公开后：

```text
Settings → Pages → Deploy from a branch → main / (root)
```

站点入口：

```text
https://<username>.github.io/<repo>/
```

博物馆：

```text
https://<username>.github.io/<repo>/museum/
```

## 五相

- 龙：红
- 鹰：蓝
- 犀：绿
- 虎：橙
- 鹤：银

默认进入龙。`?phase=ying` 可直接打开鹰。

五张徽记图仍为当前占位版本，待后续替换为最终原创图。

## 旧版视觉记录

以下五张是改名前截图，HUD 和标题仍是旧版，仅作为开发记录，不代表当前五相版。

![旧版 · 龙位](media/legacy/legacy-01-long.jpg)

![旧版 · 鹰位](media/legacy/legacy-02-ying.jpg)

![旧版 · 犀位](media/legacy/legacy-03-xi.jpg)

![旧版 · 虎位](media/legacy/legacy-04-hu.jpg)

![旧版 · 鹤位](media/legacy/legacy-05-he.jpg)

> 如果要公开仓库，建议先删除 `media/legacy/` 或替换成五相版截图。

## 授权状态

当前仓库**未附开源许可证**，默认保留所有权利。

- 代码、页面、图片暂不可商用或再分发。
- 第三方依赖许可见 [LICENSES.md](LICENSES.md)。
- 若要开源代码，建议后续单独添加 MIT；图片不要与代码使用同一个许可证。

## 说明

本页是科幻概念可视化，不代表现实航天器数据。
