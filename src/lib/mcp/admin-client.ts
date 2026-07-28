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
  const message = error instanceof Error ? error.message : "LSAT U write failed";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}
