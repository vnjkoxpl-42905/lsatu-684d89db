import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  FALLBACK_FEATURE_FAMILY_ID,
  FEATURE_FAMILIES,
  familyForFeature,
} from "./questionFeatureFamilies";

/**
 * The taxonomy-drift guard.
 *
 * `questionFeatureFamilies.test.ts` checks the taxonomy against a hardcoded list of
 * 60 feature names. That catches an edit to the taxonomy, but it CANNOT catch the
 * failure that actually happened: a feature string existing in the question bank
 * that the taxonomy has never heard of, silently bucketed into "Other".
 *
 * That is how `analyticsBreakdowns.ts` ended up with `Repetitve Answers`,
 * `Necessary vs. Sufficient Flaw` and `Sampling Flaw` — labels transcribed from
 * LSAT Lab's UI that do not exist in our bank — plus ~20 real features it never
 * listed at all. Every one of those rows read as "Other" on /analytics for months
 * and nothing failed.
 *
 * This test reads the REAL bank and asserts round-trip coverage in both directions.
 * It is the reason that class of bug cannot come back.
 *
 * See: research/lsatlab-analytics-teardown-2026-08-26/README.md
 */

interface BankQuestion {
  questionType?: string;
  reasoningType?: string[];
  questionFeatures?: string[];
}
interface BankFile {
  filename: string;
  questions?: BankQuestion[];
}

const BANK_PATH = resolve(__dirname, "../../public/data/_bank.generated.json");

function loadBank(): BankFile[] {
  const raw = readFileSync(BANK_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected _bank.generated.json to be an array, got ${typeof parsed}`);
  }
  return parsed as BankFile[];
}

function collect<T>(pick: (q: BankQuestion) => T[] | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of loadBank()) {
    for (const q of file.questions ?? []) {
      for (const value of pick(q) ?? []) {
        const key = String(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

describe("question feature taxonomy covers the real bank", () => {
  it("maps every feature string in the bank to a real family, never the fallback", () => {
    const counts = collect((q) => q.questionFeatures);
    expect(counts.size).toBeGreaterThan(0);

    const unmapped = [...counts.entries()]
      .filter(([feature]) => {
        const family = familyForFeature(feature);
        return family === undefined || family === FALLBACK_FEATURE_FAMILY_ID;
      })
      .sort((a, b) => b[1] - a[1]);

    expect(
      unmapped,
      unmapped.length
        ? `\n${unmapped.length} bank feature(s) fall into "${FALLBACK_FEATURE_FAMILY_ID}". ` +
            `Add them to FEATURE_FAMILIES in questionFeatureFamilies.ts — do not rename the bank ` +
            `to match the taxonomy.\n` +
            unmapped.map(([f, n]) => `  ${n.toString().padStart(5)}x  ${JSON.stringify(f)}`).join("\n") +
            "\n"
        : "",
    ).toEqual([]);
  });

  it("declares no feature that the bank never uses", () => {
    // The reverse direction. A feature declared in the taxonomy but absent from the
    // bank is dead weight at best, and at worst a misspelling of a real one that is
    // therefore ALSO failing the test above — which is exactly the shape the
    // LSAT Lab transcription bug had.
    const inBank = new Set(collect((q) => q.questionFeatures).keys());
    const declared = FEATURE_FAMILIES.flatMap((f) => f.features);
    const orphans = declared.filter((f) => !inBank.has(f)).sort();
    expect(
      orphans,
      orphans.length
        ? `Taxonomy declares ${orphans.length} feature(s) absent from the bank — ` +
            `likely misspellings of real bank tags: ${orphans.map((o) => JSON.stringify(o)).join(", ")}`
        : "",
    ).toEqual([]);
  });

  it("maps every reasoning type in the bank to the canonical three", () => {
    const counts = collect((q) => q.reasoningType);
    const CANONICAL = new Set(["Conditional Reasoning", "Causation", "Comparative Reasoning"]);
    const unexpected = [...counts.keys()].filter((r) => !CANONICAL.has(r)).sort();
    expect(
      unexpected,
      unexpected.length
        ? `Bank contains reasoning types outside the canonical three: ${unexpected.join(", ")}. ` +
            `Analytics, drill filters, and the parse-drill-request edge function all assume exactly three.`
        : "",
    ).toEqual([]);
    expect(counts.size).toBe(3);
  });

  // NOTE: question-type normalization is deliberately NOT tested here.
  // `questionLoader.qtypes.test.ts` already owns it, and owns it correctly: it calls
  // normalizeQType(label, stem) exactly as production does at questionLoader.ts:1041.
  // An earlier draft of this file called normalizeQType(label) without the stem, saw
  // 103 "Unknown"s, and nearly reported a bug that does not exist — the stem resolves
  // 99 of them. One subject, one test.
});
