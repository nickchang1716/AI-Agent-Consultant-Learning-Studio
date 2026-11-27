/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { navy: '#142a40', teal: { DEFAULT: '#087e83', dark: '#066266' }, paper: '#f2f5f9' },
      fontFamily: { sans: ['"Noto Sans TC"', 'system-ui', '"Segoe UI"', 'sans-serif'] },
    },
  },
  plugins: [],
};
