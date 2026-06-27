import { redirect } from "next/navigation";
import { getStaff, hasAAL2 } from "@/lib/staff";
import { signOut } from "./actions";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/masuk");
  if (!(await hasAAL2())) redirect("/mfa");
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7fb", fontFamily: "Inter, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, background: "#20274B", color: "#F4EEE0", padding: "13px 24px" }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 18 }}>Warisly<span style={{ color: "#B5863C" }}>.</span></span>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".15em", textTransform: "uppercase", color: "#cda35a", border: "1px solid rgba(181,134,60,.4)", borderRadius: 5, padding: "2px 7px" }}>Back-office</span>
        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#BCC0D6" }}>{staff.email} · {staff.role}</span>
        <form action={signOut}><button style={{ marginLeft: 14, color: "#BCC0D6", background: "none", border: 0, fontSize: 12.5, cursor: "pointer" }}>Keluar</button></form>
      </header>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px" }}>{children}</div>
    </div>
  );
}
