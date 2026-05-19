/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // A股惯例：涨红跌绿
        upRed: '#E54D42',
        downGreen: '#1FAE6F',
        gold: '#D4A574',
        goldBright: '#E8C547',
        warnOrange: '#F59E0B',
        warnYellow: '#FBBF24',
        aiPurple: '#7C5BD9',
        signalBg: '#FFF1F0',
        commentBg: '#FFFBEB',
        pageBg: '#F5F5F7',
      },
      fontFamily: {
        sans: ['-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};
