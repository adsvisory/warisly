import { redirect } from "next/navigation";

// The method picker was folded into the single "Tambah aset" screen at /aset/pindai
// (scan / upload / manual in one step). Kept as a redirect so older links still resolve;
// /aset/baru/manual remains the manual form.
export default function BaruPage() {
  redirect("/aset/pindai");
}
