import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function authenticatedSupabase(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) {
    throw new Error("Not authenticated");
  }
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function adminRpc(
  client: ReturnType<typeof authenticatedSupabase>,
  functionName: string,
  args: Record<string, unknown>,
) {
  // The accompanying migration deploys these RPCs before generated client
  // types can know about them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).rpc(functionName, args);
}

export function toolError(error: unknown) {
  let text: string;
  if (error instanceof Error) {
    text = error.message;
  } else if (error && typeof error === "object") {
    // Supabase RPC errors are plain objects: { message, details, hint, code }.
    // Serialize the whole thing so the real Postgres error surfaces instead of
    // a generic "LSAT U write failed".
    const e = error as Record<string, unknown>;
    const parts = [
      e.message ? `message: ${e.message}` : null,
      e.code ? `code: ${e.code}` : null,
      e.details ? `details: ${e.details}` : null,
      e.hint ? `hint: ${e.hint}` : null,
    ].filter(Boolean);
    text = parts.length > 0 ? parts.join(" | ") : JSON.stringify(error);
  } else {
    text = "LSAT U write failed";
  }
  return {
    content: [Object.freeze({ type: "text", text })],
    isError: true,
  };
}
