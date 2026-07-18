/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'serif'],
      },
      colors: {
        accent: { DEFAULT: '#7c6af7', light: '#a89ef9', bg: 'rgba(124,106,247,0.1)' },
      }
    }
  },
  plugins: []
}
