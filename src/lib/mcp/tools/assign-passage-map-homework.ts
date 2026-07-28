import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";
import { sendNotifyEmail } from "../notify-email";

const responseField = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  kind: z.enum(["short", "long"]).optional(),
  rows: z.number().int().min(1).max(16).optional(),
  placeholder: z.string().max(300).optional(),
  required: z.boolean().optional(),
});

const responseSection = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  instructions: z.string().max(1000).optional(),
  fields: z.array(responseField).min(1).max(80),
});

export default defineTool({
  name: "assign_passage_map_homework",
  title: "Assign passage-map homework",
  description:
    "Admin-only. Publish structured passage-map homework under Assigned work. Student responses save in the Classroom; the attached answer key stays hidden until submission.",
  inputSchema: {
    student_id: z.string().uuid(),
    title: z.string().min(1).max(160),
    content_html: z.string().min(1).max(500000),
    response_schema: z.object({
      version: z.literal(1),
      sections: z.array(responseSection).min(1).max(30),
    }),
    answer_key_html: z.string().min(1).max(500000),
    notify: z.boolean().optional().describe("Defaults to true."),
    idempotency_key: z
      .string()
      .min(8)
      .max(160)
      .describe("Stable unique key for this exact assignment. Reuse it only when retrying."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    try {
      const supabase = authenticatedSupabase(ctx);
      const { data, error } = await adminRpc(
        supabase,
        "mcp_assign_passage_map_homework",
        {
          p_student_id: input.student_id,
          p_title: input.title,
          p_content_html: input.content_html,
          p_response_schema: input.response_schema,
          p_answer_key_html: input.answer_key_html,
          p_idempotency_key: input.idempotency_key,
          p_notify: input.notify ?? true,
        },
      );
      if (error) throw error;

      // RPC handles bell + inbox; email is sent here. Skip on reused idempotent
      // results (the first run already emailed).
      const notify = input.notify ?? true;
      let out = data as Record<string, unknown>;
      if (notify && out?.ok === true && out?.reused !== true && typeof out?.route === "string") {
        const email = await sendNotifyEmail(supabase, {
          studentId: input.student_id,
          title: input.title,
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
