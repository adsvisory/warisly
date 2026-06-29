import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-tinta text-ink-text hover:bg-tinta-hover",
  secondary: "border border-paper-edge bg-panel text-tinta hover:border-emas",
  ghost: "bg-transparent text-emas hover:text-tinta underline underline-offset-2",
};

// `loading` shows an inline spinner and disables the button so an async action
// reads as in-flight and can't be double-submitted. The press-scale gives a
// tactile feel; it's neutralised under prefers-reduced-motion via globals.css.
export function Button({ variant = "secondary", className = "", loading = false, disabled, children, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-sans font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
