"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

// Submit button that reflects the parent `<form action={...}>` pending state via
// useFormStatus: shows a spinner (replacing the optional leading `icon`) and
// disables to prevent double-submits. Pass each form's existing button classes
// through `className` so the styling is unchanged — only the in-flight feedback
// is added.
export function SubmitButton({
  children,
  className = "",
  icon,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={`active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${className}`}
      {...props}
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
