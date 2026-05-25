/**
 * Verifies the Main Conclusion practice drill pools against the
 * loaded question bank. Confirms qids exist, qtype/feature match,
 * and that pools are ordered easiest-to-hardest.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { questionBank } from '@/lib/questionLoader';
import { MAIN_CONCLUSION_PRACTICE_POOLS } from './practiceDrillPools';

beforeAll(async () => {
  await questionBank.load();
});

for (const [slug, pool] of Object.entries(MAIN_CONCLUSION_PRACTICE_POOLS)) {
  describe(`practice pool: ${slug}`, () => {
    it('has the expected count of qids', () => {
      expect(pool.qids.length).toBe(pool.count);
    });

    it('every qid exists and matches qtype + feature, ordered by difficulty asc', () => {
      const feature = pool.qfeatures[0];
      let prevDiff = -Infinity;
      for (const qid of pool.qids) {
        const q = questionBank.getQuestion(qid);
        expect(q, `missing qid ${qid}`).toBeTruthy();
        expect(q!.qtype).toBe('Main Conclusion');
        expect(q!.questionFeatures ?? []).toContain(feature);
        expect(q!.difficulty).toBeGreaterThanOrEqual(prevDiff);
        prevDiff = q!.difficulty;
      }
    });
  });
}
