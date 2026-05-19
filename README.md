# 每日有料 · 盘前必读 ☀️

一个面向 A 股个人投资者的每日早报 H5：自选股动态、全市场要闻、今日机会一屏看完。

## 技术栈

- 前端：Vite 5 + React 18 + TypeScript + Tailwind CSS（零额外 UI 库）
- 数据：`public/briefing.json`（每天由 Python 脚本生成）
- 调度：GitHub Actions，交易日 北京时间 07:30 自动构建并部署到 GitHub Pages

## 本地启动

```bash
npm install
npm run dev      # http://localhost:5173/
```

## 手动生成今天的早报

```bash
python3 scripts/generate_briefing.py
```

当前阶段（Step 1）脚本仅更新副标题日期；Step 2 将接入 Jin10 / westockdata 真实数据；Step 3 将接入 DeepSeek 自动生成 AI 解读。

## 自动部署（GitHub Pages）

推送到 `main` 分支后，`.github/workflows/daily-briefing.yml` 会自动：

1. 运行 `scripts/generate_briefing.py` 刷新 `public/briefing.json`
2. 把更新后的 JSON commit 回仓库（仅 schedule / 手动触发时）
3. 构建（`VITE_BASE` 注入仓库子路径）
4. 部署到 GitHub Pages

## 仓库结构

```
.
├── public/briefing.json          # 早报数据（每天自动更新）
├── scripts/generate_briefing.py  # 数据生成器
├── src/
│   ├── App.tsx                   # 启动时 fetch briefing.json
│   ├── data/
│   │   ├── briefing.ts           # 类型定义 + fallback + loadBriefing()
│   │   └── BriefingContext.tsx   # React Context + useBriefing() hook
│   └── components/               # 7 个卡片组件
└── .github/workflows/
    └── daily-briefing.yml        # 定时任务 + 自动部署
```
