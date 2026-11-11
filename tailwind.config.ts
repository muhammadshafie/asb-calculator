import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1f",
        sub: "#6e6e73",
        hairline: "#d2d2d7",
        fog: "#f5f5f7",
        action: { DEFAULT: "#0071e3", hover: "#0077ed", link: "#0066cc" },
        gain: "#1e7e34",
        loss: "#d70015",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Helvetica Neue",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        tile: "22px",
      },
    },
  },
  plugins: [],
};

export default config;
