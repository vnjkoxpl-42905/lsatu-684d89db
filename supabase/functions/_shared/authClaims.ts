import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Verify a caller's JWT.
 *
 * The project uses asymmetric signing keys, and under those the legacy
 * `auth.getUser(jwt)` path (a GET /user call, usually made on a service-role
 * client) is rejected with `invalid claim: missing sub claim` — so genuinely
 * signed-in users were being told they were unauthorized. `getClaims` on an
 * anon client verifies the token locally against the published keys instead.
 *
 * Returns null when the request carries no usable bearer token.
 */
export async function userFromRequest(
  req: Request,
): Promise<{ id: string; email: string | null } | null> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7);
  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data, error } = await authClient.auth.getClaims(jwt);
    const sub = data?.claims?.sub as string | undefined;
    if (error || !sub) return null;
    return { id: sub, email: (data?.claims?.email as string | undefined) ?? null };
  } catch {
    return null;
  }
}
