import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, textResult } from "./_shared";

export default defineTool({
  name: "list_students",
  title: "List students (admin)",
  description:
    "Admin only. List LSAT U students, optionally filtered by a case-insensitive name substring. Returns id (class_id = user_id) and display_name — use the id when calling assign_homework or send_note.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Optional case-insensitive name substring."),
    limit: z.number().int().positive().max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const admin = await requireAdmin(ctx);
    if (admin.error) return textResult(admin.error, true);
    let q = admin.supabase
      .from("profiles")
      .select("class_id, display_name")
      .order("display_name", { ascending: true })
      .limit(Math.min(limit ?? 50, 200));
    if (query) q = q.ilike("display_name", `%${query}%`);
    const { data, error } = await q;
    if (error) return textResult(error.message, true);
    const students = (data ?? []).map((r) => ({ id: r.class_id, display_name: r.display_name }));
    return {
      content: [{ type: "text", text: JSON.stringify(students, null, 2) }],
      structuredContent: { students },
    };
  },
});
