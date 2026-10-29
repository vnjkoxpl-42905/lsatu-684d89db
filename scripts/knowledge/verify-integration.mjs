#!/usr/bin/env node
/**
 * Integration verification harness for the LSAT knowledge layer.
 *
 * Runs read-only + guarded checks against a chosen environment (default:
 * $SUPABASE_URL from .env). Requires an ADMIN_JWT (short-lived, admin user)
 * and STUDENT_JWT (short-lived, non-admin user) to fully exercise the auth
 * and redaction paths. Any check that requires a token you did not supply is
 * skipped with a clear label.
 *
 * This does NOT run the production ingestion. It only issues retrieval calls
 * and a single dry-run ingestion (with a bad manifest) to prove that
 * validation rejects invalid payloads without touching the DB.
 *
 * Usage:
 *   SUPABASE_URL=... ADMIN_JWT=... STUDENT_JWT=... node scripts/knowledge/verify-integration.mjs
 */
const url = process.env.SUPABASE_URL;
const adminJwt = process.env.ADMIN_JWT;
const studentJwt = process.env.STUDENT_JWT;

if (!url) { console.error("SUPABASE_URL required"); process.exit(2); }

const call = async (fn, jwt, body, extraHeaders = {}) => {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
};

const results = [];
const check = (name, cond, detail) => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + JSON.stringify(detail) : ""}`); };

// 1. unauthenticated ingest is rejected
{ const r = await call("ingest-lsat-knowledge", null, {}); check("ingest requires auth", r.status === 401, r.json); }

// 2. non-admin ingest rejected
if (studentJwt) {
  const r = await call("ingest-lsat-knowledge", studentJwt, {}); check("ingest rejects non-admin", r.status === 401 || r.status === 403, { status: r.status });
} else { console.log("SKIP  ingest rejects non-admin (STUDENT_JWT missing)"); }

// 3. student retrieve: cannot pass arbitrary kinds
if (studentJwt) {
  const r = await call("retrieve-lsat-knowledge", studentJwt, { query: "flaw", kinds: ["route"] });
  check("student cannot request arbitrary kinds", r.status === 403, r.json);
}

// 4. student retrieve default (redacted, no full body)
if (studentJwt) {
  const r = await call("retrieve-lsat-knowledge", studentJwt, { query: "necessary assumption" });
  const rows = r.json?.results ?? [];
  const hasBody = rows.some((x) => typeof x.body === "string" && x.body.length > 0);
  check("student retrieval redacts full body", r.status === 200 && !hasBody, { status: r.status, rowCount: rows.length });
}

// 5. admin retrieve with include_body returns full body
if (adminJwt) {
  const r = await call("retrieve-lsat-knowledge", adminJwt, { query: "main conclusion", include_body: true, match_count: 3 });
  const rows = r.json?.results ?? [];
  const anyBody = rows.some((x) => typeof x.body === "string" && x.body.length > 0);
  check("admin retrieval returns full body when requested", r.status === 200 && anyBody, { status: r.status, rowCount: rows.length });
}

// 6. admin ingest with bad manifest is rejected before any write
if (adminJwt) {
  const r = await call("ingest-lsat-knowledge", adminJwt, {
    canonical_markdown: "hello", ingestion_jsonl: "", manifest: { source_slug: "wrong-slug" },
  });
  check("ingest rejects bad slug", r.status === 400, { status: r.status, error: r.json?.error });
}

// 7. Rate limit is enforced (issue many rapid requests as student).
if (studentJwt) {
  let rateHit = false;
  for (let i = 0; i < 35; i++) {
    const r = await call("retrieve-lsat-knowledge", studentJwt, { query: `test ${i}` });
    if (r.status === 429) { rateHit = true; break; }
  }
  check("student rate limit trips", rateHit);
}

// Summary
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
