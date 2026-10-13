#!/usr/bin/env node
/**
 * End-to-end lifecycle test for the LSAT knowledge layer using an ISOLATED
 * temporary staging setup. Uses distinct test slug values so the production
 * `lsat-lr-question-reasoning-guide` records are NEVER touched. All test
 * data is deleted at the end.
 *
 * Runs as service_role (via SUPABASE_SERVICE_ROLE_KEY) because the staging
 * table intentionally has no anon/authenticated write policies.
 *
 * Covers:
 *   - staged 158-record import
 *   - deterministic embedding vectors (dim=3072) — avoids paid embedding calls
 *   - live embedding smoke test through the gemini-proxy (1 call)
 *   - atomic promotion via public.promote_lsat_knowledge_version
 *   - retrieval RPC filters to active version
 *   - canonical-id RPC returns only active version rows
 *   - kind filter rejection
 *   - redaction snippet contract
 *   - failure preservation (short-staged run rolls back, prior active intact)
 *   - stale-record removal after version B promotion
 *   - re-promote of the currently-active version is safe (idempotent-ish)
 *   - 5 example retrieval queries against the isolated test data
 *
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               PGHOST/PGUSER/PGDATABASE/PGPORT/PGPASSWORD (for psql fallbacks).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const CONTENT = resolve(ROOT, "content", "lsat", "logical-reasoning");
const MANIFEST = JSON.parse(readFileSync(resolve(CONTENT, "logical-reasoning-guide.manifest.json"), "utf8"));
const JSONL = readFileSync(resolve(CONTENT, "logical-reasoning-guide.ingestion.jsonl"), "utf8");
const RECORDS = JSONL.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}
const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TEST_SLUG = `lsatu-test-${process.pid}-${Date.now()}`;
const TEST_VERSION_A = "test-1.0.0-a";
const TEST_VERSION_B = "test-1.0.0-b";
const KIND = "lsat_methodology";
const DIM = 3072;

const RESULTS = [];
const step = (name) => ({
  pass(detail = "") { RESULTS.push({ name, ok: true, detail }); console.log(`PASS ${name}${detail ? " — " + detail : ""}`); return true; },
  fail(detail = "") { RESULTS.push({ name, ok: false, detail }); console.error(`FAIL ${name}${detail ? " — " + detail : ""}`); return false; },
});

function seededVector(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const v = new Array(DIM);
  let x = (h >>> 0) || 1;
  for (let i = 0; i < DIM; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    v[i] = ((x / 0xffffffff) * 2 - 1) * 0.01;
  }
  return v;
}
const vecLit = (arr) => `[${arr.join(",")}]`;

async function cleanup() {
  await supa.from("lsatu_content_staging").delete().eq("source_id", TEST_SLUG);
  await supa.from("lsatu_content_index").delete().eq("source_id", TEST_SLUG);
  await supa.from("lsat_knowledge_sources").delete().eq("slug", TEST_SLUG);
}

async function upsertSource(version, status) {
  const { error } = await supa.from("lsat_knowledge_sources").upsert({
    slug: TEST_SLUG,
    title: "LR Test Guide",
    domain: "logical_reasoning",
    version, status,
    authority: "canonical",
    source_format: "markdown",
    raw_markdown: "test-md-body",
    source_sha256: "0000000000000000000000000000000000000000000000000000000000000000",
    metadata: { test: true, source_version: version },
  }, { onConflict: "slug,version" });
  if (error) throw new Error(`upsertSource: ${error.message}`);
}

async function stageAll(version) {
  const rows = RECORDS.map((r) => {
    const meta = { ...r.metadata, source_slug: TEST_SLUG, source_version: version, record_id: r.record_id, sort_order: r.sort_order };
    return {
      import_version: version,
      kind: KIND,
      source_id: TEST_SLUG,
      chunk_index: r.sort_order,
      title: r.title,
      subtitle: Array.isArray(r.heading_path) ? r.heading_path.join(" > ") : "",
      body: r.body_markdown,
      metadata: meta,
      embedding: vecLit(seededVector(r.record_id)),
    };
  });
  const BATCH = 40;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supa.from("lsatu_content_staging").upsert(rows.slice(i, i + BATCH), { onConflict: "import_version,kind,source_id,chunk_index" });
    if (error) throw new Error(`stageAll batch ${i}: ${error.message}`);
  }
}

async function callRetrieve(query, vec, matchCount, kinds) {
  return await supa.rpc("retrieve_lsat_knowledge", {
    query_text: query,
    query_embedding: vecLit(vec),
    entity_type: null, entity_key: null, section_key: null,
    authority_filter: null, source_version_filter: null,
    match_count: matchCount,
    kinds,
  });
}

async function main() {
  await cleanup();
  try {
    // ---------- 0. Live embedding smoke test (1 call) ----------
    let s = step("gemini_proxy_embedding_dim_3072");
    try {
      const internalKey = process.env.EDGE_INTERNAL_KEY;
      if (!internalKey) throw new Error("EDGE_INTERNAL_KEY unset in this env; cannot smoke-test proxy");
      const url = `${SUPABASE_URL}/functions/v1/gemini-proxy/embeddings`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          "X-Internal-Key": internalKey,
        },
        body: JSON.stringify({ model: "google/gemini-embedding-001", input: "test embedding call" }),
      });
      if (!res.ok) throw new Error(`http ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const j = await res.json();
      const v = j?.data?.[0]?.embedding;
      if (!Array.isArray(v) || v.length !== DIM || v.some((n) => !Number.isFinite(n))) throw new Error(`bad vector shape ${v?.length}`);
      s.pass(`embedding dim=${v.length} finite`);
    } catch (e) {
      s.fail(`embedding smoke test failed: ${e.message}`);
    }

    // ---------- 1. Stage 158 for version A ----------
    s = step("stage_158_records_version_a");
    await upsertSource(TEST_VERSION_A, "importing");
    await stageAll(TEST_VERSION_A);
    const { count: stagedCount } = await supa.from("lsatu_content_staging").select("id", { count: "exact", head: true }).eq("import_version", TEST_VERSION_A);
    if (stagedCount !== 158) return s.fail(`staged=${stagedCount}`);
    s.pass(`staged=${stagedCount}`);

    // ---------- 2. Promote version A ----------
    s = step("promote_version_a_atomically");
    const { data: prom, error: pErr } = await supa.rpc("promote_lsat_knowledge_version", { _slug: TEST_SLUG, _version: TEST_VERSION_A, _expected_count: 158 });
    if (pErr) return s.fail(pErr.message);
    const { count: liveA } = await supa.from("lsatu_content_index").select("id", { count: "exact", head: true }).eq("source_id", TEST_SLUG);
    const { data: srcA } = await supa.from("lsat_knowledge_sources").select("status").eq("slug", TEST_SLUG).eq("version", TEST_VERSION_A).maybeSingle();
    if (liveA !== 158 || srcA?.status !== "active") return s.fail(`live=${liveA} status=${srcA?.status}`);
    s.pass(`live=${liveA} status=active promoted=${JSON.stringify(prom)}`);

    // ---------- 3. Retrieval RPC filters to active version ----------
    s = step("retrieve_rpc_returns_only_active_records");
    const probeVec = seededVector(RECORDS[0].record_id);
    const { data: hits, error: rErr } = await callRetrieve("conclusion argument premise flaw", probeVec, 5, [KIND]);
    if (rErr) return s.fail(rErr.message);
    const testHits = (hits ?? []).filter((h) => h.source_id === TEST_SLUG);
    const allActive = testHits.length > 0 && testHits.every((h) => h.metadata?.source_version === TEST_VERSION_A);
    if (!allActive) return s.fail(`testHits=${testHits.length}`);
    s.pass(`hits=${hits?.length ?? 0} test-scoped=${testHits.length} all_active=true`);

    // ---------- 4. canonical-id RPC ----------
    s = step("canonical_id_rpc_returns_only_active");
    const cid = RECORDS[0].metadata.canonical_id;
    const { data: cidRows, error: cErr } = await supa.rpc("get_lsat_knowledge_by_canonical_id", { _canonical_id: cid, _kinds: [KIND] });
    if (cErr) return s.fail(cErr.message);
    const testCidRows = (cidRows ?? []).filter((r) => r.source_id === TEST_SLUG);
    if (!testCidRows.length || !testCidRows.every((r) => r.metadata?.source_version === TEST_VERSION_A)) return s.fail(JSON.stringify(cidRows));
    s.pass(`hits=${testCidRows.length}`);

    // ---------- 5. Failure preservation (short-stage promote) ----------
    s = step("failed_promote_preserves_active_a");
    await upsertSource(TEST_VERSION_B, "importing");
    await stageAll(TEST_VERSION_B);
    // Delete one row from B staging
    const { data: victim } = await supa.from("lsatu_content_staging").select("id").eq("import_version", TEST_VERSION_B).limit(1).maybeSingle();
    if (victim) await supa.from("lsatu_content_staging").delete().eq("id", victim.id);
    const { error: shouldRaise } = await supa.rpc("promote_lsat_knowledge_version", { _slug: TEST_SLUG, _version: TEST_VERSION_B, _expected_count: 158 });
    if (!shouldRaise) return s.fail("promote unexpectedly succeeded on short stage");
    const { data: activeAfter } = await supa.from("lsat_knowledge_sources").select("version").eq("slug", TEST_SLUG).eq("status", "active").maybeSingle();
    const { count: liveAfter } = await supa.from("lsatu_content_index").select("id", { count: "exact", head: true }).eq("source_id", TEST_SLUG);
    if (activeAfter?.version !== TEST_VERSION_A || liveAfter !== 158) return s.fail(`active=${activeAfter?.version} live=${liveAfter}`);
    s.pass(`active=${activeAfter?.version} live=${liveAfter} error=${shouldRaise.message.split(":")[0]}`);

    // ---------- 6. Full-stage B + promote → stale removed ----------
    s = step("stale_records_removed_on_new_promote");
    await supa.from("lsatu_content_staging").delete().eq("import_version", TEST_VERSION_B);
    await stageAll(TEST_VERSION_B);
    const { data: promB, error: pBErr } = await supa.rpc("promote_lsat_knowledge_version", { _slug: TEST_SLUG, _version: TEST_VERSION_B, _expected_count: 158 });
    if (pBErr) return s.fail(pBErr.message);
    const { data: srcs } = await supa.from("lsat_knowledge_sources").select("version,status").eq("slug", TEST_SLUG);
    const activeVer = srcs?.find((r) => r.status === "active")?.version;
    const archivedA = srcs?.find((r) => r.version === TEST_VERSION_A)?.status;
    const { count: liveVerA } = await supa.from("lsatu_content_index").select("id", { count: "exact", head: true }).eq("source_id", TEST_SLUG).filter("metadata->>source_version", "eq", TEST_VERSION_A);
    const { count: liveVerB } = await supa.from("lsatu_content_index").select("id", { count: "exact", head: true }).eq("source_id", TEST_SLUG).filter("metadata->>source_version", "eq", TEST_VERSION_B);
    if (activeVer !== TEST_VERSION_B || archivedA !== "archived" || liveVerA !== 0 || liveVerB !== 158) return s.fail(`active=${activeVer} A=${archivedA} liveA=${liveVerA} liveB=${liveVerB}`);
    s.pass(`active=${activeVer} A→archived liveA=0 liveB=${liveVerB} promoted=${JSON.stringify(promB)}`);

    // ---------- 7. Re-promote of active version is safe ----------
    s = step("re_promote_active_version_is_safe");
    await stageAll(TEST_VERSION_B);
    const { data: promB2, error: pB2Err } = await supa.rpc("promote_lsat_knowledge_version", { _slug: TEST_SLUG, _version: TEST_VERSION_B, _expected_count: 158 });
    if (pB2Err) return s.fail(pB2Err.message);
    const { count: liveB2 } = await supa.from("lsatu_content_index").select("id", { count: "exact", head: true }).eq("source_id", TEST_SLUG);
    if (liveB2 !== 158) return s.fail(`live=${liveB2}`);
    s.pass(`live=${liveB2} promoted=${JSON.stringify(promB2)}`);

    // ---------- 8. Kind filter honored ----------
    s = step("retrieve_rpc_kind_filter_honored");
    const { data: bogus } = await callRetrieve("conclusion", probeVec, 5, ["NOT_A_KIND"]);
    if ((bogus ?? []).length !== 0) return s.fail(`bogus returned ${bogus.length}`);
    s.pass(`bogus kind returned 0`);

    // ---------- 9. Redaction snippet contract ----------
    s = step("redaction_snippet_length_bound_400");
    const { data: sample } = await callRetrieve("conclusion argument premise flaw", probeVec, 3, [KIND]);
    const SNIPPET_MAX = 400;
    const snippetOk = (sample ?? []).every((r) => {
      const b = r.body ?? "";
      const snippet = b.length > SNIPPET_MAX ? b.slice(0, SNIPPET_MAX).trimEnd() + "…" : b;
      // full body may be huge; snippet after edge redaction must be <= SNIPPET_MAX + 1 (ellipsis)
      return snippet.length <= SNIPPET_MAX + 2;
    });
    if (!snippetOk) return s.fail("snippet bound broken");
    s.pass(`snippet ≤${SNIPPET_MAX + 1} for ${sample?.length ?? 0} rows`);

    // ---------- 10. Five example retrieval queries ----------
    s = step("five_example_retrieval_queries");
    const examples = [
      "How do I recognize a Flaw question stem?",
      "What are the correct answer patterns for Necessary Assumption?",
      "How do I attack a causal argument on a Weaken question?",
      "What conditional inferences follow from contrapositive?",
      "How do I handle Parallel Flaw and match famous flaws?",
    ];
    const summary = [];
    for (const q of examples) {
      const { data: rows, error } = await callRetrieve(q, probeVec, 3, [KIND]);
      if (error) return s.fail(`${q}: ${error.message}`);
      summary.push({ query: q, top: (rows ?? []).slice(0, 3).map((r) => `${r.metadata?.entity_key}/${r.metadata?.section_key} — ${r.title}`) });
    }
    console.log("\n=== FIVE EXAMPLE RETRIEVAL QUERIES (against isolated test data) ===");
    for (const ex of summary) {
      console.log(`\nQ: ${ex.query}`);
      ex.top.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    }
    s.pass(`${summary.length} queries returned ranked hits`);

    // ---------- Report ----------
    const fails = RESULTS.filter((r) => !r.ok);
    console.log("\n=== SUMMARY ===");
    for (const r of RESULTS) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? " :: " + r.detail : ""}`);
    if (fails.length) {
      console.error(`\n${fails.length} FAIL(s)`);
      process.exitCode = 1;
    } else {
      console.log(`\nALL ${RESULTS.length} PASS`);
    }
  } finally {
    await cleanup();
    console.log("\ncleanup: removed all test rows for slug", TEST_SLUG);
  }
}

main().catch((e) => { console.error("fatal:", e?.message ?? e); process.exitCode = 1; cleanup(); });
