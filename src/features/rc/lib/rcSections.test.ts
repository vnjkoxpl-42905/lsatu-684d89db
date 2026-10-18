import { describe, expect, it, vi } from 'vitest';
import {
  buildRcSectionFreshness,
  buildRcSections,
  fetchRcSectionFreshness,
  formatRcSectionClock,
  RC_FULL_SECTION_MIN_QUESTIONS,
  rcProtectedPaceForTiming,
  rcSectionHref,
  rcSectionPreptests,
  rcSectionsForPreptest,
  rcSectionTotalSeconds,
  type RcIndexPassageWithPt,
} from './rcSections';
import type { RcDrillSession, RcQuestionHistory } from './rcTypes';
import * as rcProgress from '../api/rcProgress';
import * as rcExposure from '../api/rcExposure';

function passage(
  preptest: number,
  section: number,
  setNumber: number,
  questionCount: number,
): RcIndexPassageWithPt {
  const passageId = preptest * 100 + section * 10 + setNumber;
  return {
    preptest,
    section,
    setNumber,
    passageId,
    title: `PT${preptest} S${section} P${setNumber}`,
    topic: 'Science',
    format: 'Standard (Non-Comparative)',
    frameworks: [],
    difficulty: 3,
    questionCount,
    explainedCount: questionCount,
    questionIds: Array.from({ length: questionCount }, (_, idx) => passageId * 10 + idx + 1),
    firstWords: '',
  } as RcIndexPassageWithPt;
}

function fullSection(preptest: number, section: number, per = 7) {
  return [1, 2, 3, 4].map((n) => passage(preptest, section, n, per));
}

describe('buildRcSections', () => {
  it('groups four passages into one section in published order', () => {
    // Deliberately shuffled: the index is not guaranteed to arrive sorted, and a
    // section sat out of order is not the section.
    const shuffled = [
      passage(101, 1, 3, 7),
      passage(101, 1, 1, 7),
      passage(101, 1, 4, 6),
      passage(101, 1, 2, 7),
    ];

    const [s] = buildRcSections(shuffled);

    expect(s.passageIds).toEqual([10111, 10112, 10113, 10114]);
    expect(s.passageCount).toBe(4);
    expect(s.questionCount).toBe(27);
  });

  it('excludes a section whose passage has nothing drillable', () => {
    // Reading three passages and answering questions on two is not a section.
    const holed = [
      passage(159, 4, 1, 0),
      passage(159, 4, 2, 0),
      passage(159, 4, 3, 0),
      passage(159, 4, 4, 2),
    ];

    expect(buildRcSections(holed)).toEqual([]);
  });

  it('excludes a group that is not four passages', () => {
    expect(buildRcSections([passage(101, 1, 1, 7), passage(101, 1, 2, 7)])).toEqual([]);
  });

  it('marks a short section as short rather than hiding or padding it', () => {
    const short = buildRcSections(fullSection(110, 2, 4))[0];
    const real = buildRcSections(fullSection(111, 2, 7))[0];

    expect(short.questionCount).toBe(16);
    expect(short.fullLength).toBe(false);
    expect(real.questionCount).toBe(28);
    expect(real.fullLength).toBe(true);
  });

  it('treats the documented threshold as the boundary', () => {
    const at = buildRcSections([
      passage(120, 1, 1, RC_FULL_SECTION_MIN_QUESTIONS - 3),
      passage(120, 1, 2, 1),
      passage(120, 1, 3, 1),
      passage(120, 1, 4, 1),
    ])[0];
    expect(at.questionCount).toBe(RC_FULL_SECTION_MIN_QUESTIONS);
    expect(at.fullLength).toBe(true);
  });

  it('sorts by PrepTest then section, and handles a PrepTest with two RC sections', () => {
    const sections = buildRcSections([
      ...fullSection(104, 3),
      ...fullSection(101, 1),
      ...fullSection(101, 4),
    ]);

    expect(sections.map((s) => [s.preptest, s.section])).toEqual([
      [101, 1],
      [101, 4],
      [104, 3],
    ]);
    expect(rcSectionPreptests(sections)).toEqual([101, 104]);
    expect(rcSectionsForPreptest(sections, 101)).toHaveLength(2);
  });
});

describe('section timing', () => {
  const section = buildRcSections(fullSection(101, 1))[0];

  it('runs a standard section at exactly 35:00', () => {
    // 525s per passage x 4 = 2100s. The existing per-passage budget already
    // expresses a real section clock, which is why none of this needed a
    // change to the session model.
    expect(rcSectionTotalSeconds(section, 'standard')).toBe(2100);
    expect(formatRcSectionClock(section, 'standard')).toBe('35:00');
  });

  it('supports the accommodations multiples', () => {
    expect(formatRcSectionClock(section, 'time-and-a-half')).toBe('52:32');
    expect(formatRcSectionClock(section, 'double-time')).toBe('70:00');
  });

  it('reports no clock when untimed', () => {
    expect(rcSectionTotalSeconds(section, 'untimed')).toBeNull();
    expect(formatRcSectionClock(section, 'untimed')).toBeNull();
  });

  it('maps timing selections to protected paces only when exact', () => {
    expect(rcProtectedPaceForTiming({ mode: 'timed', percent: 100 })).toBe('standard');
    expect(rcProtectedPaceForTiming({ mode: 'timed', percent: 150 })).toBe('time-and-a-half');
    expect(rcProtectedPaceForTiming({ mode: 'timed', percent: 200 })).toBe('double-time');
    expect(rcProtectedPaceForTiming({ mode: 'unlimited' })).toBe('untimed');
    expect(rcProtectedPaceForTiming({ mode: 'timed', percent: 125 })).toBeNull();
    expect(rcProtectedPaceForTiming({ mode: 'timed', percent: 94 })).toBeNull();
  });
});

describe('rcSectionHref', () => {
  const section = buildRcSections(fullSection(101, 1))[0];

  it('starts the section in order, under test conditions', () => {
    expect(rcSectionHref(section)).toBe(
      '/rc?passages=10111%2C10112%2C10113%2C10114&reveal=end_of_set&timing=standard&start=1&timedSection=manual-canonical',
    );
  });

  it('omits secondsPerPassage at standard pace so the link stays backward compatible', () => {
    expect(rcSectionHref(section, 'standard')).not.toContain('secondsPerPassage');
  });

  it('carries secondsPerPassage only for the accommodations paces', () => {
    expect(rcSectionHref(section, 'time-and-a-half')).toContain('secondsPerPassage=788');
    expect(rcSectionHref(section, 'double-time')).toContain('secondsPerPassage=1050');
  });

  it('asks for no clock when untimed', () => {
    const href = rcSectionHref(section, 'untimed');
    expect(href).toContain('timing=untimed');
    expect(href).not.toContain('secondsPerPassage');
  });
});

describe('buildRcSectionFreshness and fetchRcSectionFreshness', () => {
  const passages = [
    ...fullSection(101, 1),
    ...fullSection(102, 1),
    ...fullSection(103, 1),
    ...fullSection(104, 1),
  ];
  const sections = buildRcSections(passages);

  it('classifies a fresh section, a partial section, an excluded session, and a timed-sitting session', async () => {
    // PT 101 S1: untouched -> isFresh: true
    // PT 102 S1: one question attempted on passage 10211 -> partial, isFresh: false
    // PT 103 S1: session excludedFromAnalytics = true (and excluded from getQuestionHistory) -> isFresh: true
    // PT 104 S1: timed-sitting session present even with zero question attempts -> isFresh: false
    const partialQuestionId = passages.find((p) => p.passageId === 10211)!.questionIds[0];
    const history: RcQuestionHistory = new Map([
      [
        partialQuestionId,
        {
          questionId: partialQuestionId,
          attempts: 1,
          answered: true,
          firstEverCorrect: true,
          firstTakeCorrect: true,
          unansweredOnFirstTake: false,
          everCorrect: true,
          everIncorrect: false,
          incorrectOnLastTake: false,
          lastFirstTakeIncorrect: false,
          incorrectCount: 0,
          reviewCorrected: false,
          completedAnswered: false,
          completedAnsweredSessionIds: [],
          lastSeenAt: '2026-10-16T12:00:00Z',
        },
      ],
    ]);

    const sessions: RcDrillSession[] = [
      {
        id: 'excluded-sitting',
        userId: 'user-1',
        config: {
          source: 'manual',
          reveal: 'end_of_set',
          timing: { mode: 'per_passage_budget', secondsPerPassage: 525 },
          timedSectionSittingId: 'sitting-excluded',
        },
        passageIds: [10311, 10312, 10313, 10314],
        status: 'in_progress',
        excludedFromAnalytics: true,
        startedAt: '2026-10-16T10:00:00Z',
        completedAt: null,
      },
      {
        id: 'active-sitting',
        userId: 'user-1',
        config: {
          source: 'manual',
          reveal: 'end_of_set',
          timing: { mode: 'per_passage_budget', secondsPerPassage: 525 },
          timedSectionSittingId: 'sitting-active',
        },
        passageIds: [10411, 10412, 10413, 10414],
        status: 'in_progress',
        excludedFromAnalytics: false,
        startedAt: '2026-10-16T11:00:00Z',
        completedAt: null,
      },
    ];

    const map = buildRcSectionFreshness(sections, passages, history, sessions);
    expect(map.get('101-1')).toMatchObject({
      pt: 101,
      section: 1,
      total: 28,
      unseen: 28,
      isFresh: true,
    });
    expect(map.get('102-1')).toMatchObject({
      pt: 102,
      section: 1,
      total: 28,
      unseen: 27,
      isFresh: false,
    });
    expect(map.get('103-1')).toMatchObject({
      pt: 103,
      section: 1,
      total: 28,
      unseen: 28,
      isFresh: true,
    });
    expect(map.get('104-1')).toMatchObject({
      pt: 104,
      section: 1,
      total: 28,
      unseen: 0,
      isFresh: false,
    });

    const historySpy = vi.spyOn(rcProgress, 'getQuestionHistory').mockResolvedValueOnce(history);
    const sessionsSpy = vi.spyOn(rcProgress, 'listSessions').mockResolvedValueOnce(sessions);
    const exposureSpy = vi.spyOn(rcExposure, 'getRcExposureHistory').mockResolvedValueOnce(new Set());
    const fetched = await fetchRcSectionFreshness(sections, passages);
    expect(fetched.get('101-1')?.isFresh).toBe(true);
    expect(fetched.get('102-1')?.isFresh).toBe(false);
    expect(fetched.get('103-1')?.isFresh).toBe(true);
    expect(fetched.get('104-1')?.isFresh).toBe(false);
    historySpy.mockRestore();
    sessionsSpy.mockRestore();
    exposureSpy.mockRestore();
  });

  it('rejects instead of reporting every section fresh when the sitting lookup fails', async () => {
    const exposureSpy = vi.spyOn(rcExposure, 'getRcExposureHistory').mockResolvedValueOnce(new Set());
    const historySpy = vi.spyOn(rcProgress, 'getQuestionHistory').mockResolvedValueOnce(new Map());
    const sessionsSpy = vi.spyOn(rcProgress, 'listSessions').mockRejectedValueOnce(new Error('sessions unavailable'));
    await expect(fetchRcSectionFreshness([], [])).rejects.toThrow('sessions unavailable');
    historySpy.mockRestore();
    sessionsSpy.mockRestore();
    exposureSpy.mockRestore();
  });

  it('a recorded preview disqualifies a section even without an answer', () => {
    const passages = fullSection(101, 1);
    const sections = buildRcSections(passages);
    const result = buildRcSectionFreshness(sections, passages, new Map(), [], new Set([passages[0].passageId]));
    expect(result.get('101-1')).toMatchObject({ isFresh: false, unseen: 21 });
  });

  it('does not certify freshness when the exposure ledger is unavailable', async () => {
    const historySpy = vi.spyOn(rcProgress, 'getQuestionHistory').mockResolvedValueOnce(new Map());
    const sessionsSpy = vi.spyOn(rcProgress, 'listSessions').mockResolvedValueOnce([]);
    const exposureSpy = vi.spyOn(rcExposure, 'getRcExposureHistory').mockRejectedValueOnce(new Error('exposure unavailable'));
    await expect(fetchRcSectionFreshness([], [])).rejects.toThrow('exposure unavailable');
    historySpy.mockRestore(); sessionsSpy.mockRestore(); exposureSpy.mockRestore();
  });
});

