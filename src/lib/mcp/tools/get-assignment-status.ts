import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";

export default defineTool({
  name: "get_assignment_status",
  title: "Get assignment status",
  description:
    "Admin-only. Verify that a structured LSAT U assignment exists and report its view, save, submission, and answer-key state.",
  inputSchema: {
    assignment_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ assignment_id }, ctx) => {
    try {
      const supabase = authenticatedSupabase(ctx);
      const { data, error } = await adminRpc(supabase, "mcp_get_assignment_status", {
        p_assignment_id: assignment_id,
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
