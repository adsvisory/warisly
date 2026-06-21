export function Seal({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Warisly" className={className}>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#B5863C" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#B5863C" strokeWidth="3" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#B5863C" strokeWidth="1" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
        fontFamily="var(--font-fraunces), Georgia, serif" fontWeight="600" fontSize="34" fill="#B5863C">W</text>
    </svg>
  );
}
