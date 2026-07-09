// Memory OS — admin manager backend for the top-level /memory route.
// Verifies admin at the boundary (same pattern as admin-manage-users), then uses
// the service-role client for direct CRUD over the memory tables. Every mutation
// writes a memory_audit row so the manager's "what changed" feed stays truthful.
//
// All requests are POST with an `action` discriminator so the client can use
// supabase.functions.invoke({ body }) uniformly (invoke does not forward query
// strings). Read actions: 'list', 'audit'. Mutations require an `id`.
//
// Design: docs/superpowers/specs/2026-06-20-memory-os-design-v2.md

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Admin = ReturnType<typeof createClient>;

async function verifyAdmin(req: Request): Promise<{ admin: Admin; callerId: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth");
  const token = authHeader.slice("Bearer ".length);

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: claimsData, error } = await anonClient.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) throw new Error("Unauthorized");
  const callerId = claimsData.claims.sub as string;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) throw new Error("Forbidden");

  return { admin, callerId };
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

const ITEM_COLUMNS =
  "id, namespace_id, kind, title, content, tags, structured, source, source_authority, " +
  "subject_user_id, visibility, claim_key, supersedes, review_state, needs_review, confidence, " +
  "importance, use_count, success_count, last_used_at, pinned, status, created_at, updated_at, " +
  "memory_namespaces(owner_type, owner_id, label)";

async function writeAudit(
  admin: Admin,
  callerId: string,
  memoryId: string | null,
  namespaceId: string | null,
  action: string,
  detail: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await admin.from("memory_audit").insert({
    memory_id: memoryId,
    namespace_id: namespaceId,
    action,
    detail,
    actor: callerId,
  });
  if (error) {
    console.error("memory-admin: audit insert failed", { action, memoryId, error });
    return false;
  }
  return true;
}

async function loadItem(admin: Admin, id: string) {
  const { data } = await admin
    .from("memory_items")
    .select("id, namespace_id, title, content, tags, importance, pinned, status, review_state, needs_review")
    .eq("id", id)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { admin, callerId } = await verifyAdmin(req);
    if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = isRecord(body) ? String(body.action ?? "") : "";

    // ── Reads ──
    if (action === "list") {
      const ownerType = isRecord(body) ? (body.owner_type as string | undefined) : undefined;
      const kind = isRecord(body) ? (body.kind as string | undefined) : undefined;
      const status = (isRecord(body) ? (body.status as string | undefined) : undefined) ?? "active";
      const review = isRecord(body) ? (body.review as string | undefined) : undefined;
      const search = (isRecord(body) ? String(body.q ?? "") : "").trim();

      let query = admin
        .from("memory_items")
        .select(ITEM_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (status && status !== "all") query = query.eq("status", status);
      if (kind) query = query.eq("kind", kind);
      if (review === "needs") query = query.eq("needs_review", true);
      if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

      const { data: items, error } = await query;
      if (error) throw error;

      let rows = (items ?? []) as Array<Record<string, unknown>>;
      if (ownerType) {
        rows = rows.filter((r) => isRecord(r.memory_namespaces) && r.memory_namespaces.owner_type === ownerType);
      }

      const counts = {
        active: rows.filter((r) => r.status === "active").length,
        pinned: rows.filter((r) => r.pinned === true).length,
        needs_review: rows.filter((r) => r.needs_review === true).length,
        proposed: rows.filter((r) => r.status === "proposed").length,
      };
      return jsonRes({ items: rows, counts });
    }

    if (action === "audit") {
      const { data, error } = await admin
        .from("memory_audit")
        .select("id, memory_id, namespace_id, action, detail, actor, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return jsonRes({ audit: data ?? [] });
    }

    // ── Mutations (require an id) ──
    if (!action) return jsonRes({ error: "action is required" }, 400);
    const id = isRecord(body) ? String(body.id ?? "") : "";
    if (!id) return jsonRes({ error: "id is required" }, 400);

    const before = await loadItem(admin, id);
    if (!before) return jsonRes({ error: "memory not found" }, 404);
    const nsId = (before.namespace_id as string) ?? null;

    switch (action) {
      case "edit": {
        const updates: Record<string, unknown> = {};
        if (isRecord(body)) {
          if (typeof body.title === "string") updates.title = body.title;
          if (typeof body.content === "string") updates.content = body.content;
          if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t) => typeof t === "string");
          if (typeof body.importance === "number") updates.importance = Math.min(1, Math.max(0, body.importance));
        }
        if (!Object.keys(updates).length) return jsonRes({ error: "no editable fields" }, 400);
        const { error } = await admin.from("memory_items").update(updates).eq("id", id);
        if (error) throw error;
        const audit_written = await writeAudit(admin, callerId, id, nsId, "edit", { before, updates });
        return jsonRes({ success: true, audit_written });
      }
      case "pin": {
        const pinned = isRecord(body) ? Boolean(body.value) : true;
        const { error } = await admin.from("memory_items").update({ pinned }).eq("id", id);
        if (error) throw error;
        const audit_written = await writeAudit(admin, callerId, id, nsId, "edit", { pinned });
        return jsonRes({ success: true, audit_written });
      }
      case "archive": {
        const { error } = await admin.from("memory_items").update({ status: "archived" }).eq("id", id);
        if (error) throw error;
        const audit_written = await writeAudit(admin, callerId, id, nsId, "decay", { from: before.status, to: "archived" });
        return jsonRes({ success: true, audit_written });
      }
      case "restore": {
        const { error } = await admin.from("memory_items").update({ status: "active" }).eq("id", id);
        if (error) throw error;
        const audit_written = await writeAudit(admin, callerId, id, nsId, "edit", { from: before.status, to: "active" });
        return jsonRes({ success: true, audit_written });
      }
      case "resolve_conflict": {
        const decision = isRecord(body) ? String(body.decision ?? "approved") : "approved";
        const reject = decision === "rejected";
        const { error } = await admin
          .from("memory_items")
          .update({
            review_state: reject ? "rejected" : "approved",
            needs_review: false,
            status: reject ? "archived" : (before.status as string),
          })
          .eq("id", id);
        if (error) throw error;
        const audit_written = await writeAudit(admin, callerId, id, nsId, reject ? "reject" : "approve", { resolved: decision });
        return jsonRes({ success: true, audit_written });
      }
      case "approve_skill": {
        const { error } = await admin
          .from("memory_items")
          .update({ status: "active", review_state: "approved", needs_review: false })
          .eq("id", id);
        if (error) throw error;
        const audit_written = await writeAudit(admin, callerId, id, nsId, "approve", { from: before.status, to: "active" });
        return jsonRes({ success: true, audit_written });
      }
      case "forget": {
        // Write audit BEFORE the delete so a deletion is never trace-less.
        // PII-scrub: keep the action, drop the content; memory_id null so it can't dangle.
        const audit_written = await writeAudit(admin, callerId, null, nsId, "forget", { forgot_memory: id });
        const { error } = await admin.from("memory_items").delete().eq("id", id);
        if (error) throw error;
        return jsonRes({ success: true, audit_written });
      }
      default:
        return jsonRes({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg === "Forbidden" ? 403 : msg === "Unauthorized" || msg === "Missing auth" ? 401 : 500;
    return jsonRes({ error: msg }, status);
  }
});
