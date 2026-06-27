import Link from "next/link";
import { notFound } from "next/navigation";
import { detail } from "@/services/review";
import { getStaff } from "@/lib/staff";
import { decideAction } from "./actions";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e6ef", borderRadius: 12, marginBottom: 18 };
const ph: React.CSSProperties = { padding: "13px 18px", borderBottom: "1px solid #e3e6ef", fontSize: 12, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "#6b7088" };

export default async function ClaimDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await detail(id);
  if (!d) notFound();
  const staff = await getStaff();
  const approvals = d.approvals.filter((a) => a.decision === "approve");
  const distinct = new Set(approvals.map((a) => a.adminId));
  const iApproved = staff ? distinct.has(staff.id) : false;
  const quorum = distinct.size >= 2;
  const decided = d.status === "approved" || d.status === "rejected";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/antrean" style={{ fontSize: 13, color: "#3C54C6", fontWeight: 600 }}>‹ Antrean</Link>
        <span style={{ fontFamily: "monospace", fontSize: 13, color: "#6b7088" }}>{d.id.slice(0, 8)}</span>
        <span style={{ fontSize: 12, color: "#6b7088" }}>· {d.status}</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1c2233", marginTop: 14 }}>{d.ownerName ?? "—"}</h1>
      <p style={{ fontSize: 13.5, color: "#6b7088", marginTop: 4 }}>Pemohon: {d.claimantName ?? "—"} · masuk {new Date(d.createdAt).toLocaleString("id-ID")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginTop: 18 }}>
        <div>
          <div style={card}>
            <div style={ph}>Identitas</div>
            <div style={{ padding: "6px 18px 12px", fontSize: 13.5 }}>
              {[["Mendiang", `${d.ownerName ?? "—"} · ${d.ownerPhone ?? "—"}`],
                ["Pemohon (terverifikasi eKYC)", d.claimantName ?? "—"],
                ["Cocok dengan penerima terdaftar", d.matchedRecipientName ? `Cocok · ${d.matchedRecipientName}` : "Tidak cocok — perlu tinjauan manual"]]
                .map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #eef0f6" }}>
                    <span style={{ color: "#6b7088" }}>{k}</span><span style={{ fontWeight: 500, color: d.matchedRecipientName || k !== "Cocok dengan penerima terdaftar" ? "#1c2233" : "#9a3b3b" }}>{v}</span>
                  </div>
                ))}
            </div>
          </div>
          <div style={card}>
            <div style={ph}>Dokumen</div>
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Akta kematian", d.aktaUrl], ["Kartu Keluarga", d.kkUrl]].map(([label, url]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e3e6ef", borderRadius: 10, padding: "12px 14px" }}>
                  <span style={{ fontSize: 13 }}>{label}</span>
                  {url ? <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: "#3C54C6" }}>Lihat (tautan aman, 2 mnt)</a>
                       : <span style={{ fontSize: 12.5, color: "#9a3b3b" }}>Belum ada</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={card}>
            <div style={ph}>Persetujuan (dua petugas)</div>
            <div style={{ padding: 14, fontSize: 13 }}>
              {distinct.size === 0 && <p style={{ color: "#6b7088" }}>Belum ada persetujuan.</p>}
              {[...distinct].map((aid) => <div key={aid} style={{ padding: "6px 0", color: "#2f6b3a" }}>✓ Disetujui oleh {aid.slice(0, 8)}</div>)}
              <p style={{ marginTop: 8, color: quorum ? "#2f6b3a" : "#6b7088" }}>
                {quorum ? "Kuorum tercapai — status: approved. Rilis diarmkan di langkah berikutnya." : `Perlu ${2 - distinct.size} persetujuan lagi dari petugas berbeda.`}
              </p>
            </div>
            {!decided && (
              <form action={decideAction} style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="hidden" name="requestId" value={d.id} />
                <textarea name="note" placeholder="Catatan (opsional)" style={{ width: "100%", border: "1.5px solid #e3e6ef", borderRadius: 8, padding: 10, fontSize: 13, minHeight: 56 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button name="decision" value="approve" disabled={iApproved}
                    style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid #2f6b3a", background: iApproved ? "#dcefe0" : "#42523F", color: iApproved ? "#2f6b3a" : "#fff", fontWeight: 600, fontSize: 13, cursor: iApproved ? "default" : "pointer" }}>
                    {iApproved ? "Anda sudah menyetujui" : "Setujui"}
                  </button>
                  <button name="decision" value="reject"
                    style={{ flex: 1, padding: 10, borderRadius: 9, border: "1px solid #e3e6ef", background: "#fff", color: "#9a3b3b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Tolak</button>
                </div>
              </form>
            )}
          </div>
          <div style={{ ...card, padding: "13px 18px", fontSize: 12.5, color: "#6b7088", lineHeight: 1.6 }}>
            Persetujuan memerlukan <b>dua petugas berbeda</b>. Tidak ada rilis yang terjadi pada langkah ini — masa tunggu pemilik dan pemeriksaan multi-kanal berjalan setelah status <b>approved</b> (langkah berikutnya).
          </div>
        </div>
      </div>
    </>
  );
}
