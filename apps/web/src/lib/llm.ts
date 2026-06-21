import "server-only";
import { serverEnv } from "@/lib/env.server";

const CATEGORIES = ["saham","reksa_dana","bank","e_wallet","emas","crypto","asuransi","bpjs","properti","fisik","utang","lainnya"] as const;

const SYSTEM = `Anda mengubah pesan kasual berbahasa Indonesia tentang aset/utang keuangan menjadi data terstruktur.
ATURAN PENTING: JANGAN pernah meminta, menebak, atau menyimpan password. "identifier" hanya email atau nomor akun.
"valueEstimate" = perkiraan nilai dalam Rupiah sebagai bilangan bulat. Ekspansi: "rb"=ribu (x1.000), "jt"=juta (x1.000.000), "M"/"miliar"=x1.000.000.000. Null jika tidak disebut.
Pilih "category" dari daftar; jika ragu gunakan "lainnya". Berikan "confidence" 0..1 per field.`;

const schema = {
  name: "asset_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["category", "provider", "label", "identifier", "valueEstimate", "confidence"],
    properties: {
      category: { type: "string", enum: [...CATEGORIES] },
      provider: { type: ["string", "null"] },
      label: { type: ["string", "null"] },
      identifier: { type: ["string", "null"] },
      valueEstimate: { type: ["integer", "null"] },
      confidence: {
        type: "object", additionalProperties: false,
        required: ["category", "provider", "valueEstimate"],
        properties: { category: { type: "number" }, provider: { type: "number" }, valueEstimate: { type: "number" } },
      },
    },
  },
} as const;

export interface DraftFields {
  category: (typeof CATEGORIES)[number];
  provider: string | null; label: string | null; identifier: string | null; valueEstimate: number | null;
  confidence: { category: number; provider: number; valueEstimate: number };
}

async function chat(messages: unknown[]): Promise<DraftFields> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-2024-08-06", messages, response_format: { type: "json_schema", json_schema: schema } }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content) as DraftFields;
}

export function structureFromText(text: string) {
  return chat([{ role: "system", content: SYSTEM }, { role: "user", content: text }]);
}

export function structureFromImage(base64: string, mime: string) {
  return chat([
    { role: "system", content: SYSTEM },
    { role: "user", content: [
      { type: "text", text: "Ekstrak satu aset dari tangkapan layar ini. Jangan baca atau salin password." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
    ] },
  ]);
}

export async function transcribeAudio(base64: string, mime: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(Buffer.from(base64, "base64"))], { type: mime }), "audio");
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}` }, body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return String(json.text ?? "");
}
