# 光徽替换说明

当前页面使用的是**旧版光徽**，放在：

```text
src/assets/emblems/red.jpg      龙
src/assets/emblems/orange.jpg   虎
src/assets/emblems/silver.jpg   鹤
src/assets/emblems/green.jpg    犀
src/assets/emblems/blue.jpg     鹰
```

新版五相光徽单独保留在：

```text
src/assets/emblems/new/
```

旧版备份也在：

```text
src/assets/emblems/legacy/
```

## 换成新版光徽

在仓库根目录执行：

```powershell
Copy-Item src\assets\emblems\new\*.jpg src\assets\emblems\ -Force
node build.mjs
```

或者运行脚本：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\use-new-emblems.ps1
```

## 换回旧版光徽

```powershell
Copy-Item src\assets\emblems\legacy\*.jpg src\assets\emblems\ -Force
node build.mjs
```

或者：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\use-legacy-emblems.ps1
```

## 文件对应

| 文件 | 五相 | 颜色 |
|---|---|---|
| `red.jpg` | 龙 | 红 |
| `orange.jpg` | 虎 | 橙 |
| `silver.jpg` | 鹤 | 银 |
| `green.jpg` | 犀 | 绿 |
| `blue.jpg` | 鹰 | 蓝 |

不要按菜单顺序替换。菜单顺序是：

```text
龙 / 鹰 / 犀 / 虎 / 鹤
```

屏幕文件顺序是：

```text
red / orange / silver / green / blue
```
