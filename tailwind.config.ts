import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1877F2", // Facebook blue
          dark: "#0f5bd6",
        },
        junk: "#ef4444",
        warm: "#f59e0b",
        good: "#10b981",
      },
    },
  },
  plugins: [],
};

export default config;
