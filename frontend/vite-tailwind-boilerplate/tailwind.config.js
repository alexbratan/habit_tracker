/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
    },
    extend: {
      colors: {
        accent: '#f97316',
      },
    },
  },
  plugins: [],
}
