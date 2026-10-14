import { supabase } from "@/integrations/supabase/client";

/**
 * Find-or-create the 1:1 inbox thread between `adminUserId` and `studentId`,
 * then post a system message announcing a newly approved TA assignment.
 *
 * Non-throwing by design — the approve flow should not fail if notification
 * plumbing hiccups. Returns `{ ok }` so callers can surface a toast on failure
 * without blocking.
 */
export async function notifyStudentOfTAAssignment(params: {
  adminUserId: string;
  studentId: string;
  title: string;
  assignmentId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { adminUserId, studentId, title, assignmentId } = params;
  try {
    // Reuse existing 1:1 thread if one exists.
    const { data: myParts, error: myPartsErr } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", adminUserId);
    if (myPartsErr) throw myPartsErr;

    const myConvIds = (myParts ?? []).map((p) => p.conversation_id);
    let conversationId: string | null = null;

    if (myConvIds.length > 0) {
      const { data: shared, error: sharedErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", studentId)
        .in("conversation_id", myConvIds)
        .limit(1);
      if (sharedErr) throw sharedErr;
      if (shared && shared.length > 0) {
        conversationId = shared[0].conversation_id;
      }
    }

    if (!conversationId) {
      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .insert({ subject: null, created_by: adminUserId })
        .select()
        .single();
      if (cErr || !conv) throw cErr ?? new Error("Failed to create conversation");
      conversationId = conv.id;

      const { error: pErr } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: conversationId, user_id: adminUserId },
          { conversation_id: conversationId, user_id: studentId },
        ]);
      if (pErr) throw pErr;
    }

    const body =
      `New assignment: ${title}\n\n` +
      `View in your Classroom: /classroom/ta/${assignmentId}`;

    const { error: mErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: adminUserId,
        body,
      });
    if (mErr) throw mErr;

    return { ok: true };
  } catch (e) {
    console.error("[ta:notify:inbox] failed", {
      adminUserId,
      studentId,
      assignmentId,
      error: e,
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "notify failed",
    };
  }
}
