import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminRpc, authenticatedSupabase, toolError } from "../admin-client";

export default defineTool({
  name: "reply_inbox_thread",
  title: "Send an explicit reply in an LSAT U Inbox thread",
  description: "Send a plain-text direct reply in an existing thread you participate in. A direct reply is distinct from a Classroom note. Read the thread, show the proposed reply and get the teacher's explicit approval to send. Never reply automatically. Admin only.",
  inputSchema: {
    thread_id: z.string().uuid(),
    body: z.string().trim().min(1).max(20000),
    reply_to_message_id: z.string().uuid().optional().describe("Quote this earlier message from the same thread."),
    idempotency_key: z.string().trim().min(8).max(128).describe("Unique per approved send. Reuse the exact key and text on retries."),
    confirm_send: z.literal(true).describe("True only after the teacher explicitly authorizes sending this reply."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ thread_id, body, reply_to_message_id, idempotency_key, confirm_send }, ctx) => {
    try {
      const { data, error } = await adminRpc(authenticatedSupabase(ctx), "mcp_reply_inbox_thread", {
        p_thread_id: thread_id,
        p_body: body,
        p_reply_to_message_id: reply_to_message_id ?? null,
        p_idempotency_key: idempotency_key,
        p_confirm_send: confirm_send,
      });
      if (error) throw error;
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data };
    } catch (error) {
      return toolError(error);
    }
  },
});
