"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Mfa() {
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const router = useRouter();
  async function verify() {
    setErr("");
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.[0];
    if (!factor) { router.push("/mfa/enroll"); return; }
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (e1) { setErr(e1.message); return; }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code });
    if (e2) { setErr(e2.message); return; }
    router.push("/antrean"); router.refresh();
  }
  return (
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "Inter, sans-serif", textAlign: "center" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#20274B" }}>Verifikasi MFA</h1>
      <p style={{ color: "#6b7088", fontSize: 13, marginTop: 6 }}>Masukkan kode 6 digit dari aplikasi authenticator Anda.</p>
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Kode 6 digit"
        style={{ width: "100%", marginTop: 16, padding: "12px 14px", border: "1.5px solid #e3e6ef", borderRadius: 10, fontSize: 14, fontFamily: "monospace" }} />
      <button onClick={verify} style={{ width: "100%", marginTop: 12, padding: 12, background: "#20274B", color: "#fff", border: 0, borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>Verifikasi</button>
      {err && <p style={{ color: "#9a3b3b", fontSize: 13, marginTop: 10 }}>{err}</p>}
    </main>
  );
}
