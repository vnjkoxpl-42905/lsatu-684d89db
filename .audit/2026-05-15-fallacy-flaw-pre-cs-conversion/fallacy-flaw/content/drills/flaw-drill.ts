import type { DrillStage } from '../../types/drill';

/**
 * 30-question Flaw Drill across 3 difficulty stages.
 * Source corpus ships with PT cites only — answer keys, flaw labels, and
 * "what if" counters are GAP 1 from §10 of the build brief: BUILD-AGENT INVENTED.
 *
 * Each item is marked `invented: true`. Items are stubs ready for fill-in.
 */
export const flawDrill: DrillStage[] = [
  // Stage 1 — Difficulty 2
  {
    stage: 1,
    set: 1,
    timed: false,
    items: [
      { id: 'fd-1-1-1', cite: 'PT116·S2·Q9', invented: true },
      { id: 'fd-1-1-2', cite: 'PT119·S4·Q12', invented: true },
      { id: 'fd-1-1-3', cite: 'PT120·S4·Q10', invented: true },
      { id: 'fd-1-1-4', cite: 'PT120·S4·Q21', invented: true },
      { id: 'fd-1-1-5', cite: 'PT122·S2·Q13', invented: true },
    ],
  },
  {
    stage: 1,
    set: 2,
    timed: true,
    timeMin: 10,
    items: [
      { id: 'fd-1-2-1', cite: 'PT124·S2·Q11', invented: true },
      { id: 'fd-1-2-2', cite: 'PT124·S2·Q13', invented: true },
      { id: 'fd-1-2-3', cite: 'PT125·S2·Q1', invented: true },
      { id: 'fd-1-2-4', cite: 'PT125·S4·Q19', invented: true },
      { id: 'fd-1-2-5', cite: 'PT127·S3·Q4', invented: true },
    ],
  },
  // Stage 2 — Difficulty 3
  {
    stage: 2,
    set: 1,
    timed: false,
    items: [
      { id: 'fd-2-1-1', cite: 'PT124·S2·Q23', invented: true },
      { id: 'fd-2-1-2', cite: 'PT125·S2·Q22', invented: true },
      { id: 'fd-2-1-3', cite: 'PT126·S1·Q20', invented: true },
      { id: 'fd-2-1-4', cite: 'PT130·S4·Q5', invented: true },
      { id: 'fd-2-1-5', cite: 'PT130·S4·Q14', invented: true },
    ],
  },
  {
    stage: 2,
    set: 2,
    timed: true,
    timeMin: 12,
    items: [
      { id: 'fd-2-2-1', cite: 'PT133·S3·Q14', invented: true },
      { id: 'fd-2-2-2', cite: 'PT136·S2·Q21', invented: true },
      { id: 'fd-2-2-3', cite: 'PT136·S4·Q25', invented: true },
      { id: 'fd-2-2-4', cite: 'PT137·S4·Q14', invented: true },
      { id: 'fd-2-2-5', cite: 'PT138·S2·Q12', invented: true },
    ],
  },
  // Stage 3 — Difficulty 4
  {
    stage: 3,
    set: 1,
    timed: false,
    items: [
      { id: 'fd-3-1-1', cite: 'PT125·S4·Q14', invented: true },
      { id: 'fd-3-1-2', cite: 'PT128·S2·Q22', invented: true },
      { id: 'fd-3-1-3', cite: 'PT130·S3·Q22', invented: true },
      { id: 'fd-3-1-4', cite: 'PT134·S1·Q24', invented: true },
      { id: 'fd-3-1-5', cite: 'PT134·S3·Q11', invented: true },
    ],
  },
  {
    stage: 3,
    set: 2,
    timed: true,
    timeMin: 15,
    items: [
      { id: 'fd-3-2-1', cite: 'PT136·S2·Q13', invented: true },
      { id: 'fd-3-2-2', cite: 'PT137·S3·Q19', invented: true },
      { id: 'fd-3-2-3', cite: 'PT137·S4·Q21', invented: true },
      { id: 'fd-3-2-4', cite: 'PT139·S4·Q11', invented: true },
      { id: 'fd-3-2-5', cite: 'PT101·S2·Q8', invented: true },
    ],
  },
];
