import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F6F1E7",
        beige: "#E9DFCC",
        gold: "#B08D53",
        goldsoft: "rgba(176,141,83,0.14)",
        charcoal: "#1B1815",
        stone: "#83786A",
        olive: "#5B6146",
        line: "rgba(27,24,21,0.12)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      transitionTimingFunction: {
        studio: "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};
export default config;
