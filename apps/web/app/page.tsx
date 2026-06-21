import { copy } from "@warisly/lib";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <p className="font-sans text-xs uppercase tracking-eyebrow text-emas">{copy.brand}</p>
      <h1 className="mt-3 font-display text-4xl text-tinta">{copy.tagline}</h1>
      <p className="mt-6 font-sans text-sm text-paper-muted">{copy.reassurePassword}</p>
    </main>
  );
}
