import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";

export default defineTool({
  name: "find_students",
  title: "Find LSAT U students",
  description:
    "Admin-only. Resolve a student name or email to the exact LSAT U student ID before posting anything.",
  inputSchema: {
    query: z.string().min(2).max(160).describe("Student name or email fragment."),
    limit: z.number().int().min(1).max(25).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    try {
      const supabase = authenticatedSupabase(ctx);
      const { data, error } = await adminRpc(supabase, "mcp_find_students", {
        p_query: query,
        p_limit: limit ?? 10,
      });
      if (error) throw error;
      const students = data ?? [];
      return {
        content: [{ type: "text", text: JSON.stringify(students, null, 2) }],
        structuredContent: { students },
      };
    } catch (error) {
      return toolError(error);
    }
  },
});
