import { sendMagicLink } from "./actions";

export default async function Masuk({ searchParams }: { searchParams: Promise<{ denied?: string; sent?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 380, margin: "80px auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 24, color: "#20274B" }}>Warisly Back-office</h1>
      <p style={{ color: "#6b7088", fontSize: 13, marginTop: 6 }}>Akses internal. Tautan masuk dikirim ke email @warisly.id terdaftar; verifikasi MFA wajib.</p>
      {sp.denied && <p style={{ color: "#9a3b3b", fontSize: 13, marginTop: 10 }}>Email ini tidak memiliki akses back-office.</p>}
      {sp.sent
        ? <p style={{ color: "#2f6b3a", fontSize: 14, marginTop: 16 }}>Tautan masuk telah dikirim. Periksa email Anda.</p>
        : <form action={sendMagicLink} style={{ marginTop: 16 }}>
            <input name="email" type="email" required placeholder="email @warisly.id"
              style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e3e6ef", borderRadius: 10, fontSize: 14 }} />
            <button style={{ width: "100%", marginTop: 12, padding: "12px", background: "#20274B", color: "#fff", border: 0, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Kirim tautan masuk</button>
          </form>}
    </main>
  );
}
