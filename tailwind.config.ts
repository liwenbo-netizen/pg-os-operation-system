import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pgos: {
          bg: "#F8FAFC",
          border: "#E2E8F0",
          primary: "#2563EB",
          text: "#0F172A",
          muted: "#64748B"
        }
      },
      boxShadow: {
        card: "0 8px 28px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;

