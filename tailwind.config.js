/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          900: "#06070A",
          800: "#0B1020",
          700: "#111827",
          600: "#1e2740",
        },
        accent: {
          DEFAULT: "#00D4FF",
          glow: "#22d3ee",
          violet: "#7C3AED",
        },
        good: "#10B981",
        warn: "#fbbf24",
        bad: "#f87171",
      },
      boxShadow: {
        glow: "0 0 32px -6px rgba(0,212,255,0.35)",
        "glow-green": "0 0 32px -6px rgba(16,185,129,0.35)",
        elite: "0 12px 48px -12px rgba(0,0,0,0.65)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
