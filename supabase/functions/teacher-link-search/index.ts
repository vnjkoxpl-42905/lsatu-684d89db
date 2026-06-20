// Teacher link search - admin-only semantic + FTS search over lsatu_content_index.
// Returns deep-link candidates the Teacher Desk assistant (or any admin caller)
// can render as LinkCards.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface MatchRow {
  id: string;
  kind: string;
  source_id: string;
  title: string | null;
  subtitle: string | null;
  url: string | null;
  metadata: Record<string, unknown> | null;
  snippet: string | null;
  similarity?: number;
  rank?: number;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  // Verify the caller is an authenticated admin.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  let body: { query?: string; limit?: number; kinds?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const query = (body.query ?? "").trim();
  if (!query) return json({ error: "query is required" }, 400);
  const limit = Math.min(Math.max(Number(body.limit ?? 5) || 5, 1), 10);
  const kinds = Array.isArray(body.kinds) && body.kinds.length ? body.kinds : null;

  // Embed via Lovable AI Gateway.
  let queryEmbedding: number[] | null = null;
  try {
    const er = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: query }),
    });
    if (er.ok) {
      const ej = (await er.json()) as { data?: Array<{ embedding?: number[] }> };
      queryEmbedding = ej.data?.[0]?.embedding ?? null;
    } else {
      console.warn("embedding failed", er.status, await er.text());
    }
  } catch (e) {
    console.warn("embedding threw", e);
  }

  let rows: MatchRow[] = [];

  if (queryEmbedding) {
    const { data, error } = await admin.rpc("match_lsatu_content", {
      query_embedding: queryEmbedding as unknown as string,
      match_count: limit,
      kind_filter: kinds,
    });
    if (error) console.warn("match_lsatu_content error", error.message);
    rows = (data as MatchRow[] | null) ?? [];
  }

  if (!rows.length) {
    const { data, error } = await admin.rpc("fts_lsatu_content", {
      q: query,
      match_count: limit,
      kind_filter: kinds,
    });
    if (error) console.warn("fts_lsatu_content error", error.message);
    rows = (data as MatchRow[] | null) ?? [];
  }

  const results = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    source_id: r.source_id,
    title: r.title ?? r.source_id,
    subtitle: r.subtitle,
    url: r.url,
    snippet: r.snippet,
    score: r.similarity ?? r.rank ?? null,
  }));

  return json({ results });
});
