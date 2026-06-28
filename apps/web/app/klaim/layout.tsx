import { PublicLangToggle } from "@/components/PublicLangToggle";

// Heir-recovery surface — reachable from a plain web link with no login. The language
// switcher must live here too, since heirs never reach the in-Profile toggle.
export default function KlaimLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicLangToggle />
      {children}
    </>
  );
}
