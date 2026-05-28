/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tomato: { 50: "#fdf6ec", 500: "#c1272d", 700: "#8c1a1f" },
        basil: { 500: "#3d8b3d" },
        dough: { 100: "#f6ecd9", 300: "#e6d4a8" },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
