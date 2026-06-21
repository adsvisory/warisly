export function maskNik(nik: string | null): string {
  if (!nik) return "—";
  return `••••-••••-••••-${nik.slice(-4)}`;
}
