/*
 * The standard's own recordings, judged by the judge that is live.
 *
 *   npx vite-node scripts/rrc-census.ts                    # the three ADR 0018 sections
 *   npx vite-node scripts/rrc-census.ts -- --all           # every built section
 *   npx vite-node scripts/rrc-census.ts -- --section pt102-s3
 *
 * ADR 0018 set the top band at the 10th percentile of Joshua's 71 model runs
 * and validated the judge against them on gemini-2.5-flash. When the judge's
 * model changes the scale moves with it, and the shaped transcripts and the
 * key that validation used live on a machine this one is not. So the census
 * runs INSIDE `grade-rrc-section` (admin-only `{ census }` call): same prompt,
 * same read-stripping, same model, same key as a student's grade. This script
 * only sends the authored items and prints the distribution.
 *
 * Reads as the admin account. Run it from the repo root. Nothing is written
 * to the database; the rows are saved under docs/adr/ for the ADR that cites
 * them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "@/integrations/supabase/client";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(REPO, "src/features/activity-centre/content");
const CENSUS_SECTIONS = ["pt102-s3", "pt105-s2", "pt134-s3"];

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? "");
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

interface Row {
  slug: string;
  percent?: number;
  carried?: number;
  total?: number;
  band?: string;
  decoysCarried?: number;
  unjudged?: number;
  readGiven?: boolean;
  readMatches?: boolean;
  coloured?: boolean;
  listing?: boolean;
  missed?: string[];
  readAloudWordsCut?: number;
  skipped?: string;
  error?: string;
}

async function main() {
  const env = { ...readEnv(path.resolve(REPO, "../../.env")), ...readEnv(path.join(REPO, ".env")) };
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: env.LSATPREP_ADMIN_EMAIL,
    password: env.LSATPREP_ADMIN_PASSWORD,
  });
  if (authErr) throw authErr;

  const one = arg("section");
  const files = fs.readdirSync(CONTENT).filter((f) => /^read-recall-colour-pt\d+-s\d\.json$/.test(f));
  const sections = one
    ? [one]
    : process.argv.includes("--all")
      ? files.map((f) => f.replace("read-recall-colour-", "").replace(".json", ""))
      : CENSUS_SECTIONS;

  const all: Row[] = [];
  let build = "";
  let judgeName = "";
  for (const sec of sections) {
    const file = path.join(CONTENT, `read-recall-colour-${sec}.json`);
    if (!fs.existsSync(file)) {
      console.log(`${sec}: no content file`);
      continue;
    }
    const content = JSON.parse(fs.readFileSync(file, "utf8"));
    const items = (content.items as Record<string, unknown>[]).map((i) => ({
      slug: i.slug,
      chunks: i.chunks,
      the_read: i.the_read,
    }));
    process.stdout.write(`${content.source_section} (${items.length} stimuli) ... `);
    const t0 = Date.now();
    const { data, error } = await supabase.functions.invoke("grade-rrc-section", {
      body: { census: { sourceSection: content.source_section, items } },
    });
    if (error) {
      console.log(`ERROR ${error.message}`);
      continue;
    }
    const body = data as { build: string; judge: string; rows: Row[] };
    build = body.build;
    judgeName = body.judge;
    console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s`);
    for (const r of body.rows) {
      all.push(r);
      if (r.skipped) {
        console.log(`  ${r.slug.padEnd(14)} skipped: ${r.skipped}`);
        continue;
      }
      if (r.error) {
        console.log(`  ${r.slug.padEnd(14)} ERROR ${r.error.slice(0, 120)}`);
        continue;
      }
      const flags =
        (r.decoysCarried ? `  DECOY x${r.decoysCarried}` : "") +
        (r.unjudged ? `  unjudged x${r.unjudged}` : "") +
        (r.readGiven === false ? "  no-read" : r.readMatches === false ? "  read-missed" : "") +
        (r.coloured === false ? "  uncoloured" : "") +
        (r.listing ? "  listing" : "");
      console.log(
        `  ${r.slug.padEnd(14)} ${String(r.percent).padStart(3)}%  ${String(r.carried).padStart(2)}/${String(r.total).padEnd(2)}  ${(r.band ?? "").padEnd(15)}${flags}`,
      );
    }
  }

  const scored = all
    .filter((r) => typeof r.percent === "number")
    .map((r) => r.percent as number)
    .sort((a, b) => a - b);
  const mean = scored.reduce((a, b) => a + b, 0) / Math.max(1, scored.length);
  console.log(`\n--- census on ${judgeName}, build ${build} ---`);
  console.log(`stimuli scored   : ${scored.length} of ${all.length}`);
  console.log(`mean             : ${mean.toFixed(1)}`);
  console.log(`median           : ${percentile(scored, 0.5)}`);
  console.log(`10th percentile  : ${percentile(scored, 0.1)}   <- top band floor, by ADR 0018's rule`);
  console.log(`25th percentile  : ${percentile(scored, 0.25)}`);
  console.log(`minimum          : ${scored[0]}   maximum: ${scored[scored.length - 1]}`);
  console.log(`at 100           : ${scored.filter((p) => p === 100).length}`);
  console.log(`decoy failures   : ${all.filter((r) => (r.decoysCarried ?? 0) > 0).length}`);
  console.log(`read matched     : ${all.filter((r) => r.readMatches).length} of ${scored.length}`);
  console.log(`unjudged         : ${all.filter((r) => (r.unjudged ?? 0) > 0).length}`);
  const out = path.join(REPO, "docs", "adr", `census-${new Date().toISOString().slice(0, 10)}-${judgeName}.json`);
  fs.writeFileSync(out, JSON.stringify({ build, judge: judgeName, sections, rows: all }, null, 2));
  console.log(`\nrows saved to ${path.relative(REPO, out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
