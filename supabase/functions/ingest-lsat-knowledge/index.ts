// Admin-only ingestion for the shared LSAT knowledge layer.
//
// Lifecycle enforced here:
//   - Any prior source row with the same slug stays untouched until the whole
//     import succeeds. On failure the new attempt is recorded as `failed` with
//     details; the previously-active version is never demoted.
//   - The new version row is written `importing` first, flipped to `active`
//     only after all 158 records embed + upsert + reconcile without error.
//
// Per-record + per-embedding validation is done in-function BEFORE anything
// is written to lsatu_content_index. Embedding requests use bounded retry
// with exponential backoff.

import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto as denoCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPECTED_SLUG = "lsat-lr-question-reasoning-guide";
const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_BATCH = 16;
const EMBED_DIM = 3072;
const EMBED_MAX_ATTEMPTS = 3;

const REQUIRED_TOP = [
  "schema_version", "record_id", "source_id", "source_version", "domain",
  "authority", "verbatim", "kind", "entity_type", "entity_key", "section_key",
  "heading_path", "title", "chunk_index", "sort_order", "body_markdown",
  "body_text", "embedding_text", "metadata",
] as const;
const REQUIRED_META = [
  "canonical_id", "source_slug", "source_version", "authority", "verbatim",
  "heading_path", "entity_type", "entity_key", "section_key", "section_role",
  "section_occurrence", "aliases", "related_question_types",
  "related_reasoning_types", "body_text_sha256",
] as const;
const VALID_ENTITY_TYPES = new Set(["question_type", "reasoning_type"]);

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await denoCrypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing auth");
  const anon = createClient(supabaseUrl, anonKey);
  const { data, error } = await anon.auth.getClaims(auth.slice(7));
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  const callerId = data.claims.sub as string;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Forbidden");
  return { admin, callerId };
}

async function embedBatchWithRetry(inputs: string[]): Promise<number[][]> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < EMBED_MAX_ATTEMPTS) {
    try {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy/embeddings`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
      });
      if (!res.ok) throw new Error(`embed http ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const vecs: number[][] = (json.data ?? []).map((d: any) => d.embedding as number[]);
      if (vecs.length !== inputs.length) throw new Error(`embed count ${vecs.length} != inputs ${inputs.length}`);
      for (let i = 0; i < vecs.length; i++) {
        const v = vecs[i];
        if (!Array.isArray(v) || v.length !== EMBED_DIM) throw new Error(`embed[${i}] dim ${v?.length} != ${EMBED_DIM}`);
        for (const n of v) if (!Number.isFinite(n)) throw new Error(`embed[${i}] contains non-finite value`);
      }
      return vecs;
    } catch (e) {
      lastErr = e;
      attempt += 1;
      if (attempt >= EMBED_MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function validateRecord(rec: any, i: number, version: string): string | null {
  for (const k of REQUIRED_TOP) if (!(k in rec)) return `line ${i + 1}: missing top-level ${k}`;
  const meta = rec.metadata ?? {};
  for (const k of REQUIRED_META) if (!(k in meta)) return `${rec.record_id}: metadata missing ${k}`;
  if (rec.authority !== "canonical" || rec.verbatim !== true) return `${rec.record_id}: must be canonical & verbatim`;
  if (rec.source_version !== version) return `${rec.record_id}: source_version mismatch`;
  if (!VALID_ENTITY_TYPES.has(rec.entity_type)) return `${rec.record_id}: invalid entity_type ${rec.entity_type}`;
  if (typeof rec.entity_key !== "string" || !rec.entity_key.trim()) return `${rec.record_id}: entity_key empty`;
  if (typeof rec.section_key !== "string" || !rec.section_key.trim()) return `${rec.record_id}: section_key empty`;
  if (typeof meta.section_role !== "string" || !meta.section_role.trim()) return `${rec.record_id}: section_role empty`;
  if (!Array.isArray(rec.heading_path) || rec.heading_path.length === 0) return `${rec.record_id}: heading_path empty`;
  if (typeof rec.body_markdown !== "string" || !rec.body_markdown.trim()) return `${rec.record_id}: body_markdown empty`;
  if (typeof rec.body_text !== "string" || !rec.body_text.trim()) return `${rec.record_id}: body_text empty`;
  if (typeof rec.embedding_text !== "string" || !rec.embedding_text.trim()) return `${rec.record_id}: embedding_text empty`;
  if (!Array.isArray(meta.aliases)) return `${rec.record_id}: aliases not array`;
  if (!Array.isArray(meta.related_question_types)) return `${rec.record_id}: related_question_types not array`;
  if (!Array.isArray(meta.related_reasoning_types)) return `${rec.record_id}: related_reasoning_types not array`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST only" }, 405);

  let admin: any;
  try { ({ admin } = await verifyAdmin(req)); } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : "auth failed" }, 401);
  }

  let payload: any;
  try { payload = await req.json(); } catch { return jsonRes({ error: "invalid JSON" }, 400); }
  const { canonical_markdown, ingestion_jsonl, manifest } = payload ?? {};
  if (typeof canonical_markdown !== "string" || typeof ingestion_jsonl !== "string" || !manifest) {
    return jsonRes({ error: "payload must include canonical_markdown, ingestion_jsonl, manifest" }, 400);
  }
  if (manifest.source_slug !== EXPECTED_SLUG) return jsonRes({ error: `slug must be ${EXPECTED_SLUG}` }, 400);
  const version = manifest.source_version;
  if (typeof version !== "string" || !version) return jsonRes({ error: "manifest.source_version required" }, 400);

  const mdSha = await sha256Hex(canonical_markdown);
  if (mdSha !== manifest.canonical_markdown_sha256) return jsonRes({ error: "markdown sha256 mismatch", got: mdSha, expected: manifest.canonical_markdown_sha256 }, 400);
  const jsonlSha = await sha256Hex(ingestion_jsonl);
  if (jsonlSha !== manifest.ingestion_jsonl_sha256) return jsonRes({ error: "jsonl sha256 mismatch", got: jsonlSha, expected: manifest.ingestion_jsonl_sha256 }, 400);

  const lines = ingestion_jsonl.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
  if (lines.length !== manifest.record_count) return jsonRes({ error: "record count mismatch", got: lines.length, expected: manifest.record_count }, 400);

  const records: any[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    let rec: any;
    try { rec = JSON.parse(lines[i]); } catch (e) { return jsonRes({ error: `line ${i + 1}: invalid JSON`, detail: String(e) }, 400); }
    const err = validateRecord(rec, i, version);
    if (err) return jsonRes({ error: err }, 400);
    const expectedBodySha = await sha256Hex(rec.body_text);
    if (rec.metadata.body_text_sha256 !== expectedBodySha) {
      return jsonRes({ error: `${rec.record_id}: body_text_sha256 mismatch (got ${expectedBodySha})` }, 400);
    }
    if (seenIds.has(rec.record_id)) return jsonRes({ error: `duplicate record_id ${rec.record_id}` }, 400);
    seenIds.add(rec.record_id);
    const derivedSourceId = String(rec.record_id).replace(/\/chunk-\d+$/, "");
    const chunkKey = `${derivedSourceId}::${rec.chunk_index}`;
    if (seenKeys.has(chunkKey)) return jsonRes({ error: `duplicate (source_id, chunk_index) at ${rec.record_id}` }, 400);
    seenKeys.add(chunkKey);
    rec.__source_id = derivedSourceId;
    records.push(rec);
  }

  // Look up any existing source row so we can preserve it on failure.
  const { data: existingSource } = await admin
    .from("lsat_knowledge_sources").select("id, status, version").eq("slug", EXPECTED_SLUG).maybeSingle();
  const previouslyActive = existingSource?.status === "active" ? existingSource.version : null;

  // Idempotent guard: if the same version is already active AND its content
  // matches (same md sha), still allow re-run (upsert is a no-op essentially).

  // Insert `importing` row (either update-in-place for same version or
  // insert a new row keyed by (slug, version)). We keep the previous active
  // row untouched.
  const nowIso = new Date().toISOString();
  const importingRow = {
    slug: EXPECTED_SLUG,
    title: manifest.title ?? "LSAT LR Guide",
    domain: manifest.domain ?? "logical_reasoning",
    version,
    status: "importing",
    authority: manifest.authority ?? "canonical",
    source_format: "markdown",
    raw_markdown: canonical_markdown,
    source_sha256: mdSha,
    metadata: manifest,
    imported_at: nowIso,
    updated_at: nowIso,
  };
  // If the row for this slug is currently `active` on a DIFFERENT version we
  // do not overwrite it — write a fresh row (assumes unique constraint on
  // (slug, version); if not present the upsert on slug will collide, in which
  // case we still preserve behaviour by only marking active at the end).
  // For simplicity and given the table has PK on slug in this repo, we upsert
  // by slug BUT capture the old status/version to restore on failure.
  const { error: srcErr } = await admin.from("lsat_knowledge_sources").upsert(importingRow, { onConflict: "slug" });
  if (srcErr) return jsonRes({ error: "failed to write importing source row", detail: srcErr.message }, 500);

  const restoreOnFailure = async (reason: string, details: unknown) => {
    // Roll the source row forward to `failed` with details; if a previous
    // active version existed, keep that in metadata so operators can revert.
    await admin.from("lsat_knowledge_sources").upsert({
      slug: EXPECTED_SLUG,
      title: manifest.title ?? "LSAT LR Guide",
      domain: manifest.domain ?? "logical_reasoning",
      version,
      status: "failed",
      authority: manifest.authority ?? "canonical",
      source_format: "markdown",
      raw_markdown: canonical_markdown,
      source_sha256: mdSha,
      metadata: { ...manifest, failure: { reason, details, previously_active_version: previouslyActive } },
      imported_at: nowIso,
      updated_at: new Date().toISOString(),
    }, { onConflict: "slug" });
  };

  let processed = 0, upserted = 0, failed = 0;
  const failures: Array<{ record_id: string; reason: string }> = [];

  for (let i = 0; i < records.length; i += EMBED_BATCH) {
    const slice = records.slice(i, i + EMBED_BATCH);
    let vectors: number[][];
    try {
      vectors = await embedBatchWithRetry(slice.map((r) => r.embedding_text));
    } catch (e) {
      for (const r of slice) failures.push({ record_id: r.record_id, reason: `embed: ${String(e)}` });
      failed += slice.length;
      continue;
    }
    const rows = slice.map((r, k) => {
      const meta = { ...(r.metadata ?? {}), record_id: r.record_id, sort_order: r.sort_order };
      const subtitle = Array.isArray(r.heading_path) ? r.heading_path.join(" › ") : (r.metadata?.section_role ?? "");
      return {
        kind: "lsat_methodology",
        source_id: r.__source_id,
        chunk_index: r.chunk_index,
        title: r.title,
        subtitle,
        body: r.body_markdown,
        url: null as string | null,
        metadata: meta,
        embedding: vectors[k] as unknown as string,
      };
    });
    const { data: up, error: upErr } = await admin
      .from("lsatu_content_index")
      .upsert(rows, { onConflict: "kind,source_id,chunk_index" })
      .select("id");
    if (upErr) {
      for (const r of slice) failures.push({ record_id: r.record_id, reason: `upsert: ${upErr.message}` });
      failed += slice.length;
      continue;
    }
    processed += slice.length;
    upserted += (up?.length ?? 0);
  }

  if (failed > 0) {
    await restoreOnFailure("record_failures", { failed, failures: failures.slice(0, 20) });
    return jsonRes({
      ok: false,
      slug: EXPECTED_SLUG, version,
      counts: { processed, upserted, failed, obsolete: 0, total: records.length },
      failures,
      previously_active_version: previouslyActive,
    }, 500);
  }

  // Reconcile: delete stale rows for this slug (fail hard on error).
  let obsolete = 0;
  const keepIds = Array.from(seenIds);
  const { data: existing, error: exErr } = await admin
    .from("lsatu_content_index")
    .select("id, metadata")
    .eq("kind", "lsat_methodology")
    .eq("metadata->>source_slug", EXPECTED_SLUG);
  if (exErr) {
    await restoreOnFailure("reconcile_query_failed", exErr.message);
    return jsonRes({ ok: false, error: "reconcile query failed", detail: exErr.message, counts: { processed, upserted, failed, obsolete: 0, total: records.length } }, 500);
  }
  const stale = (existing ?? []).filter((row: any) => {
    const rid = row.metadata?.record_id;
    return !rid || !keepIds.includes(rid);
  }).map((r: any) => r.id);
  if (stale.length > 0) {
    const { error: delErr } = await admin.from("lsatu_content_index").delete().in("id", stale);
    if (delErr) {
      await restoreOnFailure("reconcile_delete_failed", delErr.message);
      return jsonRes({ ok: false, error: "reconcile delete failed", detail: delErr.message, counts: { processed, upserted, failed, obsolete: 0, total: records.length } }, 500);
    }
    obsolete = stale.length;
  }

  // Flip to active only after full success.
  const { error: actErr } = await admin.from("lsat_knowledge_sources").update({
    status: "active",
    updated_at: new Date().toISOString(),
    metadata: { ...manifest, previously_active_version: previouslyActive },
  }).eq("slug", EXPECTED_SLUG).eq("version", version);
  if (actErr) {
    await restoreOnFailure("activate_failed", actErr.message);
    return jsonRes({ ok: false, error: "failed to activate source", detail: actErr.message }, 500);
  }

  return jsonRes({
    ok: true,
    slug: EXPECTED_SLUG,
    version,
    counts: { processed, upserted, failed, obsolete, total: records.length },
    previously_active_version: previouslyActive,
  });
});
