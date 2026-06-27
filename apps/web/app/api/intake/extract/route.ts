import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildScanDraft } from "@/services/asset-scan";

export const runtime = "nodejs";

const Body = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const draft = await buildScanDraft({
      ownerId: user.id, base64: parsed.data.base64, mimeType: parsed.data.mimeType,
    });
    return NextResponse.json({ draft });
  } catch {
    // Bahasa-facing message is rendered client-side; never echo the upstream error body.
    return NextResponse.json({ error: "extract_failed" }, { status: 502 });
  }
}
