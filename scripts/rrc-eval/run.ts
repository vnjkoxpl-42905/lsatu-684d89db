/** Offline by default. No deployed grades or records are read or written. */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { buildJudgeEntries, toDetailsByLine, buildJudgePrompt, buildJudgeResponseSchema, parseJudgeReply, gradeStimulus } from "../../src/features/activity-centre/recall/grading";
import { checkReciting } from "../../supabase/functions/_shared/rrcOverlap";
import { applyReviewedMateriality } from "../../supabase/functions/_shared/rrcMeaningKeys";

const MODEL = "gemini-3.1-flash-lite";
const OUTPUT_CAP = 8192;
const BUDGET_USD = 0.50;
const root = process.cwd();
const fixturePath = resolve(root, "scripts/rrc-eval/fixtures/golden-recalls.json");
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
interface Case {
  id: string; sourceSection: string; itemSlug: string; spoken: string; recall?: string;
  expected: { minPercent?: number; maxPercent?: number; readGiven?: boolean; readMatches?: boolean; reciting?: boolean; listing?: boolean; mustCarryDetails: string[]; mustMissDetails: string[] };
  provenance: { sourceFile: string; sourceFileSha256: string; scriptFile?: string; scriptSha256?: string };
}
interface Item { slug: string; prompt: string; chunks: { text: string; details: { text: string }[] }[]; the_read?: string }

function insideRoot(path: string): string {
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Fixture source is outside repository");
  return full;
}
function keyFromExistingEnv(): string | undefined {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  for (const file of [resolve(homedir(), "dev/ai-os/.env"), resolve(root, ".env")]) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^\s*GEMINI_API_KEY\s*=\s*(.*?)\s*$/m);
    const key = match?.[1]?.replace(/^(["'])(.*)\1$/, "$2").trim();
    if (key) return key;
  }
  return undefined;
}
async function main() {
  const args = process.argv.slice(2).filter(a => a !== "--");
  if (args.some(a => !["--run", "--dry-run"].includes(a))) throw new Error("Only --dry-run (default) or --run is supported");
  if (args.includes("--run") && args.includes("--dry-run")) throw new Error("Choose --run or --dry-run");
  const paid = args.includes("--run");
  const bytes = readFileSync(fixturePath);
  const fixtures = JSON.parse(bytes.toString()) as { schemaVersion: number; cases: Case[] };
  if (fixtures.schemaVersion !== 1 || !fixtures.cases.length || fixtures.cases.length > 15) throw new Error("Expected 1 to 15 schema-v1 cases");
  if (new Set(fixtures.cases.map(c => c.id)).size !== fixtures.cases.length) throw new Error("Duplicate case ids");
  const jobs = fixtures.cases.map(c => {
    const sourceBytes = readFileSync(insideRoot(c.provenance.sourceFile));
    if (sha(sourceBytes) !== c.provenance.sourceFileSha256) throw new Error(`${c.id}: source hash mismatch`);
    if (c.provenance.scriptFile && c.provenance.scriptSha256 && sha(readFileSync(insideRoot(c.provenance.scriptFile))) !== c.provenance.scriptSha256) throw new Error(`${c.id}: reference script hash mismatch`);
    const content = JSON.parse(sourceBytes.toString()) as { source_section: string; items: Item[] };
    const item = content.items.find(i => i.slug === c.itemSlug);
    if (!item || content.source_section !== c.sourceSection || !c.spoken.trim()) throw new Error(`${c.id}: invalid question/transcript mapping`);
    const { entries } = applyReviewedMateriality({ stimulus: item.chunks.map(chunk => chunk.text).join(" "), entries: buildJudgeEntries(toDetailsByLine(item.chunks, c.itemSlug), []), slug: c.itemSlug });
    for (const detail of [...c.expected.mustCarryDetails, ...c.expected.mustMissDetails]) {
      if (!entries.some(e => e.text === detail)) throw new Error(`${c.id}: expected detail absent from authored key`);
    }
    const prompt = buildJudgePrompt({ stimulus: item.prompt, entries, spoken: c.spoken, recall: c.recall, theRead: item.the_read });
    const responseJsonSchema = buildJudgeResponseSchema({ entries, theRead: item.the_read, spoken: c.spoken });
    // Conservative reservation: one token per UTF-8 byte, plus envelope overhead.
    // Output reserve uses the request's explicit output-token cap.
    const reserve = ((Buffer.byteLength(prompt, "utf8") + Buffer.byteLength(JSON.stringify(responseJsonSchema), "utf8") + 1024) * 0.25 + OUTPUT_CAP * 1.50) / 1_000_000;
    return { c, entries, stimulus: item.prompt, prompt, responseJsonSchema, reserve };
  });
  const reservedUsd = jobs.reduce((n, j) => n + j.reserve, 0);
  if (reservedUsd > BUDGET_USD) throw new Error("Conservative batch reservation exceeds $0.50; no calls made");
  const folder = resolve(root, "verification/rrc-meaning-eval", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(folder, { recursive: true });
  const report: Record<string, unknown> = { mode: paid ? "run" : "dry-run", model: MODEL, providerRoute: "direct-google-not-production-gateway", generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: OUTPUT_CAP, responseJsonSchema: "per-case shared buildJudgeResponseSchema; see prompts.json" }, fixtureSha256: sha(bytes), sharedSourceSha256: sha(readFileSync(resolve(root, "supabase/functions/_shared/rrcGrading.ts"))), cases: jobs.length, providerCalls: 0, maxCalls: 15, outputTokenCap: OUTPUT_CAP, budgetUsd: BUDGET_USD, conservativeReservedUsd: reservedUsd, reservationIsNotABill: true, modelRunReference: "Not injected: local fixture runner tests source plus transcript; full production walkthrough comparison is separate.", status: "validated-no-provider-calls", results: [] };
  const save = () => writeFileSync(resolve(folder, "report.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(resolve(folder, "prompts.json"), JSON.stringify(jobs.map(j => ({ id: j.c.id, itemSlug: j.c.itemSlug, sourceFile: j.c.provenance.sourceFile, sourceSha256: j.c.provenance.sourceFileSha256, promptSha256: sha(j.prompt), responseSchemaSha256: sha(JSON.stringify(j.responseJsonSchema)), responseJsonSchema: j.responseJsonSchema, prompt: j.prompt })), null, 2) + "\n");
  save();
  if (!paid) { console.log(`Validated ${jobs.length} cases; zero provider calls. Report: ${relative(root, folder)}`); return; }
  const key = keyFromExistingEnv();
  if (!key) { report.status = "blocked-missing-existing-GEMINI_API_KEY"; save(); console.log("No existing GEMINI_API_KEY found. Zero provider calls; no fallback or credential changes."); process.exitCode = 2; return; }
  for (const job of jobs) {
    report.providerCalls = Number(report.providerCalls) + 1;
    save();
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: "POST", signal: AbortSignal.timeout(90000), headers: { "x-goog-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: job.prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: job.responseJsonSchema, maxOutputTokens: OUTPUT_CAP } }) });
      const body = await response.json();
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}; batch stopped, no retries`);
      const raw = (body.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? "").join("");
      const reply = parseJudgeReply(raw, job.entries.map(e => e.id), job.c.spoken);
      const grade = gradeStimulus(job.entries, reply);
      grade.reciting = checkReciting(job.c.spoken, job.stimulus).reciting;
      const failures: string[] = [];
      const expected = job.c.expected;
      if (expected.minPercent !== undefined && grade.percent < expected.minPercent) failures.push("below-minimum-percent");
      if (expected.maxPercent !== undefined && grade.percent > expected.maxPercent) failures.push("above-maximum-percent");
      if (expected.readGiven !== undefined && grade.readGiven !== expected.readGiven) failures.push("read-given-mismatch");
      if (expected.readMatches !== undefined && grade.readMatches !== expected.readMatches) failures.push("read-matches-mismatch");
      if (expected.reciting !== undefined && grade.reciting !== expected.reciting) failures.push("reciting-mismatch");
      if (expected.listing !== undefined && grade.listing !== expected.listing) failures.push("listing-mismatch");
      for (const text of expected.mustCarryDetails) if (!reply.verdicts[job.entries.find(e => e.text === text)!.id]) failures.push(`false-deduction: ${text}`);
      for (const text of expected.mustMissDetails) if (reply.verdicts[job.entries.find(e => e.text === text)!.id]) failures.push(`missed-meaning-change: ${text}`);
      (report.results as unknown[]).push({ id: job.c.id, passed: !failures.length, failures, grade, usage: body.usageMetadata ?? null, raw });
      save();
    } catch (error) {
      report.status = "stopped-on-error-no-retry";
      (report.results as unknown[]).push({ id: job.c.id, error: error instanceof Error ? error.message : "Unknown error" });
      save(); process.exitCode = 1; console.log(`Stopped on ${job.c.id}. See report; no retries or fallback.`); return;
    }
  }
  report.status = "completed";
  save();
  const results = report.results as { passed: boolean }[];
  console.log(`${results.filter(r => r.passed).length}/${jobs.length} cases passed. Report: ${relative(root, folder)}`);
  if (results.some(r => !r.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Evaluation failed"); process.exitCode = 1; });
