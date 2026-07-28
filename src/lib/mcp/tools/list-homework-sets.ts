import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, textResult } from "./_shared";

export default defineTool({
  name: "list_homework_sets",
  title: "List homework sets (admin)",
  description:
    "Admin only. List homework sets you have created. Use a set's id when calling assign_homework.",
  inputSchema: {
    query: z.string().trim().min(1).optional().describe("Optional case-insensitive title substring."),
    limit: z.number().int().positive().max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const admin = await requireAdmin(ctx);
    if (admin.error) return textResult(admin.error, true);
    let q = admin.supabase
      .from("homework_sets")
      .select("id, title, description, created_at, question_qids")
      .eq("created_by", admin.userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 50, 200));
    if (query) q = q.ilike("title", `%${query}%`);
    const { data, error } = await q;
    if (error) return textResult(error.message, true);
    const sets = (data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      question_count: Array.isArray(s.question_qids) ? s.question_qids.length : 0,
      created_at: s.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(sets, null, 2) }],
      structuredContent: { sets },
    };
  },
});
