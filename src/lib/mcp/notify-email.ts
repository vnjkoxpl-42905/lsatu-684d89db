import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Send the assignment/note email from an MCP tool.
 *
 * The RPC write functions (mcp_post_classroom_note, mcp_assign_passage_map_homework,
 * mcp_assign_homework_set) handle the in-app bell + inbox message. Email is
 * deliberately kept out of Postgres and sent here at the tool layer, by invoking
 * the existing `send-assignment-email` edge function.
 *
 * That function verifies the caller is admin from the Authorization header,
 * looks up the student's email server-side via service role, and forwards to
 * the Resend-backed transactional sender. We pass the tool's admin-authed
 * client, so its Bearer token satisfies that admin check.
 *
 * Non-throwing. Returns a truthful `{ ok, error }` — never fake success. If the
 * student has no email on file, or Resend/env is unset, the failure surfaces
 * verbatim so callers can report "posted, but email failed" instead of lying.
 */
export interface EmailResult {
  ok: boolean;
  error?: string;
}

export interface NotifyEmailParams {
  studentId: string;
  title: string;
  route: string;
  description?: string;
  /** Type label used in the email body, e.g. "note", "homework". */
  assignmentType?: string;
}

export async function sendNotifyEmail(
  client: SupabaseClient,
  params: NotifyEmailParams,
): Promise<EmailResult> {
  const { studentId, title, route, description, assignmentType } = params;
  try {
    const { data, error } = await client.functions.invoke("send-assignment-email", {
      body: {
        studentId,
        title,
        route,
        description,
        assignmentType: assignmentType ?? "assignment",
      },
    });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "ok" in data && (data as { ok: unknown }).ok === true) {
      return { ok: true };
    }
    const errMsg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "email failed";
    return { ok: false, error: errMsg };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "email failed" };
  }
}
