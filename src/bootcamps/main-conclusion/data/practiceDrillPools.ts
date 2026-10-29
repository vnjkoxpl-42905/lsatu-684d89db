/**
 * Main Conclusion Practice Drill Pools — source of truth.
 *
 * Prebuilt, stable question pools for the Intro to LR bootcamp's
 * Practice Drills. qids were selected by scanning the loaded LR
 * question bank for questions matching:
 *   - qtype === "Main Conclusion"
 *   - questionFeatures includes the specified feature
 * then sorted by difficulty asc, PT asc, section asc, qnum asc,
 * and taking the easiest `count` qids.
 *
 * Selection is INTENTIONALLY frozen. Do not regenerate at runtime.
 */

export interface PracticePool {
  slug: string;
  title: string;
  /**
   * Module-progress completion id written to completed_drills when this
   * practice set is finished. Keeps the learner path's final practice sets
   * tracked (see introToLrPath.ts + runner.ts) so the path cannot report
   * "core path cleared" until they are done.
   */
  completionId: string;
  qtypes: readonly string[];
  qfeatures: readonly string[];
  difficulties: readonly number[];
  count: number;
  qids: readonly string[];
  returnTo: string;
  source: 'intro-to-lr-practice-drills';
}

export const MAIN_CONCLUSION_PRACTICE_POOLS = {
  'first-sentence-conclusions': {
    slug: 'first-sentence-conclusions',
    title: 'First-Sentence Main Conclusion',
    completionId: 'MC-PRC-FS',
    qtypes: ['Main Conclusion'],
    qfeatures: ['First Sentence Conclusion'],
    difficulties: [1, 2, 3, 4, 5],
    count: 6,
    qids: [
      'PT118-S1-Q1',
      'PT118-S4-Q1',
      'PT128-S2-Q13',
      'PT131-S3-Q9',
      'PT138-S3-Q11',
      'PT139-S4-Q1',
    ],
    returnTo: '/bootcamp/intro-to-lr',
    source: 'intro-to-lr-practice-drills',
  },
  'rebuttal-conclusions': {
    slug: 'rebuttal-conclusions',
    title: 'Rebuttal Main Conclusion',
    completionId: 'MC-PRC-RB',
    qtypes: ['Main Conclusion'],
    qfeatures: ['Rebuttals'],
    difficulties: [1, 2, 3],
    count: 6,
    qids: [
      'PT101-S2-Q15',
      'PT105-S4-Q6',
      'PT107-S4-Q6',
      'PT114-S1-Q2',
      'PT131-S1-Q1',
      'PT132-S4-Q1',
    ],
    returnTo: '/bootcamp/intro-to-lr',
    source: 'intro-to-lr-practice-drills',
  },
} as const satisfies Record<string, PracticePool>;

export type PracticePoolSlug = keyof typeof MAIN_CONCLUSION_PRACTICE_POOLS;

export function getPracticePool(slug: string): PracticePool | undefined {
  return (MAIN_CONCLUSION_PRACTICE_POOLS as Record<string, PracticePool>)[slug];
}
