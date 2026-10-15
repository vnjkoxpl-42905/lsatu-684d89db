import { supabase } from "@/integrations/supabase/client";
import { sendAssignmentEmail } from "@/lib/assignmentEmail";

/**
 * Notify a student that a new classroom_items row has been created for them.
 * Posts a message to the 1:1 admin↔student inbox thread (creating it if
 * needed), inserts a bell notifications row, and emails the student.
 *
 * Non-throwing. Returns granular flags so callers can surface partial-success
 * states truthfully ("Assigned, but email failed").
 *
 * Email is sent via the `send-assignment-email` edge function, which uses
 * Resend. If RESEND_API_KEY or FROM_EMAIL is unset the function returns
 * a truthful failure — we never fake email_ok.
 */
export interface NotifyResult {
  inbox_ok: boolean;
  bell_ok: boolean;
  email_ok: boolean;
  inbox_error?: string;
  bell_error?: string;
  email_error?: string;
}

interface NotifyParams {
  adminUserId: string;
  studentId: string;
  title: string;
  /** Path the student should land on, e.g. /classroom/item/<id> */
  route: string;
  /** Short body shown in the inbox message + bell notification (optional). */
  description?: string;
  /** Type label used in the email body, e.g. "homework", "bootcamp_module". */
  assignmentType?: string;
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
  const { adminUserId, studentId, title, route, description, assignmentType } = params;

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

  // Email step. Failure is recorded but the assignment is not affected.
  const emailRes = await sendAssignmentEmail({
    studentId,
    title,
    description,
    route,
    assignmentType: assignmentType ?? "assignment",
  });
  result.email_ok = emailRes.ok;
  if (!emailRes.ok) result.email_error = emailRes.error;

  return result;
}

/**
 * One-line summary suitable for a toast.
 *   - "Assigned and notified"            (all three ok)
 *   - "Assigned, but email failed"        (inbox+bell ok, email failed)
 *   - "Assigned, partial notification"    (some other partial)
 *   - "Assigned, but notification failed" (all three failed)
 */
export function summarizeNotifyResult(r: NotifyResult): string {
  if (r.inbox_ok && r.bell_ok && r.email_ok) return "Assigned and notified";
  if (!r.inbox_ok && !r.bell_ok && !r.email_ok) return "Assigned, but notification failed";
  if (r.inbox_ok && r.bell_ok && !r.email_ok) return "Assigned, but email failed";
  return "Assigned, partial notification";
}
