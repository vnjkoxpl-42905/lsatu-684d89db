import { describe, it, expect } from 'vitest';
import { BEGINNER_GRADE_PCT, countInBand, resolveLeveledDrillQids, summarizePool } from './guidedDrillLevel';
import type { LRQuestion } from '@/lib/questionLoader';
import type { QuestionStat } from '@/lib/questionStats';

/** A pool question. Only qid and difficulty matter to the resolver. */
function q(qid: string, difficulty: number | null): LRQuestion {
  return { qid, difficulty } as unknown as LRQuestion;
}

/** n questions at one difficulty, e.g. band(3, 2) -> d3-0, d3-1. */
function band(difficulty: number, n: number): LRQuestion[] {
  return Array.from({ length: n }, (_, i) => q(`d${difficulty}-${i}`, difficulty));
}

/** A 40-question pool, 8 at each difficulty. */
const POOL: LRQuestion[] = [1, 2, 3, 4, 5].flatMap((d) => band(d, 8));

/** Deterministic rng so every draw in these specs is reproducible. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const difficultyOf = (qid: string) => Number(qid.split('-')[0].slice(1));

describe('resolveLeveledDrillQids', () => {
  it('returns the full requested count at every level (the invariant)', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const r = resolveLeveledDrillQids({
        pool: POOL,
        questionCount: 6,
        level,
        rng: seeded(),
      });
      expect(r.qids, `${level} must still get 6 questions`).toHaveLength(6);
    }
  });

  it('draws a beginner only from difficulty 1-3 when the band has enough', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL,
      questionCount: 6,
      level: 'beginner',
      rng: seeded(),
    });
    expect(r.qids.map(difficultyOf).every((d) => d >= 1 && d <= 3)).toBe(true);
    expect(r.outOfBandUsed).toBe(0);
    expect(r.warning).toBeNull();
  });

  it('draws an advanced student only from difficulty 3-5', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL,
      questionCount: 6,
      level: 'advanced',
      rng: seeded(),
    });
    expect(r.qids.map(difficultyOf).every((d) => d >= 3 && d <= 5)).toBe(true);
    expect(r.warning).toBeNull();
  });

  it('gives the same drill different questions to a beginner and an advanced student', () => {
    const beginner = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'beginner', rng: seeded(7),
    });
    const advanced = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'advanced', rng: seeded(7),
    });
    const overlap = beginner.qids.filter((id) => advanced.qids.includes(id));
    // They can legitimately share difficulty-3 questions, but must not be equal.
    expect(beginner.qids).not.toEqual(advanced.qids);
    expect(overlap.length).toBeLessThan(6);
  });

  it('still fills the drill when the pool has nothing at the level, and warns', () => {
    const hardOnly = band(5, 10);
    const r = resolveLeveledDrillQids({
      pool: hardOnly,
      questionCount: 6,
      level: 'beginner',
      rng: seeded(),
    });
    expect(r.qids).toHaveLength(6);
    expect(r.inBandCount).toBe(0);
    expect(r.outOfBandUsed).toBe(6);
    expect(r.warning).toBe('out_of_level');
  });

  it('tops up from the nearest difficulty, not the farthest', () => {
    // Beginner band is 1-3, midpoint 2. Two in band, then it must reach for
    // the 4s before the 5s.
    const pool = [...band(3, 2), ...band(4, 4), ...band(5, 4)];
    const r = resolveLeveledDrillQids({
      pool,
      questionCount: 4,
      level: 'beginner',
      rng: seeded(),
    });
    expect(r.qids).toHaveLength(4);
    expect(r.inBandCount).toBe(2);
    expect(r.outOfBandUsed).toBe(2);
    expect(r.warning).toBe('partially_out_of_level');
    const toppedUp = r.qids.map(difficultyOf).filter((d) => d > 3);
    expect(toppedUp).toEqual([4, 4]);
  });

  it('reproduces the pre-level behaviour exactly when level is null', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL,
      questionCount: 6,
      level: null,
      rng: seeded(),
    });
    expect(r.qids).toHaveLength(6);
    expect(r.band).toBeNull();
    expect(r.level).toBeNull();
    expect(r.outOfBandUsed).toBe(0);
    expect(r.warning).toBeNull();
  });

  it('defaults to min(pool, 10) when no question count is given', () => {
    expect(
      resolveLeveledDrillQids({ pool: POOL, level: null, rng: seeded() }).qids,
    ).toHaveLength(10);
    expect(
      resolveLeveledDrillQids({ pool: band(2, 4), level: null, rng: seeded() }).qids,
    ).toHaveLength(4);
  });

  it('never returns more questions than the pool holds', () => {
    const r = resolveLeveledDrillQids({
      pool: band(1, 3),
      questionCount: 10,
      level: 'advanced',
      rng: seeded(),
    });
    expect(r.qids).toHaveLength(3);
  });

  it('uses a pinned drill list in full and in order, without applying the level', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL,
      questionCount: 6,
      drillQids: ['d5-0', 'd5-1', 'd5-2'],
      level: 'beginner',
      knownQids: new Set(POOL.map((x) => x.qid)),
      rng: seeded(),
    });
    expect(r.qids).toEqual(['d5-0', 'd5-1', 'd5-2']);
    expect(r.source).toBe('pinned');
    expect(r.warning).toBe('pinned_level_not_applied');
  });

  it('lets an assignment pin beat a drill pin', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL,
      drillQids: ['d1-0', 'd1-1'],
      assignmentQids: ['d2-0', 'd2-1'],
      level: null,
      knownQids: new Set(POOL.map((x) => x.qid)),
      rng: seeded(),
    });
    expect(r.qids).toEqual(['d2-0', 'd2-1']);
  });

  it('drops pinned qids the bank does not know, and duplicates', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL,
      drillQids: ['d1-0', 'GONE-1', 'd1-0', 'd1-1'],
      level: null,
      knownQids: new Set(POOL.map((x) => x.qid)),
      rng: seeded(),
    });
    expect(r.qids).toEqual(['d1-0', 'd1-1']);
  });

  it('warns on an empty pool rather than returning a broken drill', () => {
    const r = resolveLeveledDrillQids({
      pool: [],
      questionCount: 6,
      level: 'beginner',
      rng: seeded(),
    });
    expect(r.qids).toEqual([]);
    expect(r.warning).toBe('empty');
  });

  it('never counts a null-difficulty question as in band, and sorts it last', () => {
    const pool = [...band(4, 2), q('dnull-0', null)];
    const r = resolveLeveledDrillQids({
      pool,
      questionCount: 2,
      level: 'beginner',
      rng: seeded(),
    });
    expect(r.inBandCount).toBe(0);
    // Both difficulty-4s are nearer the beginner band than the null one.
    expect(r.qids).not.toContain('dnull-0');
  });

  it('is deterministic under a seeded rng', () => {
    const once = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'intermediate', rng: seeded(99),
    });
    const twice = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'intermediate', rng: seeded(99),
    });
    expect(once.qids).toEqual(twice.qids);
  });

  it('reports pool and in-band counts for the assign preview', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'beginner', rng: seeded(),
    });
    expect(r.poolCount).toBe(40);
    expect(r.inBandCount).toBe(24); // 8 each at difficulty 1, 2, 3
  });
});

describe('countInBand', () => {
  it('counts without drawing', () => {
    expect(countInBand(POOL, 'beginner')).toBe(24);
    expect(countInBand(POOL, 'intermediate')).toBe(24);
    expect(countInBand(POOL, 'advanced')).toBe(24);
    expect(countInBand(POOL, null)).toBe(40);
  });
});

describe('summarizePool', () => {
  /** A stat carrying just the fields the summary reads. */
  const stat = (correctPct: number, topTrapTag: string | null = null): QuestionStat =>
    ({ correctPct, topTrapTag } as QuestionStat);

  /** Cohort accuracy roughly as measured: easier label, more people correct. */
  const STATS = new Map<string, QuestionStat>(
    POOL.map((question) => {
      const d = difficultyOf(question.qid);
      const traps = { 1: 'No Impact', 2: 'Too Weak', 3: 'Out Of Scope', 4: 'Too Strong', 5: 'Too Strong' };
      return [question.qid, stat([0, 92, 84, 75, 66, 54][d], traps[d as 1 | 2 | 3 | 4 | 5])];
    }),
  );

  it('reports the same in-band count as countInBand', () => {
    for (const level of ['beginner', 'intermediate', 'advanced', null] as const) {
      expect(summarizePool(POOL, level, STATS).inBand).toBe(countInBand(POOL, level));
    }
  });

  it('averages only the in-band questions', () => {
    // beginner draws 1-3, so (92 + 84 + 75) / 3.
    expect(summarizePool(POOL, 'beginner', STATS).meanCorrectPct).toBeCloseTo(83.7, 1);
    // advanced draws 3-5, so (75 + 66 + 54) / 3.
    expect(summarizePool(POOL, 'advanced', STATS).meanCorrectPct).toBeCloseTo(65, 1);
  });

  it('gets harder as the level rises', () => {
    const b = summarizePool(POOL, 'beginner', STATS).meanCorrectPct!;
    const i = summarizePool(POOL, 'intermediate', STATS).meanCorrectPct!;
    const a = summarizePool(POOL, 'advanced', STATS).meanCorrectPct!;
    expect(b).toBeGreaterThan(i);
    expect(i).toBeGreaterThan(a);
  });

  it('degrades to a count when there are no stats at all', () => {
    for (const empty of [null, undefined, new Map<string, QuestionStat>()]) {
      const s = summarizePool(POOL, 'beginner', empty);
      expect(s.inBand).toBe(24);
      expect(s.measured).toBe(0);
      expect(s.meanCorrectPct).toBeNull();
      expect(s.topTraps).toEqual([]);
    }
  });

  it('counts partial coverage honestly rather than treating missing as zero', () => {
    const partial = new Map(STATS);
    for (const question of POOL.slice(0, 20)) partial.delete(question.qid);
    const s = summarizePool(POOL, 'beginner', partial);
    expect(s.measured).toBeLessThan(s.inBand);
    expect(s.measured).toBeGreaterThan(0);
    // A missing stat must not drag the average toward zero.
    expect(s.meanCorrectPct).toBeGreaterThan(50);
  });

  it('surfaces the traps the in-band questions lean on', () => {
    const s = summarizePool(POOL, 'advanced', STATS);
    // 3-5 is Out Of Scope x8 and Too Strong x16.
    expect(s.topTraps[0]).toEqual({ tag: 'Too Strong', count: 16 });
    expect(s.topTraps.map((t) => t.tag)).toContain('Out Of Scope');
  });

  it('flags the real failure mode: a 1-3 drill assigned at the advanced band', () => {
    // A drill clamped to difficulty 1-3, exactly like every "first taste" drill.
    const clamped = POOL.filter((question) => difficultyOf(question.qid) <= 3);
    const s = summarizePool(clamped, 'advanced', STATS);
    // The count looks healthy...
    expect(s.inBand).toBe(8);
    // ...but every question is the easiest the advanced band can hold.
    expect(s.meanCorrectPct).toBe(75);
    expect(s.meanCorrectPct!).toBeGreaterThanOrEqual(BEGINNER_GRADE_PCT);
  });
});

describe('percentage-aware selection (opt-in)', () => {
  const withStat = (
    correctPct: number,
    topTrapTag: string | null = null,
    trapSpread = 0.5,
  ): QuestionStat => ({ correctPct, topTrapTag, trapSpread } as QuestionStat);

  /** Cohort accuracy that agrees with the label, so nothing moves band. */
  const AGREEING = new Map<string, QuestionStat>(
    POOL.map((question) => [
      question.qid,
      withStat([0, 91.7, 84.4, 75.2, 66.4, 54][difficultyOf(question.qid)]),
    ]),
  );

  it('changes nothing when the weights are zero, stats or no stats', () => {
    const base = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'advanced', rng: seeded(7),
    });
    const withStats = resolveLeveledDrillQids({
      pool: POOL,
      questionCount: 6,
      level: 'advanced',
      rng: seeded(7),
      stats: AGREEING,
      targetTrapTags: ['Too Strong'],
    });
    expect(withStats.qids).toEqual(base.qids);
    expect(withStats.inBandCount).toBe(base.inBandCount);
  });

  it('reports cohort coverage of the drawn set without being asked to rank', () => {
    const r = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: 'advanced', rng: seeded(), stats: AGREEING,
    });
    expect(r.statsCoverage).toEqual({ measured: 6, total: 6 });
    expect(r.meanCorrectPct).not.toBeNull();
  });

  it('counts missing cohort data as unmeasured rather than as zero', () => {
    const sparse = new Map([[POOL[0].qid, withStat(80)]]);
    const r = resolveLeveledDrillQids({
      pool: POOL, questionCount: 6, level: null, rng: seeded(), stats: sparse,
    });
    expect(r.statsCoverage!.total).toBe(6);
    expect(r.statsCoverage!.measured).toBeLessThan(6);
    if (r.statsCoverage!.measured > 0) expect(r.meanCorrectPct).toBe(80);
  });

  describe('empiricalWeight moves band membership, not order', () => {
    // Labeled 2, but the cohort treats it like a 4.
    const sleeper = q('sleeper', 2);
    const pool = [sleeper, q('easy', 2), q('hard', 5)];
    const stats = new Map<string, QuestionStat>([
      ['sleeper', withStat(66.4)],
      ['easy', withStat(91.7)],
      ['hard', withStat(54)],
    ]);

    it('leaves the label in charge at weight 0', () => {
      const r = resolveLeveledDrillQids({
        pool, questionCount: 1, level: 'advanced', rng: seeded(), stats, empiricalWeight: 0,
      });
      expect(r.inBandCount).toBe(1);
      expect(r.qids).toEqual(['hard']);
    });

    it('lets the measurement pull a mislabelled question into band', () => {
      // questionCount 2, so the rank-don't-filter top-up never fires and the
      // returned set is exactly what the band judged eligible.
      const r = resolveLeveledDrillQids({
        pool, questionCount: 2, level: 'advanced', rng: seeded(), stats, empiricalWeight: 1,
      });
      expect(r.inBandCount).toBe(2);
      expect(r.qids.sort()).toEqual(['hard', 'sleeper']);
    });
  });

  describe('trapWeight orders the in-band group', () => {
    const pool = [
      q('t1', 4), q('t2', 4), q('o1', 4), q('o2', 4), q('o3', 4), q('o4', 4),
    ];
    const stats = new Map<string, QuestionStat>([
      ['t1', withStat(66, 'Too Strong', 0.9)],
      ['t2', withStat(66, 'Too Strong: must / ensure', 0.85)],
      ['o1', withStat(66, 'Out Of Scope', 0.9)],
      ['o2', withStat(66, 'Out Of Scope', 0.9)],
      ['o3', withStat(66, 'Out Of Scope', 0.9)],
      ['o4', withStat(66, 'Out Of Scope', 0.9)],
    ]);

    it('puts the questions that punish the target trap first', () => {
      const r = resolveLeveledDrillQids({
        pool,
        questionCount: 2,
        level: 'advanced',
        rng: seeded(),
        stats,
        targetTrapTags: ['Too Strong'],
        trapWeight: 1,
      });
      expect(r.qids.sort()).toEqual(['t1', 't2']);
      expect(r.trapMatches).toBe(2);
    });

    it('keeps the drill full when there are fewer matches than questions wanted', () => {
      const r = resolveLeveledDrillQids({
        pool,
        questionCount: 5,
        level: 'advanced',
        rng: seeded(),
        stats,
        targetTrapTags: ['Too Strong'],
        trapWeight: 1,
      });
      expect(r.qids).toHaveLength(5);
      expect(r.trapMatches).toBe(2);
    });

    it('still varies between attempts at a partial weight', () => {
      const draws = [1, 2, 3, 4, 5].map(
        (seed) =>
          resolveLeveledDrillQids({
            pool,
            questionCount: 3,
            level: 'advanced',
            rng: seeded(seed),
            stats,
            targetTrapTags: ['Too Strong'],
            trapWeight: 0.5,
          }).qids.join(','),
      );
      expect(new Set(draws).size).toBeGreaterThan(1);
    });

    it('ignores trap targeting when no stats were supplied', () => {
      const base = resolveLeveledDrillQids({
        pool, questionCount: 3, level: 'advanced', rng: seeded(),
      });
      const targeted = resolveLeveledDrillQids({
        pool,
        questionCount: 3,
        level: 'advanced',
        rng: seeded(),
        targetTrapTags: ['Too Strong'],
        trapWeight: 1,
      });
      expect(targeted.qids).toEqual(base.qids);
    });
  });
});
