# 开放宇宙博物馆 · Hub

这是博物馆总览入口，不加载完整卫星模型。

## 路由

```text
museum/index.html                  ← 总览
museum/assets/earth-space.jpg      ← 地球/深空背景
museum/assets/ls07-preview.jpg     ← LS-07 预览卡
museum/data.js                     ← 卫星列表、轨道角度、跳转路径
```

卫星详情：

```text
satellites/ls07/index.html?from=museum
```

## 添加一颗卫星

1. 在 `satellites/<id>/index.html` 放入完整卫星项目。
2. 导出一张预览图，放到 `museum/assets/<id>-preview.jpg`。
3. 在 `museum/data.js` 增加一条：

```js
{
  id: 'ys01',
  code: 'YS-01',
  name: '你的卫星名',
  en: 'YOUR SATELLITE',
  state: 'ready',
  route: '../satellites/ys01/index.html?from=museum',
  image: 'assets/ys01-preview.jpg',
  angle: 120,
  accent: '#ff5b70'
}
```

4. 刷新博物馆页即可。

## 为什么不把完整模型放进博物馆

- 博物馆只负责展示与导航。
- 每颗卫星是独立项目，可独立构建、独立优化。
- 完整模型留在详情页，博物馆只加载预览图。
- 这样十颗卫星也不会拖垮总览性能。

## 跳转

点击 LS-07：

```text
museum/index.html
  → ../satellites/ls07/index.html?from=museum
```

详情页左下角：

```text
← 宇宙博物馆
```

只有在 `?from=museum` 时显示返回按钮；独立打开详情页时不会出现。

## 旧原型

`archive/museum-v1-prototype.html` 是之前单页版本，仅作备份，不再作为入口。
