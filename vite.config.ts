import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 在 GitHub Actions 中构建时，base 自动设为仓库子路径，便于部署到 GitHub Pages
// 仓库名通过环境变量 VITE_BASE 注入（在 workflow 中设置），未设置则默认根路径
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
