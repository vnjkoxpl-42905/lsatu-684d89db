import { supabase } from "@/integrations/supabase/client";

/**
 * Notify a student that a new classroom_items row has been created for them.
 * Posts a message to the 1:1 admin↔student inbox thread (creating it if
 * needed) AND inserts a bell notifications row.
 *
 * Non-throwing. Returns granular flags so the caller can surface
 * partial-success states truthfully ("Assigned, but notification failed").
 *
 * Email is intentionally NOT included — no email provider/edge function
 * exists in this repo. Adding a fake email path would lie to the user.
 */
export interface NotifyResult {
  inbox_ok: boolean;
  bell_ok: boolean;
  email_ok: false; // Always false — no provider configured.
  inbox_error?: string;
  bell_error?: string;
}

interface NotifyParams {
  adminUserId: string;
  studentId: string;
  title: string;
  /** Path the student should land on, e.g. /classroom/item/<id> */
  route: string;
  /** Short body shown in the inbox message + bell notification (optional). */
  description?: string;
}

async function findOrCreateThread(adminUserId: string, studentId: string): Promise<string> {
  const { data: myParts, error: myPartsErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", adminUserId);
  if (myPartsErr) throw myPartsErr;

  const myConvIds = (myParts ?? []).map((p) => p.conversation_id);
  if (myConvIds.length > 0) {
    const { data: shared, error: sharedErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", studentId)
      .in("conversation_id", myConvIds)
      .limit(1);
    if (sharedErr) throw sharedErr;
    if (shared && shared.length > 0) return shared[0].conversation_id;
  }

  const { data: conv, error: cErr } = await supabase
    .from("conversations")
    .insert({ subject: null, created_by: adminUserId })
    .select()
    .single();
  if (cErr || !conv) throw cErr ?? new Error("Failed to create conversation");

  const { error: pErr } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: conv.id, user_id: adminUserId },
      { conversation_id: conv.id, user_id: studentId },
    ]);
  if (pErr) throw pErr;

  return conv.id;
}

export async function notifyStudentOfClassroomItem(
  params: NotifyParams,
): Promise<NotifyResult> {
  const { adminUserId, studentId, title, route, description } = params;

  const result: NotifyResult = {
    inbox_ok: false,
    bell_ok: false,
    email_ok: false,
  };

  try {
    const conversationId = await findOrCreateThread(adminUserId, studentId);
    const body =
      `New assignment: ${title}\n\n` +
      (description ? `${description}\n\n` : "") +
      `View in your Classroom: ${route}`;
    const { error: mErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: adminUserId,
        body,
      });
    if (mErr) throw mErr;
    result.inbox_ok = true;
  } catch (e) {
    console.error("[classroomNotify:inbox] failed", { studentId, error: e });
    result.inbox_error = e instanceof Error ? e.message : "inbox failed";
  }

  try {
    const { error: nErr } = await (supabase as unknown as {
      from: (t: string) => {
        insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from("notifications")
      .insert({
        user_id: studentId,
        type: "assignment",
        title: `New assignment: ${title}`,
        body: description ?? null,
        link: route,
      });
    if (nErr) throw nErr;
    result.bell_ok = true;
  } catch (e) {
    console.error("[classroomNotify:bell] failed", { studentId, error: e });
    result.bell_error = e instanceof Error ? e.message : "bell failed";
  }

  return result;
}

/**
 * One-line summary suitable for a toast.
 *   "Assigned and notified" / "Assigned, but notification failed"
 */
export function summarizeNotifyResult(r: NotifyResult): string {
  if (r.inbox_ok && r.bell_ok) return "Assigned and notified";
  if (!r.inbox_ok && !r.bell_ok) return "Assigned, but notification failed";
  return "Assigned, partial notification";
}
