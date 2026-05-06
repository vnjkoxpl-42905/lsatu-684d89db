import { supabase } from "@/integrations/supabase/client";

interface SendAssignmentEmailParams {
  studentId: string;
  title: string;
  description?: string;
  route: string;
  assignmentType: string;
}

/**
 * Invoke the `send-assignment-email` edge function. The function:
 *   - verifies the caller is admin
 *   - looks up the student email server-side via service role
 *   - sends via Resend using RESEND_API_KEY + FROM_EMAIL
 *
 * Returns a truthful `{ok, error}`. We never fake success; if the env is
 * unset or Resend rejects the request the failure surfaces here verbatim.
 */
export async function sendAssignmentEmail(
  params: SendAssignmentEmailParams,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-assignment-email",
      { body: params },
    );
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
