import { describe, expect, it, vi } from 'vitest';
import { buildCloseoutPayload } from './sectionCloseout';
import { analyseSection } from './sectionAnalysis';
import { UNANSWERED, type SectionQuestionStat } from './sectionHistorySave';
import type { DrillSession } from '@/types/drill';

vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: (qid: string) => ({
      qid,
      pt: 130,
      section: 2,
      qnum: qid === 'q1' ? 1 : 2,
      qtype: qid === 'q1' ? 'Flaw' : 'Weaken',
      difficulty: qid === 'q1' ? 3 : 4,
      correctAnswer: qid === 'q1' ? 'B' : 'D',
    }),
  },
}));

/**
 * Conformance test (plan Phase 5.2):
 * One legacy close-out (`buildCloseoutPayload`) and one protected close-out
 * (matching `TimedSectionController.close`) must produce rows with the same
 * SectionQuestionStat fields and a present `analysis_json`.
 */
describe('legacy and protected close-out conformance (Phase 5.2)', () => {
  const REQUIRED_STAT_KEYS: Array<keyof SectionQuestionStat> = [
    'qid',
    'qnum',
    'qtype',
    'difficulty',
    'initialAnswer',
    'correctAnswer',
    'initialCorrect',
    'timeMs',
    'flagged',
    'switchCount',
  ];

  it('produces identical SectionQuestionStat fields and a present analysis_json across both paths', () => {
    const legacySession = {
      mode: 'full-section',
      fullSectionConfig: {
        pt: 130,
        section: 2,
        timer: { mode: '35', isPaused: false, elapsedMs: 120_000, startedAt: 0 },
      },
      questionQueue: ['q1', 'q2'],
      currentIndex: 2,
      flaggedQuestions: new Set(['q2']),
      regulationMark: { answeredQids: ['q1'] },
      attempts: new Map([
        ['q1', { selectedAnswer: 'B', correct: true, timeMs: 60_000, timestamp: 1, switchCount: 0, brMarked: false }],
        ['q2', { selectedAnswer: 'A', correct: false, timeMs: 60_000, timestamp: 2, switchCount: 1, brMarked: true }],
      ]),
    } as unknown as DrillSession;

    const legacyPayload = buildCloseoutPayload(legacySession, {
      nowIso: '2026-11-23T10:00:00Z',
    });

    // Mirrors TimedSectionController.close (src/lib/timedSectionController.ts:128-137)
    const protectedQuestions = [
      { qid: 'q1', qnum: 1, qtype: 'Flaw', difficulty: 3, correctAnswer: 'B' },
      { qid: 'q2', qnum: 2, qtype: 'Weaken', difficulty: 4, correctAnswer: 'D' },
    ];
    const protectedAnswers: Record<string, { selected: string | null; timeMs: number; flagged: boolean; switchCount: number }> = {
      q1: { selected: 'B', timeMs: 60_000, flagged: false, switchCount: 0 },
      q2: { selected: 'A', timeMs: 60_000, flagged: true, switchCount: 1 },
    };
    const regulationAnsweredQids = ['q1'];
    const protectedStats: SectionQuestionStat[] = protectedQuestions.map((q) => {
      const a = protectedAnswers[q.qid];
      return {
        qid: q.qid,
        qnum: q.qnum,
        qtype: q.qtype,
        difficulty: q.difficulty,
        initialAnswer: a.selected ?? UNANSWERED,
        correctAnswer: q.correctAnswer,
        initialCorrect: a.selected === q.correctAnswer,
        timeMs: a.timeMs,
        flagged: a.flagged,
        switchCount: a.switchCount,
        answeredInOvertime: !regulationAnsweredQids.includes(q.qid),
      };
    });
    const protectedAnalysis = analyseSection({
      questions: protectedStats,
      paceMsPerQuestion: (35 * 60_000) / protectedQuestions.length,
      blindReviewDone: false,
      kind: 'lr',
    });

    expect(legacyPayload.questions).toHaveLength(2);
    expect(protectedStats).toHaveLength(2);

    for (let i = 0; i < 2; i++) {
      const leg = legacyPayload.questions[i];
      const prot = protectedStats[i];
      for (const key of REQUIRED_STAT_KEYS) {
        expect(leg[key]).toEqual(prot[key]);
      }
      expect(leg.answeredInOvertime).toEqual(prot.answeredInOvertime);
    }

    // Both paths produce a present analysis_json with headline, categories, findings, notRun
    const legAnalysis = legacyPayload.analysis as Record<string, unknown>;
    expect(legAnalysis).toBeTruthy();
    expect(typeof legAnalysis.headline).toBe('string');
    expect(Array.isArray(legAnalysis.categories)).toBe(true);
    expect(Array.isArray(legAnalysis.findings)).toBe(true);
    expect(Array.isArray(legAnalysis.notRun)).toBe(true);

    expect(protectedAnalysis).toBeTruthy();
    expect(typeof protectedAnalysis.headline).toBe('string');
    expect(Array.isArray(protectedAnalysis.categories)).toBe(true);
    expect(Array.isArray(protectedAnalysis.findings)).toBe(true);
    expect(Array.isArray(protectedAnalysis.notRun)).toBe(true);
  });
});
