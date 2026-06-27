import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-tinta text-ink-text hover:bg-tinta-hover active:opacity-90",
  secondary: "border border-paper-edge bg-panel text-tinta hover:border-emas",
  ghost: "bg-transparent text-emas hover:text-tinta underline underline-offset-2",
};

export function Button({ variant = "secondary", className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`rounded-xl px-4 py-3 font-sans font-medium transition disabled:opacity-60 ${styles[variant]} ${className}`} {...props} />
  );
}
