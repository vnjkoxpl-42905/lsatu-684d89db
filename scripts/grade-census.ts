/**
 * Run the judge over Joshua's own recordings and see whether it agrees.
 *
 * The 71 model runs in `corpus/loophole-online/rrc-sections/coverage-census.json`
 * were scored by hand and by agent: a correct run sits at a median of 95%
 * Coverage with a 10th percentile of 86%, and that 86 is where the top band
 * starts. This harness points the real judge at the same runs and compares.
 *
 * It is the only check that can fail in the way that matters. The unit tests
 * prove the parsing, the scoring and the banding; they cannot prove that a
 * model, given this prompt, judges the way we decided it should. If the judge
 * scores these runs at 70%, every student would be told she failed at something
 * she did correctly.
 *
 *   npx vite-node scripts/grade-census.ts -- --shaped <dir> --limit 5
 *
 * Reports token usage per call, so the cost of a full run is measured rather
 * than guessed.
 */

import { readFileSync } from "node:fs";
import {
  buildJudgeEntries,
  buildJudgePrompt,
  gradeStimulus,
  parseJudgeReply,
  toDetails,
} from "../src/features/activity-centre/recall/grading";

const MODEL = "gemini-2.5-flash";
const SECTIONS = ["pt102-s3", "pt105-s2", "pt134-s3"] as const;
const CONTENT: Record<string, string> = {
  "pt102-s3": "read-recall-colour-pt102-s3.json",
  "pt105-s2": "read-recall-colour-pt105-s2.json",
  "pt134-s3": "read-recall-colour-pt134-s3.json",
};

function arg(name: string, fallback = ""): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function geminiKey(): string {
  const env = readFileSync(`${process.env.HOME}/ai-os/.env`, "utf8");
  const line = env.split("\n").find((l) => l.startsWith("GEMINI_API_KEY="));
  const key = line?.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("GEMINI_API_KEY is empty in ~/ai-os/.env");
  return key;
}

interface Usage { prompt: number; output: number; total: number }

async function ask(prompt: string, key: string): Promise<{ text: string; usage: Usage }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const m = body.usageMetadata ?? {};
  return {
    text: body.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
    usage: {
      prompt: m.promptTokenCount ?? 0,
      output: m.candidatesTokenCount ?? 0,
      total: m.totalTokenCount ?? 0,
    },
  };
}

async function main() {
  const key = geminiKey();
  const shapedDir = arg("shaped");
  const limit = Number(arg("limit", "0")) || Infinity;

  const census: Record<string, number> = {};
  const censusFile = JSON.parse(
    readFileSync(`${process.env.HOME}/ai-os/corpus/loophole-online/rrc-sections/coverage-census.json`, "utf8"),
  );
  for (const row of censusFile.stimuli) census[row.slug] = row.coverage;

  interface ContentDetail { text: string }
interface ContentChunk { text: string; details: ContentDetail[] }
interface ContentItem { slug: string; chunks: ContentChunk[] }
interface ShapedRun { slug: string; spoken: string }

type Job = { slug: string; stimulus: string; details: string[]; spoken: string; decoys: string[] };
  const jobs: Job[] = [];

  for (const section of SECTIONS) {
    const content = JSON.parse(
      readFileSync(`src/features/activity-centre/content/${CONTENT[section]}`, "utf8"),
    );
    const shaped = JSON.parse(readFileSync(`${shapedDir}/${section}.json`, "utf8")) as ShapedRun[];
    const spokenBy: Record<string, string> = {};
    for (const run of shaped) spokenBy[run.slug] = run.spoken;

    const items = content.items as ContentItem[];
    items.forEach((item, i) => {
      const details = item.chunks.flatMap((c) => c.details.map((d) => d.text));
      // Decoys come from the NEXT stimulus in the same section, which is the
      // nearest thing in subject matter and therefore the hardest to reject.
      const other = items[(i + 1) % items.length];
      const decoys = other.chunks[0].details.slice(0, 2).map((d) => d.text);
      if (spokenBy[item.slug]) {
        jobs.push({
          slug: item.slug,
          stimulus: item.chunks.map((c) => c.text).join(" "),
          details,
          spoken: spokenBy[item.slug],
          decoys,
        });
      }
    });
  }

  const chosen = jobs.slice(0, limit === Infinity ? jobs.length : limit);
  console.log(`judging ${chosen.length} of ${jobs.length} stimuli on ${MODEL}\n`);

  let promptTokens = 0, outputTokens = 0, decoyFailures = 0;
  const deltas: number[] = [];

  for (const job of chosen) {
    const entries = buildJudgeEntries(toDetails(job.details), job.decoys);
    const prompt = buildJudgePrompt({ stimulus: job.stimulus, entries, spoken: job.spoken });
    try {
      const { text, usage } = await ask(prompt, key);
      promptTokens += usage.prompt;
      outputTokens += usage.output;
      const reply = parseJudgeReply(text, entries.map((e) => e.id));
      const grade = gradeStimulus(entries, reply);
      const expected = census[job.slug];
      const delta = expected === undefined ? NaN : grade.percent - expected;
      if (!Number.isNaN(delta)) deltas.push(delta);
      if (grade.decoysCarried.length) decoyFailures++;
      console.log(
        `${job.slug.padEnd(14)} judge ${String(grade.percent).padStart(3)}%  census ${String(expected ?? "--").padStart(3)}%  ` +
        `delta ${delta >= 0 ? "+" : ""}${Number.isNaN(delta) ? "--" : delta}  ${grade.band}` +
        `${grade.decoysCarried.length ? `  DECOY CARRIED x${grade.decoysCarried.length}` : ""}` +
        `${reply.missingIds.length ? `  unjudged x${reply.missingIds.length}` : ""}`,
      );
    } catch (e) {
      console.log(`${job.slug.padEnd(14)} ERROR ${(e as Error).message.slice(0, 160)}`);
    }
  }

  const mean = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const within5 = deltas.filter((d) => Math.abs(d) <= 5).length;
  console.log(`\n--- agreement with the census ---`);
  console.log(`stimuli compared : ${deltas.length}`);
  console.log(`mean delta       : ${mean.toFixed(1)} points (judge minus census)`);
  console.log(`within 5 points  : ${within5}/${deltas.length}`);
  console.log(`decoy failures   : ${decoyFailures}`);
  console.log(`\n--- tokens ---`);
  console.log(`prompt ${promptTokens}, output ${outputTokens}, total ${promptTokens + outputTokens}`);
  console.log(`per stimulus: ~${Math.round((promptTokens + outputTokens) / Math.max(1, chosen.length))} tokens`);
}

main().catch((e) => { console.error(e); process.exit(1); });
