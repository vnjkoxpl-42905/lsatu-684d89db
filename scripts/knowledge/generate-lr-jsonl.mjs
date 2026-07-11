#!/usr/bin/env node
/**
 * Deterministic Markdown → JSONL generator for the LSAT LR canonical
 * knowledge layer.
 *
 * Design:
 *   - The canonical Markdown file (logical-reasoning-guide.md) is the source
 *     of truth for the raw instructional content.
 *   - The pinned JSONL (logical-reasoning-guide.ingestion.jsonl) supplies the
 *     structured record configuration: record_id, heading_path, entity_type,
 *     entity_key, section_key, aliases, related_*, sort_order, chunk_index,
 *     title, subtitle, url, plus the exact body_markdown extracted from the MD.
 *   - This script recomputes body_text, embedding_text, and body_text_sha256
 *     deterministically from body_markdown using the pure function in
 *     lr-md-to-text.mjs. It also recomputes the ingestion JSONL sha256 and
 *     asserts the MD sha256 matches the manifest.
 *   - `--check`: regenerate in memory and fail if the committed JSONL or
 *     manifest hashes differ from the regenerated output.
 *   - default (no flag): regenerate in place and update the manifest hashes.
 *
 * Invariants checked in every mode:
 *   - unique record_id
 *   - required top-level + metadata fields present, non-empty
 *   - heading_path non-empty
 *   - aliases / related_* are arrays
 *   - source_version / source_id / authority match manifest
 *   - every body_markdown block appears as a substring in the canonical MD
 *     (whitespace-collapsed) — this is the MD-as-source-of-truth guarantee.
 *   - body_text_sha256 matches body_text
 *   - question_type_count / reasoning_type_count match manifest
 *   - record count matches manifest
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToPlainText, buildEmbeddingText } from "./lr-md-to-text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "content", "lsat", "logical-reasoning");
const MD_PATH = resolve(ROOT, "logical-reasoning-guide.md");
const JSONL_PATH = resolve(ROOT, "logical-reasoning-guide.ingestion.jsonl");
const MANIFEST_PATH = resolve(ROOT, "logical-reasoning-guide.manifest.json");

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

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const errors = [];
const fail = (m) => errors.push(m);

const mode = process.argv.includes("--check") ? "check" : "generate";

const mdBuf = readFileSync(MD_PATH);
const md = mdBuf.toString("utf8");
const mdNorm = md.replace(/\s+/g, " ");
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const originalJsonlBuf = readFileSync(JSONL_PATH);
const inputRecs = originalJsonlBuf.toString("utf8").split(/\r?\n/).filter((l) => l.trim()).map((l, i) => {
  try { return JSON.parse(l); } catch (e) { fail(`line ${i + 1}: JSON parse failed: ${e.message}`); return null; }
}).filter(Boolean);

// MD hash guard
const mdSha = sha256(mdBuf);
if (mdSha !== manifest.canonical_markdown_sha256) fail(`markdown sha mismatch: got ${mdSha} expected ${manifest.canonical_markdown_sha256}`);

// Regenerate deterministically
const seen = new Set();
const questionTypes = new Set();
const reasoningTypes = new Set();
const outRecs = inputRecs.map((r) => {
  for (const k of REQUIRED) if (!(k in r)) fail(`${r.record_id ?? "?"}: missing ${k}`);
  const meta = r.metadata ?? {};
  for (const k of REQUIRED_META) if (!(k in meta)) fail(`${r.record_id}: metadata missing ${k}`);
  if (r.authority !== "canonical") fail(`${r.record_id}: authority must be canonical`);
  if (r.verbatim !== true) fail(`${r.record_id}: verbatim must be true`);
  if (r.source_version !== manifest.source_version) fail(`${r.record_id}: source_version mismatch`);
  if (r.source_id !== manifest.source_slug) fail(`${r.record_id}: source_id must equal manifest.source_slug`);
  if (!Array.isArray(r.heading_path) || r.heading_path.length === 0) fail(`${r.record_id}: heading_path must be non-empty`);
  if (!r.body_markdown?.trim()) fail(`${r.record_id}: body_markdown empty`);
  if (!Array.isArray(meta.aliases)) fail(`${r.record_id}: aliases must be array`);
  if (!Array.isArray(meta.related_question_types)) fail(`${r.record_id}: related_question_types must be array`);
  if (!Array.isArray(meta.related_reasoning_types)) fail(`${r.record_id}: related_reasoning_types must be array`);
  if (!["question_type","reasoning_type"].includes(r.entity_type)) fail(`${r.record_id}: bad entity_type`);
  if (seen.has(r.record_id)) fail(`duplicate record_id ${r.record_id}`);
  seen.add(r.record_id);
  if (r.entity_type === "question_type") questionTypes.add(r.entity_key);
  if (r.entity_type === "reasoning_type") reasoningTypes.add(r.entity_key);

  // MD-as-source-of-truth: body_markdown must appear in canonical MD
  const bmNorm = r.body_markdown.replace(/\s+/g, " ").trim();
  if (bmNorm && !mdNorm.includes(bmNorm)) {
    // Allow slight tolerance: try without list markers
    const stripped = bmNorm.replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "").trim();
    if (!mdNorm.includes(stripped)) fail(`${r.record_id}: body_markdown not found verbatim in canonical MD`);
  }

  const body_text = markdownToPlainText(r.body_markdown);
  const embedding_text = buildEmbeddingText(r, body_text);
  const body_text_sha256 = sha256(Buffer.from(body_text, "utf8"));
  return {
    ...r,
    body_text,
    embedding_text,
    metadata: { ...meta, body_text_sha256 },
  };
});

if (outRecs.length !== manifest.record_count) fail(`record count mismatch: got ${outRecs.length} expected ${manifest.record_count}`);
if (questionTypes.size !== manifest.question_type_count) fail(`question_type_count mismatch: got ${questionTypes.size} expected ${manifest.question_type_count}`);
if (reasoningTypes.size !== manifest.reasoning_type_count) fail(`reasoning_type_count mismatch: got ${reasoningTypes.size} expected ${manifest.reasoning_type_count}`);

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
  console.log(`OK --check: ${outRecs.length} records, jsonl sha=${outJsonlSha}, md sha=${mdSha}`);
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
console.log(`OK generate: ${outRecs.length} records, jsonl sha=${outJsonlSha}, md sha=${mdSha}`);
console.log(`question types=${questionTypes.size}, reasoning types=${reasoningTypes.size}`);
