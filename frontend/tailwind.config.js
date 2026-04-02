/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e8ff",
          200: "#c7d4fe",
          300: "#a4b8fc",
          400: "#7e93f8",
          500: "#5a6ef2",
          600: "#3d4ce6",
          700: "#2f3ab8",
          800: "#283292",
          900: "#1e2a6e",
          950: "#0f172a",
        },
        accent: {
          DEFAULT: "#0d9488",
          muted: "#5eead4",
        },
      },
      transitionDuration: {
        theme: "280ms",
      },
    },
  },
  plugins: [],
};
