import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#faf8f5",
        beige: "#f0ebe3",
        sand: "#e5ddd2",
        gold: "#9a7b4f",
        "gold-light": "#c4a574",
        ink: "#1c1c1c",
        muted: "#6b6560",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
