import Link from "next/link";
import { queue } from "@/services/review";

const STATUS_LABEL: Record<string, string> = {
  under_review: "Menunggu tinjauan", approved: "Disetujui (siap diarmkan)", waiting_period: "Masa tunggu",
};

export default async function Antrean() {
  const items = await queue();
  return (
    <>
      <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".2em", textTransform: "uppercase", color: "#B5863C" }}>Antrean</p>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1c2233", marginTop: 6 }}>Permohonan klaim</h1>
      <p style={{ fontSize: 13.5, color: "#6b7088", marginTop: 4 }}>{items.length} dalam antrean · diurutkan dari yang terlama</p>
      <div style={{ marginTop: 18, background: "#fff", border: "1px solid #e3e6ef", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ textAlign: "left", color: "#6b7088", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>
            <th style={{ padding: "11px 18px", borderBottom: "1px solid #e3e6ef" }}>ID</th>
            <th style={{ padding: "11px 18px", borderBottom: "1px solid #e3e6ef" }}>Pemohon</th>
            <th style={{ padding: "11px 18px", borderBottom: "1px solid #e3e6ef" }}>Status</th>
            <th style={{ padding: "11px 18px", borderBottom: "1px solid #e3e6ef" }}>Masuk</th>
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} style={{ padding: 24, color: "#6b7088", textAlign: "center" }}>Tidak ada permohonan menunggu.</td></tr>}
            {items.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid #e3e6ef" }}>
                  <Link href={`/klaim/${r.id}`} style={{ fontFamily: "monospace", color: "#3C54C6", fontWeight: 600 }}>{r.id.slice(0, 8)}</Link>
                </td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid #e3e6ef" }}>{r.claimantName ?? "—"}</td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid #e3e6ef" }}>{STATUS_LABEL[r.status] ?? r.status}</td>
                <td style={{ padding: "14px 18px", borderBottom: "1px solid #e3e6ef", color: "#6b7088" }}>{new Date(r.createdAt).toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
