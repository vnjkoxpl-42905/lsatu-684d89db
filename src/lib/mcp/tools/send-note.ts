import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, textResult } from "./_shared";

export default defineTool({
  name: "send_note",
  title: "Send a classroom note to a student (admin)",
  description:
    "Admin only. Post a note to a student's Classroom feed. Body may be markdown or plain text.",
  inputSchema: {
    student_id: z.string().uuid().describe("Target student's id (profiles.class_id / auth user id)."),
    title: z.string().trim().min(1).max(200).describe("Short note title."),
    body_markdown: z.string().trim().min(1).max(20000).describe("Note body (markdown supported)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ student_id, title, body_markdown }, ctx) => {
    const admin = await requireAdmin(ctx);
    if (!admin.ok) return textResult(admin.error, true);
    const { supabase, userId } = admin;

    const { data, error } = await supabase
      .from("classroom_items")
      .insert({
        student_id,
        created_by: userId,
        type: "note",
        title,
        content_markdown: body_markdown,
        visible_to_student: true,
        status: "assigned",
      })
      .select("id")
      .single();
    if (error) return textResult(error.message, true);

    const itemId = (data as { id: string }).id;
    const route = `/classroom/item/${itemId}`;
    return {
      content: [{ type: "text", text: `Note sent — student route: ${route}` }],
      structuredContent: { item_id: itemId, route },
    };
  },
});
