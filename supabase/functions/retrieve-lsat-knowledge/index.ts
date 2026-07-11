// Shared retrieval entry point for the LSAT knowledge layer.
//
// This is the ONLY path the frontend (or any client feature — tutor,
// explanations, drills, bootcamps, weakness analysis) should use to fetch
// canonical LR knowledge. It:
//   1. Requires an authenticated user (any signed-in role).
//   2. Creates a query embedding via the internal gemini-proxy (server-side,
//      never exposing the embedding endpoint to the browser).
//   3. Calls the backend-only retrieve_lsat_knowledge RPC (EXECUTE granted
//      to service_role only).
//   4. Returns ranked records with full body + provenance.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBED_MODEL = "google/gemini-embedding-001";

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyUser(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing auth");
  const token = auth.slice(7);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await anon.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return data.claims.sub as string;
}

async function embedQuery(text: string): Promise<number[]> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const v = json?.data?.[0]?.embedding;
  if (!Array.isArray(v)) throw new Error("no embedding returned");
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST only" }, 405);

  try { await verifyUser(req); } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : "auth failed" }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return jsonRes({ error: "invalid JSON" }, 400); }

  const query: string = String(body.query ?? "").trim();
  if (!query) return jsonRes({ error: "query required" }, 400);

  const filters = {
    entity_type: body.entity_type ?? null,
    entity_key: body.entity_key ?? null,
    section_key: body.section_key ?? null,
    authority_filter: body.authority ?? null,
    source_version_filter: body.source_version ?? null,
    match_count: Math.max(1, Math.min(Number(body.match_count ?? 8), 25)),
    kinds: Array.isArray(body.kinds) && body.kinds.length > 0 ? body.kinds : ["lsat_methodology"],
  };

  // Exact canonical-key lookup shortcut (metadata-only, no embedding needed).
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (body.canonical_id) {
    const { data, error } = await admin
      .from("lsatu_content_index")
      .select("id, kind, source_id, chunk_index, title, subtitle, body, url, metadata")
      .eq("kind", "lsat_methodology")
      .eq("source_id", String(body.canonical_id))
      .order("chunk_index", { ascending: true });
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ mode: "exact", results: data ?? [] });
  }

  let embedding: number[];
  try { embedding = await embedQuery(query); } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : "embed failed" }, 502);
  }

  const { data, error } = await admin.rpc("retrieve_lsat_knowledge", {
    query_text: query,
    query_embedding: embedding as unknown as string,
    entity_type: filters.entity_type,
    entity_key: filters.entity_key,
    section_key: filters.section_key,
    authority_filter: filters.authority_filter,
    source_version_filter: filters.source_version_filter,
    match_count: filters.match_count,
    kinds: filters.kinds,
  });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes({ mode: "hybrid", results: data ?? [] });
});
