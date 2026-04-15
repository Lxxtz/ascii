/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tactical-bg": "#121212",
        "tactical-surface": "#1a1a1a",
        "tactical-panel": "#1d1d1d",
        "tactical-border": "#2c2c2c",
        "tactical-text": "#e0e0e0",
        "tactical-dim": "#707070",
        "tactical-red-bright": "#ff3333",
        "tactical-red-dark": "#380808",
        "tactical-red-panel": "#5e0b0b",
        "tactical-green": "#04d45b",
        "tactical-orange": "#d47b00",
      },
      fontFamily: {
        "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
        "sans": ["Inter", "sans-serif"],
      },
      fontSize: {
        'xxs': '0.65rem',
      }
    },
  },
  plugins: [],
}
