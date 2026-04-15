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
        "tactical-bg": "var(--tactical-bg)",
        "tactical-surface": "var(--tactical-surface)",
        "tactical-panel": "var(--tactical-panel)",
        "tactical-border": "var(--tactical-border)",
        "tactical-text": "var(--tactical-text)",
        "tactical-dim": "var(--tactical-dim)",
        "tactical-red-bright": "var(--tactical-red-bright)",
        "tactical-red-dark": "var(--tactical-red-dark)",
        "tactical-red-panel": "var(--tactical-red-panel)",
        "tactical-green": "var(--tactical-green)",
        "tactical-orange": "var(--tactical-orange)",
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
