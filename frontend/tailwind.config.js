/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        f1red: '#E10600',
        dark: {
          900: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
        },
      },
      fontFamily: {
        f1: ['Titillium Web', 'sans-serif'],
        f1heading: ['Barlow Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
