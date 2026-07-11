#!/usr/bin/env node
/**
 * TRUE Markdown-derived generator for the LSAT LR canonical knowledge layer.
 *
 * Inputs:
 *   - content/lsat/logical-reasoning/logical-reasoning-guide.md
 *       Canonical instructional Markdown. Only source of body text.
 *   - content/lsat/logical-reasoning/logical-reasoning-guide.sidecar.json
 *       Metadata-only sidecar (no body text). Provides record_id,
 *       canonical_id, entity_type/key, section_key/role, aliases,
 *       related_*, sort_order, chunk_index, title, heading_path.
 *   - content/lsat/logical-reasoning/logical-reasoning-guide.manifest.json
 *       Manifest with counts and expected hashes.
 *
 * Behavior:
 *   generate (default): parse MD, look up each sidecar record by
 *     heading_path, extract body_markdown verbatim from MD, derive
 *     body_text/embedding_text/body_text_sha256 deterministically, and
 *     write the JSONL + refresh the ingestion_jsonl_sha256 in the manifest.
 *   --check: regenerate in memory and require byte-for-byte equality
 *     with the committed JSONL and manifest hashes. Fails non-zero
 *     otherwise.
 *
 * Invariants:
 *   - Every sidecar record must resolve to exactly one MD heading_path.
 *   - Every MD leaf section under Question Types / Reasoning Types must
 *     be claimed by exactly one sidecar record.
 *   - Extracted body_markdown must be non-empty.
 *   - canonical_markdown_sha256 must match the manifest.
 *   - Deterministic ordering by sort_order.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToPlainText, buildEmbeddingText } from "./lr-md-to-text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "content", "lsat", "logical-reasoning");
const MD_PATH = resolve(ROOT, "logical-reasoning-guide.md");
const SIDECAR_PATH = resolve(ROOT, "logical-reasoning-guide.sidecar.json");
const JSONL_PATH = resolve(ROOT, "logical-reasoning-guide.ingestion.jsonl");
const MANIFEST_PATH = resolve(ROOT, "logical-reasoning-guide.manifest.json");

const ENTITY_ROOTS = new Set(["Question Types", "Reasoning Types"]);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const errors = [];
const fail = (m) => errors.push(m);
const mode = process.argv.includes("--check") ? "check" : "generate";

// ---------- Load inputs ----------
const mdBuf = readFileSync(MD_PATH);
const md = mdBuf.toString("utf8");
const sidecar = JSON.parse(readFileSync(SIDECAR_PATH, "utf8"));
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const originalJsonlBuf = readFileSync(JSONL_PATH);

// ---------- MD sha guard ----------
const mdSha = sha256(mdBuf);
if (mdSha !== manifest.canonical_markdown_sha256) {
  fail(`markdown sha mismatch: got ${mdSha} expected ${manifest.canonical_markdown_sha256}`);
}

// ---------- Parse MD into sections keyed by heading_path ----------
function parseMd(source) {
  const lines = source.split("\n");
  // Skip YAML frontmatter if present
  let i = 0;
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++;
  }
  const stack = ["", "", "", "", ""]; // H1..H5
  const sections = [];
  let curPath = null;
  let curBody = [];
  const flush = () => {
    if (curPath !== null) sections.push({ path: curPath.slice(), body: curBody.join("\n").replace(/^\n+/, "").replace(/\n+$/, "") });
  };
  for (; i < lines.length; i++) {
    const ln = lines[i];
    const h = /^(#{1,5}) (.+?)\s*$/.exec(ln);
    if (h) {
      flush();
      const depth = h[1].length;
      const text = h[2].trim();
      stack[depth - 1] = text;
      for (let j = depth; j < stack.length; j++) stack[j] = "";
      curPath = stack.filter(Boolean);
      curBody = [];
    } else if (curPath !== null) {
      curBody.push(ln);
    }
  }
  flush();
  return sections;
}

const allSections = parseMd(md);

// Drop H1 (document title) so path starts at Question Types / Reasoning Types.
// The MD H1 is "Logical Reasoning Guide to Question and Reasoning Types".
const H1 = allSections[0]?.path?.[0] ?? "";
const normalized = allSections.map((s) => ({
  path: s.path[0] === H1 ? s.path.slice(1) : s.path.slice(),
  body: s.body,
}));

// Index by heading_path (JSON key). Also collect entity-scoped leaves for coverage.
const byPath = new Map();
for (const s of normalized) {
  if (!s.path.length) continue;
  byPath.set(JSON.stringify(s.path), s.body);
}

// Leaves = sections whose path root is Question Types / Reasoning Types AND whose body
// has instructional text (some non-whitespace before the next heading). Sections that
// only contain sub-headings and nothing else (pure containers) are not records.
function isEntitySection(path) { return ENTITY_ROOTS.has(path[0]); }
const entityLeafPaths = new Set();
for (const s of normalized) {
  if (!isEntitySection(s.path)) continue;
  if (s.body.trim().length > 0) entityLeafPaths.add(JSON.stringify(s.path));
}

// ---------- Build records from sidecar ----------
if (!Array.isArray(sidecar.records) || sidecar.records.length !== manifest.record_count) {
  fail(`sidecar record count ${sidecar.records?.length} != manifest ${manifest.record_count}`);
}
if (sidecar.source_version !== manifest.source_version) fail(`sidecar version mismatch`);
if (sidecar.source_slug !== manifest.source_slug) fail(`sidecar slug mismatch`);

const claimed = new Set();
const seenRecordIds = new Set();
const questionTypes = new Set();
const reasoningTypes = new Set();

const sortedSidecar = sidecar.records.slice().sort((a, b) => a.sort_order - b.sort_order);
const outRecs = [];
for (const s of sortedSidecar) {
  const hpKey = JSON.stringify(s.heading_path);
  if (!byPath.has(hpKey)) { fail(`sidecar ${s.record_id}: heading_path not found in MD: ${hpKey}`); continue; }
  const bodyMd = byPath.get(hpKey);
  if (!bodyMd || !bodyMd.trim()) { fail(`sidecar ${s.record_id}: MD section body empty`); continue; }
  if (claimed.has(hpKey)) { fail(`heading_path claimed twice: ${hpKey}`); }
  claimed.add(hpKey);
  if (seenRecordIds.has(s.record_id)) fail(`duplicate record_id ${s.record_id}`);
  seenRecordIds.add(s.record_id);
  if (s.entity_type === "question_type") questionTypes.add(s.entity_key);
  if (s.entity_type === "reasoning_type") reasoningTypes.add(s.entity_key);

  const bodyText = markdownToPlainText(bodyMd);
  const rec = {
    schema_version: "1.1",
    record_id: s.record_id,
    source_id: manifest.source_slug,
    source_version: manifest.source_version,
    domain: manifest.domain,
    authority: manifest.authority,
    verbatim: true,
    kind: "lsat_methodology",
    entity_type: s.entity_type,
    entity_key: s.entity_key,
    section_key: s.section_key,
    heading_path: s.heading_path,
    title: s.title,
    chunk_index: s.chunk_index,
    sort_order: s.sort_order,
    body_markdown: bodyMd,
    body_text: bodyText,
    embedding_text: "", // set below (needs bodyText)
    metadata: {
      canonical_id: s.canonical_id,
      source_slug: manifest.source_slug,
      source_version: manifest.source_version,
      domain: manifest.domain,
      authority: manifest.authority,
      verbatim: true,
      heading_path: s.heading_path,
      entity_type: s.entity_type,
      entity_key: s.entity_key,
      section_key: s.section_key,
      section_role: s.section_role,
      section_occurrence: s.section_occurrence,
      aliases: s.aliases,
      related_question_types: s.related_question_types,
      related_reasoning_types: s.related_reasoning_types,
      body_text_sha256: sha256(Buffer.from(bodyText, "utf8")),
    },
  };
  rec.embedding_text = buildEmbeddingText(rec, bodyText);
  outRecs.push(rec);
}

// Coverage: every entity leaf in MD must be claimed by a sidecar record.
for (const key of entityLeafPaths) {
  if (!claimed.has(key)) fail(`MD leaf section not covered by sidecar: ${key}`);
}

// Manifest counts
if (outRecs.length !== manifest.record_count) fail(`record count mismatch: got ${outRecs.length} expected ${manifest.record_count}`);
if (questionTypes.size !== manifest.question_type_count) fail(`question_type_count mismatch: got ${questionTypes.size} expected ${manifest.question_type_count}`);
if (reasoningTypes.size !== manifest.reasoning_type_count) fail(`reasoning_type_count mismatch: got ${reasoningTypes.size} expected ${manifest.reasoning_type_count}`);

// ---------- Emit JSONL ----------
const outJsonl = outRecs.map((r) => JSON.stringify(r)).join("\n") + "\n";
const outJsonlBuf = Buffer.from(outJsonl, "utf8");
const outJsonlSha = sha256(outJsonlBuf);

if (mode === "check") {
  const committedSha = sha256(originalJsonlBuf);
  if (committedSha !== outJsonlSha) fail(`--check: committed JSONL sha ${committedSha} does not match regenerated ${outJsonlSha}`);
  if (manifest.ingestion_jsonl_sha256 !== outJsonlSha) fail(`--check: manifest.ingestion_jsonl_sha256 ${manifest.ingestion_jsonl_sha256} does not match regenerated ${outJsonlSha}`);
  if (errors.length) {
    for (const e of errors) console.error("FAIL:", e);
    console.error(`--check FAILED (${errors.length} error(s))`);
    process.exit(1);
  }
  console.log(`OK --check: ${outRecs.length} records; jsonl sha=${outJsonlSha}; md sha=${mdSha}`);
  process.exit(0);
}

if (errors.length) {
  for (const e of errors) console.error("FAIL:", e);
  console.error(`generation aborted: ${errors.length} error(s)`);
  process.exit(1);
}
writeFileSync(JSONL_PATH, outJsonlBuf);
const newManifest = { ...manifest, ingestion_jsonl_sha256: outJsonlSha };
writeFileSync(MANIFEST_PATH, JSON.stringify(newManifest, null, 2) + "\n");
console.log(`OK generate: ${outRecs.length} records; jsonl sha=${outJsonlSha}; md sha=${mdSha}`);
console.log(`question types=${questionTypes.size}, reasoning types=${reasoningTypes.size}`);
