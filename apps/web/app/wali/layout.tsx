import { PublicLangToggle } from "@/components/PublicLangToggle";

// Deputy (wali) confirmation surface — also reachable without login, so it carries its
// own language switcher.
export default function WaliLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicLangToggle />
      {children}
    </>
  );
}
