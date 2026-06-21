export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-paper-edge bg-white/70 p-4 ${className}`}>{children}</div>;
}
