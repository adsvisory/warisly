import type { Config } from "tailwindcss";

export const warislyPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        tinta: "#20274B",
        emas: "#B5863C",
        kertas: "#F4EEE0",
        daun: "#42523F",
        nyala: { DEFAULT: "#3C54C6", pressed: "#2C3E9C" },
        ink: { DEFAULT: "#20274B", text: "#F4EEE0", muted: "#BCC0D6" },
        paper: { text: "#23242E", muted: "#5C5D69", edge: "#E4DAC3" },
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
