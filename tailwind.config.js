/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { navy: '#142a40', teal: {
          50: '#effafa',
          100: '#d3f3f4',
          200: '#a8e6e8',
          300: '#6fd0d3',
          400: '#35b0b5',
          500: '#0f9399',
          600: '#087e83',
          700: '#066266',
          800: '#064c4f',
          900: '#073d40',
          DEFAULT: '#087e83',
          dark: '#066266',
        }, paper: '#f2f5f9' },
      fontFamily: { sans: ['"Noto Sans TC"', 'system-ui', '"Segoe UI"', 'sans-serif'] },
    },
  },
  plugins: [],
};
