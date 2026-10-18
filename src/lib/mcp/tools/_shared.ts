import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function requireAdmin(
  ctx: ToolContext,
): Promise<{ supabase: SupabaseClient; userId: string; error: null } | { supabase: null; userId: null; error: string }> {
  if (!ctx.isAuthenticated()) return { supabase: null, userId: null, error: "Not authenticated" };
  const supabase = supabaseForUser(ctx);
  const userId = ctx.getUserId();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return { supabase: null, userId: null, error: error.message };
  if (!data) return { supabase: null, userId: null, error: "Admin role required to use this tool." };
  return { supabase, userId, error: null };
}

export function textResult(text: string, isError = false) {
  return { content: [Object.freeze({ type: "text", text })], isError };
}
