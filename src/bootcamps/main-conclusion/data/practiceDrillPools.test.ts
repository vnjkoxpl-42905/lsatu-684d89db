/**
 * Verifies the Main Conclusion practice drill pools against the
 * source JSON files. Confirms qids exist, qtype/feature match,
 * and that pools are ordered easiest-to-hardest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { MAIN_CONCLUSION_PRACTICE_POOLS } from './practiceDrillPools';

type SourceQuestion = {
  questionType?: string;
  questionDifficulty?: number;
  questionFeatures?: string[];
};

function getSourceQuestion(qid: string): SourceQuestion | undefined {
  const match = qid.match(/^PT(\d+)-S(\d+)-Q(\d+)$/);
  expect(match, `invalid qid format ${qid}`).toBeTruthy();
  if (!match) return undefined;

  const [, pt, section, qnum] = match;
  const filename = path.resolve(process.cwd(), 'public', 'data', `PT${pt}-S${section}-LR.json`);
  const raw = JSON.parse(fs.readFileSync(filename, 'utf8')) as Array<Record<string, unknown>>;

  return raw.find((item) => Number(item.questionNumber) === Number(qnum)) as SourceQuestion | undefined;
}

for (const [slug, pool] of Object.entries(MAIN_CONCLUSION_PRACTICE_POOLS)) {
  describe(`practice pool: ${slug}`, () => {
    it('has the expected count of qids', () => {
      expect(pool.qids.length).toBe(pool.count);
    });

    it('every qid exists and matches qtype + feature, ordered by difficulty asc', () => {
      const feature = pool.qfeatures[0];
      let prevDiff = -Infinity;
      for (const qid of pool.qids) {
        const q = getSourceQuestion(qid);
        expect(q, `missing qid ${qid}`).toBeTruthy();
        expect(q!.questionType).toBe('Main Conclusion');
        expect(q!.questionFeatures ?? []).toContain(feature);
        expect(q!.questionDifficulty).toBeGreaterThanOrEqual(prevDiff);
        prevDiff = q!.questionDifficulty ?? -Infinity;
      }
    });

    if (slug === 'rebuttal-conclusions') {
      it('stays within level 1-3 and excludes first-sentence overlap', () => {
        for (const qid of pool.qids) {
          const q = getSourceQuestion(qid);
          expect(q, `missing qid ${qid}`).toBeTruthy();
          expect(q!.questionDifficulty).toBeGreaterThanOrEqual(1);
          expect(q!.questionDifficulty).toBeLessThanOrEqual(3);
          expect(q!.questionFeatures ?? []).not.toContain('First Sentence Conclusion');
        }
      });
    }
  });
}
