import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";
import { sendNotifyEmail } from "../notify-email";

export default defineTool({
  name: "assign_homework",
  title: "Assign homework set to a student (admin)",
  description:
    "Admin only. Assign an existing homework set to a student and notify them (bell + inbox + email). Creates a homework_assignments row and a Classroom feed item. Get the set id from list_homework_sets and the student id from list_students.",
  inputSchema: {
    set_id: z.string().uuid().describe("homework_sets.id to assign."),
    student_id: z.string().uuid().describe("Target student's id (profiles.class_id / auth user id)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ set_id, student_id }, ctx) => {
    try {
      const supabase = authenticatedSupabase(ctx);

      // Redirect through the notifying RPC (bell + inbox) instead of the old
      // silent direct inserts. One assignment per (set, student), so key the
      // idempotency on that pair — a retry returns the same result.
      const idempotencyKey = `assign_homework_set-${set_id}-${student_id}`;

      const { data, error } = await adminRpc(supabase, "mcp_assign_homework_set", {
        p_set_id: set_id,
        p_student_id: student_id,
        p_idempotency_key: idempotencyKey,
        p_notify: true,
      });
      if (error) throw error;

      // Email only on a fresh assignment we actually notified for — not on an
      // already-assigned no-op or a reused idempotent result.
      let out = data as Record<string, unknown>;
      if (
        out?.ok === true &&
        out?.reused !== true &&
        out?.already_assigned !== true &&
        typeof out?.route === "string"
      ) {
        const email = await sendNotifyEmail(supabase, {
          studentId: student_id,
          title: typeof out.title === "string" ? out.title : "New homework",
          route: out.route as string,
          assignmentType: "homework",
        });
        out = { ...out, email_ok: email.ok, ...(email.error ? { email_error: email.error } : {}) };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
        structuredContent: out,
      };
    } catch (error) {
      return toolError(error);
    }
  },
});
