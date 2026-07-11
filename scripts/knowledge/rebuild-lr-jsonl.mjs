#!/usr/bin/env node
/**
 * Deterministic validator/rebuild guardrails for the LSAT LR canonical knowledge
 * layer. This script does NOT rewrite content — it verifies that the pinned
 * JSONL and Markdown match the manifest and that every record preserves:
 *   - stable record_id (unique)
 *   - heading_path
 *   - entity_type + entity_key (question or reasoning type)
 *   - section_key + section_role
 *   - sort_order
 *   - source_version, authority='canonical', verbatim=true
 *   - aliases + related_question_types + related_reasoning_types (arrays)
 *   - body_text_sha256 checksum matches body_text
 *
 * Exit 0 on success, non-zero with a report on any failure.
 *
 * Usage: node scripts/knowledge/rebuild-lr-jsonl.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "content", "lsat", "logical-reasoning");
const MD_PATH = resolve(ROOT, "logical-reasoning-guide.md");
const JSONL_PATH = resolve(ROOT, "logical-reasoning-guide.ingestion.jsonl");
const MANIFEST_PATH = resolve(ROOT, "logical-reasoning-guide.manifest.json");

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

const md = readFileSync(MD_PATH);
const jsonlBuf = readFileSync(JSONL_PATH);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

const mdSha = sha256(md);
const jsonlSha = sha256(jsonlBuf);
if (mdSha !== manifest.canonical_markdown_sha256)
  fail(`markdown sha mismatch: got ${mdSha} expected ${manifest.canonical_markdown_sha256}`);
if (jsonlSha !== manifest.ingestion_jsonl_sha256)
  fail(`jsonl sha mismatch: got ${jsonlSha} expected ${manifest.ingestion_jsonl_sha256}`);

const lines = jsonlBuf.toString("utf8").split(/\r?\n/).filter((l) => l.trim().length > 0);
if (lines.length !== manifest.record_count)
  fail(`record count mismatch: jsonl=${lines.length} manifest=${manifest.record_count}`);

const REQUIRED = [
  "schema_version", "record_id", "source_id", "source_version", "domain",
  "authority", "verbatim", "kind", "entity_type", "entity_key", "section_key",
  "heading_path", "title", "chunk_index", "sort_order", "body_markdown",
  "body_text", "embedding_text", "metadata",
];
const REQUIRED_META = [
  "canonical_id", "source_slug", "source_version", "authority", "verbatim",
  "heading_path", "entity_type", "entity_key", "section_key", "section_role",
  "section_occurrence", "aliases", "related_question_types",
  "related_reasoning_types", "body_text_sha256",
];

const seenIds = new Set();
const questionTypes = new Set();
const reasoningTypes = new Set();

lines.forEach((raw, idx) => {
  let rec;
  try { rec = JSON.parse(raw); } catch (e) { fail(`line ${idx + 1}: invalid JSON: ${e.message}`); return; }
  for (const k of REQUIRED) if (!(k in rec)) fail(`line ${idx + 1} (${rec.record_id ?? "?"}): missing top-level field ${k}`);
  if (rec.authority !== "canonical") fail(`${rec.record_id}: authority must be canonical`);
  if (rec.verbatim !== true) fail(`${rec.record_id}: verbatim must be true`);
  if (rec.source_version !== manifest.source_version) fail(`${rec.record_id}: source_version mismatch`);
  if (rec.source_id !== manifest.source_slug) fail(`${rec.record_id}: source_id must equal manifest.source_slug`);
  if (!Array.isArray(rec.heading_path) || rec.heading_path.length === 0) fail(`${rec.record_id}: heading_path must be non-empty array`);
  if (seenIds.has(rec.record_id)) fail(`duplicate record_id ${rec.record_id}`);
  seenIds.add(rec.record_id);
  const meta = rec.metadata ?? {};
  for (const k of REQUIRED_META) if (!(k in meta)) fail(`${rec.record_id}: metadata missing ${k}`);
  if (!Array.isArray(meta.aliases)) fail(`${rec.record_id}: metadata.aliases must be array`);
  if (!Array.isArray(meta.related_question_types)) fail(`${rec.record_id}: metadata.related_question_types must be array`);
  if (!Array.isArray(meta.related_reasoning_types)) fail(`${rec.record_id}: metadata.related_reasoning_types must be array`);
  const bodyHash = sha256(Buffer.from(rec.body_text, "utf8"));
  if (bodyHash !== meta.body_text_sha256) fail(`${rec.record_id}: body_text_sha256 mismatch (got ${bodyHash})`);
  if (rec.entity_type === "question_type") questionTypes.add(rec.entity_key);
  if (rec.entity_type === "reasoning_type") reasoningTypes.add(rec.entity_key);
});

if (questionTypes.size !== manifest.question_type_count)
  fail(`question_type_count mismatch: got ${questionTypes.size} expected ${manifest.question_type_count}`);
if (reasoningTypes.size !== manifest.reasoning_type_count)
  fail(`reasoning_type_count mismatch: got ${reasoningTypes.size} expected ${manifest.reasoning_type_count}`);

if (process.exitCode) {
  console.error("Validation failed.");
  process.exit(process.exitCode);
}
console.log(`OK: ${lines.length} records, ${questionTypes.size} question types, ${reasoningTypes.size} reasoning types.`);
console.log(`md sha256    = ${mdSha}`);
console.log(`jsonl sha256 = ${jsonlSha}`);
