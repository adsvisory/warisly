"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Enroll() {
  const [qr, setQr] = useState(""); const [factorId, setFactorId] = useState(""); const [code, setCode] = useState(""); const [err, setErr] = useState("");
  const router = useRouter();
  useEffect(() => { (async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) { setErr(error.message); return; }
    setQr(data.totp.qr_code); setFactorId(data.id);
  })(); }, []);
  async function verify() {
    setErr("");
    const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
    if (e1) { setErr(e1.message); return; }
    const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
    if (e2) { setErr(e2.message); return; }
    router.push("/antrean"); router.refresh();
  }
  return (
    <main style={{ maxWidth: 380, margin: "60px auto", fontFamily: "Inter, sans-serif", textAlign: "center" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#20274B" }}>Aktifkan MFA</h1>
      <p style={{ color: "#6b7088", fontSize: 13, marginTop: 6 }}>Pindai dengan aplikasi authenticator (Google Authenticator, Authy), lalu masukkan kode 6 digit.</p>
      {qr && <img src={qr} alt="QR MFA" style={{ width: 200, height: 200, margin: "18px auto" }} />}
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Kode 6 digit"
        style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e3e6ef", borderRadius: 10, fontSize: 14, fontFamily: "monospace" }} />
      <button onClick={verify} style={{ width: "100%", marginTop: 12, padding: 12, background: "#20274B", color: "#fff", border: 0, borderRadius: 10, fontWeight: 600, cursor: "pointer" }}>Verifikasi & aktifkan</button>
      {err && <p style={{ color: "#9a3b3b", fontSize: 13, marginTop: 10 }}>{err}</p>}
    </main>
  );
}
