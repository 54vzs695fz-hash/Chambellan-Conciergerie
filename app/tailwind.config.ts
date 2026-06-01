import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "var(--shell-app-bg)",
        beige: "var(--shell-sidebar-active-bg)",
        sand: "var(--shell-card-border)",
        gold: "var(--shell-accent)",
        "gold-light": "#c9ad7f",
        ink: "var(--shell-btn-primary-bg)",
        muted: "var(--shell-text-muted)",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--shell-card-shadow)",
      },
      borderRadius: {
        input: "var(--shell-input-radius)",
      },
    },
  },
  plugins: [],
};

export default config;
