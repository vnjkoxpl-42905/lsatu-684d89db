// Admin-only ingestion for the shared LSAT knowledge layer.
//
// Ingestion source: authenticated admin upload payload (POST body containing
// { canonical_markdown, ingestion_jsonl, manifest }). Edge Functions cannot
// read arbitrary repository files at runtime, so the admin (or a build-time
// script running as admin) POSTs the pinned content that lives under
// content/lsat/logical-reasoning/ in the repo. This keeps the source of
// truth in git while still gating writes on a fresh admin JWT.
//
// The function:
//   1. Verifies caller is an admin.
//   2. Validates payload against the manifest (SHA-256, slug, version, count,
//      no duplicate record_ids, authority=canonical, verbatim=true).
//   3. Upserts the raw markdown into lsat_knowledge_sources.
//   4. Batches embeddings through gemini-proxy (google/gemini-embedding-001).
//   5. Upserts chunks into lsatu_content_index (kind='lsat_methodology').
//   6. Reconciles: after ALL upserts succeed, deletes rows for this
//      source_slug whose record_id is not in the incoming set (removes
//      stale rows, including same-version orphans).

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

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await denoCrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Missing auth");
  const token = auth.slice(7);
  const anon = createClient(supabaseUrl, anonKey);
  const { data, error } = await anon.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  const callerId = data.claims.sub as string;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Forbidden");
  return { admin, callerId };
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
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
  if (!res.ok) throw new Error(`embed batch failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.data ?? []).map((d: any) => d.embedding as number[]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST only" }, 405);

  let admin;
  try { ({ admin } = await verifyAdmin(req)); } catch (e) {
    return jsonRes({ error: e instanceof Error ? e.message : "auth failed" }, 401);
  }

  let payload: any;
  try { payload = await req.json(); } catch { return jsonRes({ error: "invalid JSON" }, 400); }

  const { canonical_markdown, ingestion_jsonl, manifest } = payload ?? {};
  if (typeof canonical_markdown !== "string" || typeof ingestion_jsonl !== "string" || !manifest) {
    return jsonRes({ error: "payload must include canonical_markdown, ingestion_jsonl, manifest" }, 400);
  }

  // ---- Validate manifest + hashes
  if (manifest.source_slug !== EXPECTED_SLUG) return jsonRes({ error: `slug must be ${EXPECTED_SLUG}` }, 400);
  const version = manifest.source_version;
  if (typeof version !== "string" || !version) return jsonRes({ error: "manifest.source_version required" }, 400);
  const mdSha = await sha256Hex(canonical_markdown);
  if (mdSha !== manifest.canonical_markdown_sha256) {
    return jsonRes({ error: "markdown sha256 mismatch", got: mdSha, expected: manifest.canonical_markdown_sha256 }, 400);
  }
  const jsonlSha = await sha256Hex(ingestion_jsonl);
  if (jsonlSha !== manifest.ingestion_jsonl_sha256) {
    return jsonRes({ error: "jsonl sha256 mismatch", got: jsonlSha, expected: manifest.ingestion_jsonl_sha256 }, 400);
  }

  const lines = ingestion_jsonl.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
  if (lines.length !== manifest.record_count) {
    return jsonRes({ error: "record count mismatch", got: lines.length, expected: manifest.record_count }, 400);
  }

  const records: any[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    let rec: any;
    try { rec = JSON.parse(lines[i]); } catch (e) {
      return jsonRes({ error: `line ${i + 1}: invalid JSON`, detail: String(e) }, 400);
    }
    if (!rec.record_id) return jsonRes({ error: `line ${i + 1}: missing record_id` }, 400);
    if (rec.authority !== "canonical" || rec.verbatim !== true) {
      return jsonRes({ error: `${rec.record_id}: must be authority=canonical & verbatim=true` }, 400);
    }
    if (rec.source_version !== version) return jsonRes({ error: `${rec.record_id}: source_version mismatch` }, 400);
    if (seenIds.has(rec.record_id)) return jsonRes({ error: `duplicate record_id ${rec.record_id}` }, 400);
    seenIds.add(rec.record_id);
    // Derive source_id (record_id without /chunk-NN) and enforce unique (source_id, chunk_index)
    const derivedSourceId = String(rec.record_id).replace(/\/chunk-\d+$/, "");
    const chunkKey = `${derivedSourceId}::${rec.chunk_index}`;
    if (seenKeys.has(chunkKey)) return jsonRes({ error: `duplicate (source_id, chunk_index) at ${rec.record_id}` }, 400);
    seenKeys.add(chunkKey);
    rec.__source_id = derivedSourceId;
    records.push(rec);
  }

  // ---- Upsert canonical source row
  const { error: srcErr } = await admin.from("lsat_knowledge_sources").upsert({
    slug: EXPECTED_SLUG,
    title: manifest.title ?? "LSAT LR Guide",
    domain: manifest.domain ?? "logical_reasoning",
    version,
    status: "active",
    authority: manifest.authority ?? "canonical",
    source_format: "markdown",
    raw_markdown: canonical_markdown,
    source_sha256: mdSha,
    metadata: manifest,
    imported_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "slug" });
  if (srcErr) return jsonRes({ error: "failed to upsert source", detail: srcErr.message }, 500);

  // ---- Embed in batches
  let inserted = 0, updated = 0, unchanged = 0, failed = 0;
  const failures: Array<{ record_id: string; reason: string }> = [];

  for (let i = 0; i < records.length; i += EMBED_BATCH) {
    const slice = records.slice(i, i + EMBED_BATCH);
    let vectors: number[][];
    try {
      vectors = await embedBatch(slice.map((r) => r.embedding_text));
    } catch (e) {
      for (const r of slice) failures.push({ record_id: r.record_id, reason: `embed: ${String(e)}` });
      failed += slice.length;
      continue;
    }
    if (vectors.length !== slice.length) {
      for (const r of slice) failures.push({ record_id: r.record_id, reason: "embed length mismatch" });
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

    const { data: upserted, error: upErr } = await admin
      .from("lsatu_content_index")
      .upsert(rows, { onConflict: "kind,source_id,chunk_index" })
      .select("id");
    if (upErr) {
      for (const r of slice) failures.push({ record_id: r.record_id, reason: `upsert: ${upErr.message}` });
      failed += slice.length;
      continue;
    }
    inserted += (upserted?.length ?? 0);
  }

  // ---- Reconcile: remove stale rows for this slug whose record_id is not in
  // the new set. Only after all upserts succeeded (skip if any failure).
  let obsolete = 0;
  if (failed === 0) {
    const keepIds = Array.from(seenIds);
    const { data: existing, error: exErr } = await admin
      .from("lsatu_content_index")
      .select("id, metadata")
      .eq("kind", "lsat_methodology")
      .eq("metadata->>source_slug", EXPECTED_SLUG);
    if (!exErr && existing) {
      const stale = existing.filter((row: any) => {
        const rid = row.metadata?.record_id;
        return !rid || !keepIds.includes(rid);
      }).map((r: any) => r.id);
      if (stale.length > 0) {
        const { error: delErr } = await admin.from("lsatu_content_index").delete().in("id", stale);
        if (!delErr) obsolete = stale.length;
      }
    }
  }

  return jsonRes({
    ok: failed === 0,
    slug: EXPECTED_SLUG,
    version,
    counts: { inserted, updated, unchanged, failed, obsolete, total: records.length },
    failures,
  });
});
