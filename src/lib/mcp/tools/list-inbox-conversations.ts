import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";

export default defineTool({
  name: "list_inbox_conversations",
  title: "List your LSAT U Inbox conversations",
  description: "List existing Inbox threads you participate in, with unread conversation and message counts. Admin only. Does not mark anything read.",
  inputSchema: {
    unread_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().nonnegative().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unread_only, limit, offset }, ctx) => {
    try {
      const { data, error } = await adminRpc(authenticatedSupabase(ctx), "mcp_list_inbox", {
        p_unread_only: unread_only ?? false,
        p_limit: limit ?? 20,
        p_offset: offset ?? 0,
      });
      if (error) throw error;
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (error) {
      return toolError(error);
    }
  },
});
