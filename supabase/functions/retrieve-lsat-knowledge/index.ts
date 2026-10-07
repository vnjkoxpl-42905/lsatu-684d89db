// Shared retrieval entry point for the LSAT knowledge layer.
//
// This is the ONLY path a client (tutor, explanations, drills, bootcamps,
// weakness analysis) should use to fetch canonical LR knowledge.
//
// Access model:
//   - Any authenticated user may call this function.
//   - Ordinary (non-admin) callers are restricted server-side to
//     kind='lsat_methodology' and receive redacted results (title,
//     subtitle, url, metadata, short snippet — no full body). Full bodies
//     are only used server-side by other Edge Functions (tutor, explanations)
//     via `include_body=true` + `internal_key` (EDGE_INTERNAL_KEY).
//   - Admin callers receive full records and may pass the `kinds` array.
//   - Simple per-user in-memory rate limiter (best-effort within one warm
//     isolate) plus a hard cap on query length and match_count.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBED_MODEL = "gemini-embedding-001";
const DEFAULT_KIND = "lsat_methodology";
const ALLOWED_KINDS_ADMIN = new Set(["lsat_methodology"]);
const MAX_QUERY_LEN = 500;
const MAX_MATCH_COUNT = 15;
const MAX_MATCH_COUNT_STUDENT = 8;
const SNIPPET_MAX = 400;

// naive per-isolate rate limit: 30 requests/min per user
const rlWindowMs = 60_000;
const rlMax = 30;
const rlBuckets = new Map<string, number[]>();
function rateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = (rlBuckets.get(userId) ?? []).filter((t) => now - t < rlWindowMs);
  if (arr.length >= rlMax) { rlBuckets.set(userId, arr); return false; }
  arr.push(now); rlBuckets.set(userId, arr); return true;
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Fail-closed: internal access is only granted when the environment secret is
// a real, nonempty string AND the header matches it exactly. If the env var is
// missing or empty, internal access is impossible regardless of what header
// the caller sends. Exported so tests can exercise it directly.
export function isInternalRequest(req: Request): boolean {
  const secret = Deno.env.get("EDGE_INTERNAL_KEY");
  if (!secret || secret.length === 0) return false;
  const provided = req.headers.get("X-Internal-Key");
  return typeof provided === "string" && provided.length > 0 && provided === secret;
}

// Same fail-closed rule for outbound calls: only include the header when we
// actually have a real secret to send.
function outboundInternalHeaders(): Record<string, string> {
  const secret = Deno.env.get("EDGE_INTERNAL_KEY");
  return secret && secret.length > 0 ? { "X-Internal-Key": secret } : {};
}

async function verifyCaller(req: Request): Promise<{ userId: string; isAdmin: boolean; internal: boolean }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const internal = isInternalRequest(req);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing auth");
  const token = auth.slice(7);
  const anon = createClient(supabaseUrl, anonKey);
  const { data, error } = await anon.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  const userId = data.claims.sub as string;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return { userId, isAdmin: !!role, internal };
}

async function embedQuery(text: string): Promise<number[]> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy/embeddings`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...outboundInternalHeaders(),
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

function redact(rows: any[]): any[] {
  return rows.map((r) => {
    const body: string = typeof r.body === "string" ? r.body : "";
    const snippet = body.length > SNIPPET_MAX ? body.slice(0, SNIPPET_MAX).trimEnd() + "…" : body;
    const { body: _omit, ...rest } = r;
    return { ...rest, snippet };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST only" }, 405);

  let caller: { userId: string; isAdmin: boolean; internal: boolean };
  try { caller = await verifyCaller(req); } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : "auth failed" }, 401);
  }

  if (!rateLimit(caller.userId)) return jsonRes({ error: "rate_limited" }, 429);

  let body: any;
  try { body = await req.json(); } catch { return jsonRes({ error: "invalid JSON" }, 400); }

  const query: string = String(body.query ?? "").trim();
  if (!query && !body.canonical_id) return jsonRes({ error: "query or canonical_id required" }, 400);
  if (query.length > MAX_QUERY_LEN) return jsonRes({ error: `query too long (max ${MAX_QUERY_LEN})` }, 400);

  const maxCount = (caller.isAdmin || caller.internal) ? MAX_MATCH_COUNT : MAX_MATCH_COUNT_STUDENT;
  const requestedCount = Math.max(1, Math.min(Number(body.match_count ?? 6), maxCount));
  const wantsBody = body.include_body === true && (caller.isAdmin || caller.internal);

  // Kinds allowlist: non-admin callers may only request lsat_methodology.
  let kinds: string[];
  if (caller.isAdmin || caller.internal) {
    kinds = Array.isArray(body.kinds) && body.kinds.length > 0 ? body.kinds.map(String) : [DEFAULT_KIND];
    const bad = kinds.find((k) => !ALLOWED_KINDS_ADMIN.has(k));
    if (bad) return jsonRes({ error: `kind '${bad}' not allowed` }, 400);
  } else {
    if (body.kinds && (!Array.isArray(body.kinds) || body.kinds.some((k: string) => k !== DEFAULT_KIND))) {
      return jsonRes({ error: `kind must be '${DEFAULT_KIND}' for non-admin callers` }, 403);
    }
    kinds = [DEFAULT_KIND];
  }

  const filters = {
    entity_type: body.entity_type ?? null,
    entity_key: body.entity_key ?? null,
    section_key: body.section_key ?? null,
    authority_filter: body.authority ?? null,
    source_version_filter: body.source_version ?? null,
    match_count: requestedCount,
    kinds,
  };

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Exact canonical-id lookup. Goes through get_lsat_knowledge_by_canonical_id
  // which joins lsat_knowledge_sources so ONLY currently-active records are
  // returned. Ordinary callers may not widen kinds.
  if (body.canonical_id) {
    const { data, error } = await admin.rpc("get_lsat_knowledge_by_canonical_id", {
      _canonical_id: String(body.canonical_id),
      _kinds: kinds,
    });
    if (error) return jsonRes({ error: error.message }, 500);
    const rows = data ?? [];
    return jsonRes({ mode: "exact", results: wantsBody ? rows : redact(rows) });
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
  const rows = data ?? [];
  return jsonRes({ mode: "hybrid", results: wantsBody ? rows : redact(rows) });
});
