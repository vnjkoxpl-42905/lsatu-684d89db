import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing auth");

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await anonClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Forbidden");

  return { admin, callerId: user.id };
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Reviewable corpus: the reusable cache artifacts (breakdowns + explanations).
const CORPUS_COLUMNS =
  "id, qid, kind, picked_answer, qtype, content_markdown, admin_markdown, rating, admin_notes, reviewed_at, updated_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin, callerId } = await verifyAdmin(req);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body?.action ?? "list";

    // ── List the corpus ─────────────────────────────────────────────────────
    if (action === "list") {
      const { kind, qtype, rated } = body;               // rated: 'graded' | 'ungraded'
      const limit = Math.min(Number(body.limit) || 150, 300);

      let query = admin
        .from("question_tutor_cache")
        .select(CORPUS_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (kind) query = query.eq("kind", kind);
      if (qtype) query = query.eq("qtype", qtype);
      if (rated === "ungraded") query = query.is("rating", null);
      if (rated === "graded") query = query.not("rating", "is", null);

      const { data, error } = await query;
      if (error) return jsonRes({ error: error.message }, 500);

      // Distinct qtypes for the filter dropdown.
      const { data: qtypeRows } = await admin
        .from("question_tutor_cache")
        .select("qtype")
        .not("qtype", "is", null)
        .limit(1000);
      const qtypes = Array.from(
        new Set((qtypeRows || []).map((r: any) => r.qtype).filter(Boolean)),
      ).sort();

      return jsonRes({ rows: data || [], qtypes });
    }

    // ── Grade / edit a row ──────────────────────────────────────────────────
    if (action === "update") {
      const { id, rating, admin_markdown, admin_notes } = body ?? {};
      if (!id || typeof id !== "string") return jsonRes({ error: "Missing row id" }, 400);

      if (rating != null && (typeof rating !== "number" || rating < 1 || rating > 5)) {
        return jsonRes({ error: "rating must be 1-5 or null" }, 400);
      }

      const patch: Record<string, unknown> = {
        reviewed_by: callerId,
        reviewed_at: new Date().toISOString(),
      };
      if ("rating" in body) patch.rating = rating ?? null;
      if ("admin_markdown" in body) patch.admin_markdown = admin_markdown || null;
      if ("admin_notes" in body) patch.admin_notes = admin_notes || null;

      const { data, error } = await admin
        .from("question_tutor_cache")
        .update(patch)
        .eq("id", id)
        .select(CORPUS_COLUMNS)
        .maybeSingle();

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ row: data });
    }

    return jsonRes({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Forbidden" ? 403 : msg === "Unauthorized" || msg === "Missing auth" ? 401 : 500;
    return jsonRes({ error: msg }, status);
  }
});
