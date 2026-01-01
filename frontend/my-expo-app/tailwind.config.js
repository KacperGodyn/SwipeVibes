/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'vibe-dark': '#0a0a0a',
        'vibe-card': 'rgba(255, 255, 255, 0.05)',
        'vibe-accent': '#F05454',
      },
      fontFamily: {
        // Ensuring we can user custom fonts if we added them,
        // for now just extending default sans
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
