/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Rubik",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: ["Syne", "Rubik", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        dl: {
          bg: "#1f1633",
          "bg-deep": "#150f23",
          border: "#362d59",
          "border-btn": "#584674",
          purple: "#6a5fc1",
          "btn-muted": "#79628c",
          violet: "#422082",
          lime: "#c2ef4e",
          coral: "#ffb287",
          pink: "#fa7faa",
          muted: "#e5e7eb",
          code: "#dcdcaa",
          glass: "rgba(255, 255, 255, 0.18)",
          "glass-hover": "rgba(54, 22, 107, 0.14)",
        },
      },
      boxShadow: {
        "btn-inset": "inset 0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        "btn-hover": "0 0.5rem 1.5rem rgba(0, 0, 0, 0.18)",
        card: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        glass: "0 2px 8px rgba(0, 0, 0, 0.08)",
        ambient: "0 4px 4px 9px rgba(22, 15, 36, 0.9)",
        "input-inset": "inset 0 2px 10px rgba(0, 0, 0, 0.15)",
      },
      maxWidth: {
        content: "1152px",
      },
      backdropBlur: {
        glass: "18px",
      },
      transitionDuration: {
        theme: "220ms",
      },
      borderRadius: {
        input: "6px",
        btn: "13px",
      },
    },
  },
  plugins: [],
};
