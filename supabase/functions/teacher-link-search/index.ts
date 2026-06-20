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

const ROUTE_FALLBACKS = [
  { kind: "route", source_id: "/teacher", title: "Teacher Desk", subtitle: "Main assistant workspace", url: "/teacher", body: "teacher desk assistant today dashboard chat" },
  { kind: "route", source_id: "/teacher/library/activities", title: "Activity Center", subtitle: "Teacher activity library", url: "/teacher/library/activities", body: "activity centre activity center activities assign launch teacher library" },
  { kind: "route", source_id: "/activities", title: "Activity Centre", subtitle: "Student activity centre", url: "/activities", body: "activity centre activity center student activities assigned work" },
  { kind: "route", source_id: "/teacher/library/guided-drills", title: "Guided Drills", subtitle: "Teacher guided drill library", url: "/teacher/library/guided-drills", body: "guided drills guided drill library teacher assign launch" },
  { kind: "route", source_id: "/drill", title: "Smart Drill", subtitle: "Adaptive drilling surface", url: "/drill", body: "smart drill drilling practice questions adaptive drill" },
  { kind: "route", source_id: "/teacher/students", title: "Students", subtitle: "Teacher student roster", url: "/teacher/students", body: "students roster profiles learners teacher" },
  { kind: "route", source_id: "/teacher/schedule", title: "Schedule", subtitle: "Teacher schedule", url: "/teacher/schedule", body: "schedule calendar sessions meetings teacher" },
  { kind: "route", source_id: "/teacher/whiteboard", title: "Whiteboard", subtitle: "Teacher smartboard", url: "/teacher/whiteboard", body: "whiteboard smartboard canvas teaching board" },
  { kind: "route", source_id: "/teacher/library", title: "Teacher Library", subtitle: "Assignments, recaps, uploads, bootcamps", url: "/teacher/library", body: "library assignments recaps uploads bootcamps teacher" },
  { kind: "route", source_id: "/teacher/insights", title: "Bootcamp Insights", subtitle: "Teacher bootcamp analytics", url: "/teacher/insights", body: "bootcamp insights analytics progress teacher" },
  { kind: "route", source_id: "/bootcamps", title: "Bootcamps", subtitle: "Student bootcamp index", url: "/bootcamps", body: "bootcamps lessons causation intro principle flaw abstraction" },
  { kind: "route", source_id: "/bootcamp/causation-station", title: "Causation Station", subtitle: "Bootcamp", url: "/bootcamp/causation-station", body: "causation station causal reasoning bootcamp" },
  { kind: "route", source_id: "/bootcamp/intro-to-lr", title: "Intro to LR", subtitle: "Bootcamp", url: "/bootcamp/intro-to-lr", body: "intro to logical reasoning main conclusion structure bootcamp" },
  { kind: "route", source_id: "/bootcamp/principle-flaw", title: "Principle and Flaw", subtitle: "Bootcamp", url: "/bootcamp/principle-flaw", body: "principle flaw bootcamp questions" },
  { kind: "route", source_id: "/bootcamp/fallacy-flaw", title: "Flaw and Famous Flaws", subtitle: "Bootcamp", url: "/bootcamp/fallacy-flaw", body: "fallacy flaw famous flaws bootcamp" },
  { kind: "route", source_id: "/journal", title: "Wrong Answer Journal", subtitle: "Journal", url: "/journal", body: "wrong answer journal waj review missed questions" },
] as const;

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/centre/g, "center").replace(/[^a-z0-9]+/g, " ").trim();
}

function routeFallbacks(query: string, limit: number, kinds: string[] | null) {
  if (kinds?.length && !kinds.includes("route")) return [];
  const q = normalizeSearchText(query);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((token) => token.length > 1);
  return ROUTE_FALLBACKS.map((route) => {
    const haystack = normalizeSearchText(`${route.title} ${route.subtitle} ${route.url} ${route.body}`);
    let score = 0;
    if (haystack.includes(q)) score += 8;
    for (const token of tokens) if (haystack.includes(token)) score += token.length >= 5 ? 3 : 1;
    return { ...route, score };
  })
    .filter((route) => route.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((route) => ({
      id: route.source_id,
      kind: route.kind,
      source_id: route.source_id,
      title: route.title,
      subtitle: route.subtitle,
      url: route.url,
      snippet: route.body,
      score: route.score,
    }));
}

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
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "edge-function",
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

  const dbResults = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    source_id: r.source_id,
    title: r.title ?? r.source_id,
    subtitle: r.subtitle,
    url: r.url,
    snippet: r.snippet,
    score: r.similarity ?? r.rank ?? null,
  }));
  const seen = new Set<string>();
  const results = [...dbResults, ...routeFallbacks(query, limit, kinds)]
    .filter((r) => {
      const key = `${r.kind}:${r.source_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return json({
    results,
    note: results.length && !dbResults.length
      ? "The semantic content index is empty or had no match; returned the closest built-in route fallback."
      : undefined,
  });
});
