import type { Config } from "tailwindcss";
import { warislyPreset } from "../../packages/ui/tailwind-preset";

const config: Config = {
  presets: [warislyPreset as Config],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;