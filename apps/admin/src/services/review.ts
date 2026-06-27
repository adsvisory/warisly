import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  listReviewQueue, getRequestDetail, recordApproval, listApprovals,
  transitionRequest, recordEvent, type ReleaseRequest, type RequestDetail,
} from "@warisly/db";

export async function queue(): Promise<ReleaseRequest[]> {
  return listReviewQueue(adminClient());
}

export interface DetailView extends RequestDetail {
  aktaUrl: string | null; kkUrl: string | null;
}
export async function detail(id: string): Promise<DetailView | null> {
  const admin = adminClient();
  const d = await getRequestDetail(admin, id);
  if (!d) return null;
  const sign = async (p: string | null) =>
    p ? (await admin.storage.from("release-docs").createSignedUrl(p, 120)).data?.signedUrl ?? null : null;
  return { ...d, aktaUrl: await sign(d.aktaPath), kkUrl: await sign(d.kkPath) };
}

/** Dual-control: returns the resulting status after applying this staff member's decision. */
export async function decide(
  requestId: string, staff: { id: string; email: string },
  decision: "approve" | "reject", note: string | null,
): Promise<"under_review" | "approved" | "rejected"> {
  const admin = adminClient();
  await recordApproval(admin, requestId, staff.id, decision, note);
  await recordEvent(admin, {
    ownerId: null, actor: "admin", eventType: `release.${decision}`,
    subjectType: "release_request", subjectId: requestId, meta: { by: staff.email },
  });

  if (decision === "reject") {
    await transitionRequest(admin, requestId, ["under_review"], "rejected");
    return "rejected";
  }
  // approve → need TWO DISTINCT approvers
  const approvals = await listApprovals(admin, requestId);
  const distinctApprovers = new Set(approvals.filter((a) => a.decision === "approve").map((a) => a.adminId));
  if (distinctApprovers.size >= 2) {
    const ok = await transitionRequest(admin, requestId, ["under_review"], "approved");
    if (ok) await recordEvent(admin, {
      ownerId: null, actor: "admin", eventType: "release.quorum_reached",
      subjectType: "release_request", subjectId: requestId, meta: { approvers: distinctApprovers.size },
    });
    return "approved";
  }
  return "under_review";
}
