"use server";
import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/staff";
import { decide } from "@/services/review";

export async function decideAction(formData: FormData) {
  const staff = await getStaff();
  if (!staff) throw new Error("unauthorized");
  const requestId = String(formData.get("requestId"));
  const decision = String(formData.get("decision")) as "approve" | "reject";
  const note = (String(formData.get("note") ?? "").trim()) || null;
  await decide(requestId, { id: staff.id, email: staff.email }, decision, note);
  revalidatePath(`/klaim/${requestId}`);
}
