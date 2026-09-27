import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The drill runner grades a student against the bank's `correctAnswer`, while
// the explanation panel renders against the LSAT Lab sidecar's `correctChoice`.
// When those two disagree the student is marked wrong for the right answer and
// then shown an explanation saying so — which is exactly what shipped: the
// original 2026-04 import carried 190 wrong answer keys that survived until a
// student reported one (PT116-S3-Q20, repaired 2026-08-20).
//
// The sidecar is authoritative. These tests pin the two together over the real
// bank so the next bad import fails here instead of in front of a student.

const DATA_DIR = join(process.cwd(), 'public', 'data');

type BankItem = {
  practiceTest?: string;
  sectionNumber?: number;
  questionNumber?: number;
  correctAnswer?: string;
  status?: string;
};

function sectionFiles(): string[] {
  return readdirSync(DATA_DIR).filter((f) => /-LR\.json$/.test(f));
}

function loadStats(): Record<string, { c?: string }> {
  return JSON.parse(readFileSync(join(DATA_DIR, 'question-stats.json'), 'utf8')).q ?? {};
}

// A position LSAC removed from scoring has no key to grade against, and the
// loader never puts it in the pool.
function bankEntries(items: BankItem[]): Array<{ qid: string; answer?: string }> {
  return items.filter((q) => q.status !== 'removed').map((q) => ({
    qid: `${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`,
    answer: q.correctAnswer,
  }));
}

describe('bank answer keys', () => {
  const stats = loadStats();

  it('agrees with the LSAT Lab sidecar on every question that has cohort data', () => {
    const mismatches: string[] = [];
    for (const file of sectionFiles()) {
      const items: BankItem[] = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      for (const { qid, answer } of bankEntries(items)) {
        const truth = stats[qid]?.c;
        if (truth && answer !== truth) mismatches.push(`${qid}: bank ${answer}, LSAT Lab ${truth}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('gives every question a well-formed answer key', () => {
    const malformed: string[] = [];
    for (const file of sectionFiles()) {
      const items: BankItem[] = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      for (const { qid, answer } of bankEntries(items)) {
        if (!answer || !/^[A-E]$/.test(answer)) malformed.push(`${qid}: ${JSON.stringify(answer)}`);
      }
    }
    expect(malformed).toEqual([]);
  });

  it('keeps the merged build artifact in step with the section files', () => {
    const merged: Array<{ filename: string; questions: BankItem[] }> = JSON.parse(
      readFileSync(join(DATA_DIR, '_bank.generated.json'), 'utf8'),
    );
    const fromMerged = new Map<string, string | undefined>();
    for (const entry of merged) {
      for (const { qid, answer } of bankEntries(entry.questions)) fromMerged.set(qid, answer);
    }

    const drifted: string[] = [];
    for (const file of sectionFiles()) {
      const items: BankItem[] = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      for (const { qid, answer } of bankEntries(items)) {
        if (fromMerged.get(qid) !== answer) {
          drifted.push(`${qid}: source ${answer}, merged ${fromMerged.get(qid)}`);
        }
      }
    }
    expect(drifted).toEqual([]);
  });
});
