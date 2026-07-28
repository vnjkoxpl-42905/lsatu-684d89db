import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";

export default defineTool({
  name: "post_classroom_note",
  title: "Post a Classroom note",
  description:
    "Admin-only. Post a student-facing note under Notes and recaps, with optional bell and inbox notification. Resolve the student first.",
  inputSchema: {
    student_id: z.string().uuid(),
    title: z.string().min(1).max(160),
    content_html: z.string().min(1).max(500000),
    description: z.string().max(500).optional(),
    notify: z.boolean().optional().describe("Defaults to true."),
    idempotency_key: z
      .string()
      .min(8)
      .max(160)
      .describe("Stable unique key for this exact post. Reuse it only when retrying."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const supabase = authenticatedSupabase(ctx);
      const { data, error } = await adminRpc(supabase, "mcp_post_classroom_note", {
        p_student_id: input.student_id,
        p_title: input.title,
        p_content_html: input.content_html,
        p_idempotency_key: input.idempotency_key,
        p_description: input.description ?? null,
        p_notify: input.notify ?? true,
      });
      if (error) throw error;
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: data,
      };
    } catch (error) {
      return toolError(error);
    }
  },
});
