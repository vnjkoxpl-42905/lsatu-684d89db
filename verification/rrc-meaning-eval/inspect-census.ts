import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { stripVerbatimReads } from "../../supabase/functions/_shared/rrcReads";
const folder = resolve(process.argv[process.argv.indexOf("--receipt") + 1]);
const refs = JSON.parse(readFileSync(resolve(folder, "reference-transcripts.json"), "utf8"));
const source = JSON.parse(readFileSync("src/features/activity-centre/content/read-recall-colour-pt105-s2.json", "utf8"));
const requestFile = resolve(folder, "request-payload.json");
const sourceItems = existsSync(requestFile) ? JSON.parse(readFileSync(requestFile, "utf8")).census.items : source.items;
const rows = refs.map((ref: { slug: string; transcript_text: string }) => {
  const item = sourceItems.find((row: { slug: string }) => row.slug === ref.slug);
  if (!item) throw new Error("Unknown source item");
  const read = stripVerbatimReads(ref.transcript_text.split(/\s+/).filter(Boolean), item.chunks.map((c: { text: string }) => c.text));
  const spoken = read.kept.join(" ").trim();
  return { slug: ref.slug, readAloudWordsCut: read.cut, spokenWordCount: read.kept.length, spokenSha256: createHash("sha256").update(spoken).digest("hex"), spoken };
});
writeFileSync(resolve(folder, "stripped-transcripts-local.json"), JSON.stringify({ note: "Offline reconstruction using current shared stripVerbatimReads and the saved preflight snapshots. No provider calls or writes to live records.", rows }, null, 2) + "\n");
const census = JSON.parse(readFileSync(resolve(folder, "census-response.json"), "utf8"));
const normalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const audits = census.rows.map((row: { slug: string; detail_evidence?: Record<string, { evidence: string; carried: boolean }> }) => {
  const transcript = rows.find((r: { slug: string }) => r.slug === row.slug)!.spoken;
  const words = ` ${normalize(transcript)} `;
  return { slug: row.slug, groundedQuotes: Object.values(row.detail_evidence ?? {}).flatMap(d => d.evidence.split("\n").filter(part => part.trim())).length, invalidQuotes: Object.entries(row.detail_evidence ?? {}).filter(([, d]) => d.evidence.split("\n").some(part => part.trim() && !words.includes(` ${normalize(part)} `))).map(([id]) => Number(id)), note: "Each newline-separated quoted unit is checked against stripped student speech. Substring grounding only; semantic support still requires review." };
});
writeFileSync(resolve(folder, "stripped-evidence-audit-local.json"), JSON.stringify(audits, null, 2) + "\n");
console.log(JSON.stringify(rows.map(({ spoken, ...row }) => row), null, 2));
