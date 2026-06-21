import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-nyala text-white active:bg-nyala-pressed",
  secondary: "bg-tinta text-ink-text active:opacity-90",
  ghost: "bg-transparent text-nyala underline underline-offset-2",
};

export function Button({ variant = "secondary", className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`rounded-lg px-4 py-3 font-sans font-medium transition disabled:opacity-60 ${styles[variant]} ${className}`} {...props} />
  );
}
