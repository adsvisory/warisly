// KTP OCR prompt + output types (#12b-i).
//
// A KYC PRE-FILL pipeline: a KTP photo is read for ONLY NIK / name / DOB. This is NOT
// identity verification — the real check is the (later) eKYC Dukcapil face-match. Nothing
// here arms a release, matches a recipient, or sets any verified flag.
//
// Cardinal 3 (no raw biometrics): the image is OCR'd in memory and dropped; only the three
//   text fields below are ever returned. The KTP photo is never stored.
// Data minimization: the prompt extracts ONLY NIK, name, DOB. Address, religion, marital
//   status, occupation, etc. are explicitly ignored — we never want them.
//
// Types live here (not in the server-only service) so the client review component (#12b-ii)
// can import `KtpDraft` without pulling a server module — same pattern as ExtractedAssetDraft.

// Raw model output, before normalization.
export type KtpOcrResult = {
  nik: string | null; // ideally 16 digits
  name: string | null;
  dob: string | null; // ISO yyyy-mm-dd if possible, else raw date text
  fieldsNeedingReview: string[]; // field names the user should double-check
};

// What the service returns and the UI consumes: normalized NIK + a validity flag.
export type KtpDraft = KtpOcrResult & { nikValid: boolean };

// Output is constrained by a JSON schema (response_format) in llm.ts, so this prompt focuses
// on WHICH three fields to read and — just as importantly — which to ignore.
export const KTP_OCR_PROMPT = `Anda membaca SATU foto KTP (Kartu Tanda Penduduk Indonesia) dan mengekstrak HANYA tiga field ke JSON ketat. Abaikan semua field lain pada kartu.

EKSTRAK HANYA:
- nik: NIK 16 digit sebagai string berisi tepat 16 angka, tanpa spasi.
- name: nilai di sebelah "Nama".
- dob: tanggal lahir dari "Tempat/Tgl Lahir" — kembalikan format ISO yyyy-mm-dd jika bisa, jika tidak gunakan teks tanggal apa adanya.

JANGAN mengekstrak atau mengembalikan: alamat (Alamat), RT/RW, Kel/Desa, Kecamatan, agama (Agama), status perkawinan (Status Perkawinan), pekerjaan (Pekerjaan), kewarganegaraan, golongan darah, atau apa pun selain itu. Kami hanya butuh NIK, nama, dan tanggal lahir.

ATURAN:
- Jika silau/buram membuat sebuah digit tidak pasti, kembalikan pembacaan terbaik Anda lalu tambahkan "nik" ke fieldsNeedingReview.
- NIK harus 16 digit. Jika tidak terbaca 16, kembalikan yang Anda lihat dan tandai "nik".
- Gunakan null untuk field yang tidak terbaca.

Kembalikan HANYA JSON: {"nik": string|null, "name": string|null, "dob": string|null, "fieldsNeedingReview": string[]}. Tanpa markdown, tanpa komentar.`;
