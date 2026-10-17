import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The drill shows and grades a question from the bank (public/data), but shows
// its explanation from the database, matched only by PrepTest/section/number.
// If a bank slot holds a different question, the student answers one question,
// is graded on its key, and reads another question's explanation. That shipped
// twice: a bad import (155 misfiled slots, fixed in #146) and an accidental
// Lovable rollback on 2026-09-27 that undid the fix.
//
// The fixture pins each slot to the database's question: the opening of its
// stimulus and its answer key. Regenerate it from the database only after a
// deliberate, verified change (ai-os/system/scripts/lsatlab-pull).

const DATA_DIR = join(process.cwd(), 'public', 'data');
const FIXTURE = join(process.cwd(), 'src', 'lib', '__fixtures__', 'lr-slot-fingerprints.json');
const PASSAGE = /^\s*The following passage is used for[^.]*\.\s*/i;
const norm = (s: string) => s.replace(PASSAGE, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);

// Bigram overlap, so a one-letter typo on either side ("Bums"/"Burns") still
// counts as the same question while a different question never does.
function similar(a: string, b: string): boolean {
  const grams = (s: string) => Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2));
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.length || !gb.length) return a === b;
  const pool = [...gb];
  let hits = 0;
  for (const g of ga) {
    const i = pool.indexOf(g);
    if (i >= 0) { hits++; pool.splice(i, 1); }
  }
  return (2 * hits) / (ga.length + gb.length) >= 0.8;
}

type BankItem = {
  practiceTest?: string;
  sectionNumber?: number;
  questionNumber?: number;
  stimulus?: string;
  correctAnswer?: string;
  status?: string;
};

describe('bank slots match the database question', () => {
  const pins: Record<string, [string, string | null]> = JSON.parse(readFileSync(FIXTURE, 'utf8'));

  it('holds the same question and key in every pinned slot', () => {
    const wrong: string[] = [];
    for (const file of readdirSync(DATA_DIR).filter((f) => /^PT\d+-S\d+-LR\.json$/.test(f))) {
      const items: BankItem[] = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      for (const q of items) {
        if (q.status === 'removed' || !q.stimulus) continue;
        const slot = `${q.practiceTest}-S${q.sectionNumber}-Q${q.questionNumber}`;
        const pin = pins[slot];
        if (!pin) continue;
        const [opening, key] = pin;
        if (opening && !similar(norm(q.stimulus), opening)) wrong.push(`${slot}: stimulus is a different question`);
        else if (key && q.correctAnswer !== key) wrong.push(`${slot}: key ${q.correctAnswer}, database ${key}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
