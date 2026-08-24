# Linux 指令速查助手（React + Tauri）

一款**离线可用的 Linux 常用命令速查桌面应用**。内置 **154 条常用指令、18 个分类**，支持按用途搜索、分类浏览、查看详情、一键复制示例、收藏（本地持久化），并支持明亮/深色主题与 6 种主题色。

本仓库是对源项目 `G:\Workspace\linux指令查询器` 的 **React + Tauri (v2)** 再实现，**删繁就简**：保留核心查询体验，剔除了自然语言“生成”、壁纸、液态玻璃、托盘、自启等复杂特性。

## 技术栈
- 前端：Vite + React 18 + TypeScript（纯 CSS，无组件库）
- 桌面壳：Tauri v2（`src-tauri`，无自定义 Rust 后端命令）
- 数据：仅复用命令库（`src/data/commands.ts`，由脚本从源 HTML 抽取）
- 持久化：`localStorage`（收藏 / 主题 / 主题色）

## 开发
```bash
npm install
npm run tauri dev      # 启动桌面应用（调试）
```

## 构建 Windows 安装包（NSIS）
```bash
npm run tauri build
```
产物：`src-tauri/target/release/bundle/nsis/Linux指令速查助手_1.0.0_x64-setup.exe`
- 前端构建：`npm run build`（`tsc && vite build`）
- 打包后随应用安装，离线运行，设置存于 `%APPDATA%`。

## 目录
```
src/                React 前端（App、组件、hooks、data、lib/search）
scripts/            一次性数据抽取脚本（extract-data.mjs）
src-tauri/          Tauri Rust 壳 + 图标 + tauri.conf.json
```

## 已剔除（相对源项目，化繁为简）
自然语言“生成指令”、背景壁纸、液态玻璃/极光效果、系统托盘、开机自启、关闭最小化到托盘。
