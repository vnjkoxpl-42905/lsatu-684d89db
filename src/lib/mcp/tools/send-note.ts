import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";
import { sendNotifyEmail } from "../notify-email";

/**
 * Escape a plain-text note into safe HTML for the Classroom renderer.
 * Blank lines become paragraph breaks; single newlines become <br>. We do NOT
 * interpret markdown syntax — the content is HTML-escaped so nothing injects.
 */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export default defineTool({
  name: "send_note",
  title: "Send a classroom note to a student (admin)",
  description:
    "Admin only. Post a plain-text note to a student's Classroom feed and notify them (bell + inbox + email). Line breaks are preserved. For rich HTML notes use post_classroom_note.",
  inputSchema: {
    student_id: z.string().uuid().describe("Target student's id (profiles.class_id / auth user id)."),
    title: z.string().trim().min(1).max(160).describe("Short note title."),
    body_markdown: z.string().trim().min(1).max(20000).describe("Note body (plain text; line breaks preserved)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ student_id, title, body_markdown }, ctx) => {
    try {
      const supabase = authenticatedSupabase(ctx);

      // Redirect through the notifying RPC (bell + inbox) instead of a silent
      // direct insert. Each call is a distinct post, so we mint a fresh
      // idempotency key per call rather than deduping repeated notes.
      const idempotencyKey = `send_note-${crypto.randomUUID()}`;

      const { data, error } = await adminRpc(supabase, "mcp_post_classroom_note", {
        p_student_id: student_id,
        p_title: title,
        p_content_html: textToHtml(body_markdown),
        p_idempotency_key: idempotencyKey,
        p_description: body_markdown.slice(0, 240),
        p_notify: true,
      });
      if (error) throw error;

      let out = data as Record<string, unknown>;
      if (out?.ok === true && typeof out?.route === "string") {
        const email = await sendNotifyEmail(supabase, {
          studentId: student_id,
          title,
          route: out.route as string,
          description: body_markdown.slice(0, 240),
          assignmentType: "note",
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
