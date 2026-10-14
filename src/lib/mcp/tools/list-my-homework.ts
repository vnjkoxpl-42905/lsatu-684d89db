import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_my_homework",
  title: "List my homework assignments",
  description: "List homework assignments for the signed-in student, newest first. Optionally filter by status.",
  inputSchema: {
    status: z
      .enum(["assigned", "in_progress", "completed"])
      .optional()
      .describe("Optional status filter."),
    limit: z.number().int().positive().optional().describe("Max rows to return. Defaults to 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("homework_assignments")
      .select("id, set_title, set_description, status, created_at, started_at, completed_at")
      .eq("student_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 25, 100));
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { assignments: data ?? [] },
    };
  },
});
