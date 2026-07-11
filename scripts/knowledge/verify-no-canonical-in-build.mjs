#!/usr/bin/env node
/**
 * Post-build guard: fail if the canonical LSAT LR guide leaked into browser
 * assets. Runs against dist/ after `npm run build`.
 *
 * Scans for:
 *   - the exact SHA-256s from the manifest (fingerprints of the raw files),
 *   - a distinctive prose passage from the canonical Markdown,
 *   - the JSONL fenceposts (`"schema_version"` + `"record_id":"lsat-lr-`).
 *
 * Exits non-zero on any hit so CI/build fails.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");
const DIST = resolve(ROOT, "dist");
const CONTENT = resolve(ROOT, "content", "lsat", "logical-reasoning");
const MANIFEST_PATH = join(CONTENT, "logical-reasoning-guide.manifest.json");
const MD_PATH = join(CONTENT, "logical-reasoning-guide.md");

if (!existsSync(DIST)) {
  console.error("verify-no-canonical-in-build: dist/ not present.");
  console.error("This check runs as a postbuild step and must not be skipped.");
  console.error("Run `npm run build` before invoking this script.");
  process.exit(2);
}
if (!existsSync(MANIFEST_PATH) || !existsSync(MD_PATH)) {
  console.error("verify-no-canonical-in-build: canonical sources missing at", CONTENT);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const md = readFileSync(MD_PATH, "utf8");

// A distinctive passage (>= 80 chars) that only appears in the canonical guide.
// Use the first non-heading paragraph of >= 80 chars.
const distinctive = md
  .split(/\r?\n/)
  .find((l) => l.trim().length >= 80 && !l.trim().startsWith("#") && !l.trim().startsWith("```")) ?? md.slice(0, 120);

const needles = [
  { label: "canonical MD sha256", value: manifest.canonical_markdown_sha256 },
  { label: "ingestion JSONL sha256", value: manifest.ingestion_jsonl_sha256 },
  { label: "distinctive MD passage", value: distinctive.trim() },
  { label: "JSONL schema_version fencepost", value: '"schema_version":"1.1"' },
  { label: "JSONL record_id fencepost", value: '"record_id":"lsat-lr-' },
];

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(js|mjs|cjs|css|html|json|txt|map)$/.test(entry)) files.push(full);
  }
})(DIST);

const hits = [];
for (const f of files) {
  const buf = readFileSync(f, "utf8");
  for (const n of needles) {
    if (n.value && buf.includes(n.value)) {
      hits.push({ file: f.replace(ROOT + "/", ""), needle: n.label });
    }
  }
}

if (hits.length > 0) {
  console.error("FAIL: canonical LSAT guide leaked into build output:");
  for (const h of hits) console.error(`  - ${h.file} :: ${h.needle}`);
  process.exit(1);
}

console.log(`OK verify-no-canonical-in-build: scanned ${files.length} dist files; no canonical guide content present.`);
