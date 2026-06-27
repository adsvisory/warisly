import type { Config } from "tailwindcss";

export const warislyPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        tinta: { DEFAULT: "#20274B", hover: "#2A3358" },
        emas: { DEFAULT: "#B5863C", ink: "#8A6526", glow: "#C9A45E" },
        kertas: "#F4EEE0",
        panel: "#FBF7EC",
        parchment: "#EFE7D4",
        daun: "#42523F",
        bata: { DEFAULT: "#9A3B27", hover: "#83321F", tint: "#FAF1EA", edge: "#E2C4B8" },
        nyala: { DEFAULT: "#3C54C6", pressed: "#2C3E9C" },
        ink: { DEFAULT: "#20274B", text: "#F4EEE0", muted: "#BCC0D6" },
        paper: { text: "#23242E", muted: "#5C5D69", edge: "#E4DAC3", line: "#EBE2CD" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        serif: ["var(--font-spectral)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: { eyebrow: "0.2em" },
    },
  },
};
