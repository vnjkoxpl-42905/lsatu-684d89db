import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSectionBlindReview } from './sectionReviewRecord';
import type { BlindReviewResult, DrillSession } from '@/types/drill';
import type { SectionQuestionStat } from '@/lib/sectionHistorySave';
import type { SectionAnalysis } from '@/lib/sectionAnalysis';

const mockState = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  liveKey: 'B',
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      mockState.rpcCalls.push({ fn, args });
      return {
        data: { status: 'saved', br_score: 2, br_total: 2, br_results: [] },
        error: null,
      };
    }),
  },
}));

vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getQuestion: (qid: string) => ({
      qid,
      pt: 130,
      section: 2,
      qnum: qid === 'q1' ? 1 : 2,
      qtype: 'Flaw',
      difficulty: 3,
      correctAnswer: mockState.liveKey, // Bank key changed after sitting!
    }),
  },
}));

describe('saveSectionBlindReview (F4)', () => {
  beforeEach(() => {
    mockState.rpcCalls = [];
    mockState.liveKey = 'B';
  });

  it('omits untouched questions from p_answers instead of sending empty brAnswer strings', async () => {
    const results: BlindReviewResult[] = [
      {
        qid: 'q1',
        preAnswer: 'A',
        preCorrect: true,
        brAnswer: '',
        brRationale: '',
        brTimeMs: 5_000,
        brTouched: false,
        brChanged: false,
        correct: true,
      },
      {
        qid: 'q2',
        preAnswer: 'D',
        preCorrect: false,
        brAnswer: 'A',
        brRationale: 'Switched to A',
        brTimeMs: 12_000,
        brTouched: true,
        brChanged: true,
        correct: false,
      },
    ];

    await saveSectionBlindReview('hist-1', results);

    expect(mockState.rpcCalls).toHaveLength(1);
    const sentAnswers = mockState.rpcCalls[0].args.p_answers as Array<Record<string, unknown>>;
    expect(sentAnswers).toHaveLength(1);
    expect(sentAnswers[0]).toMatchObject({ qid: 'q2', brAnswer: 'A' });
  });

  it('builds p_analysis from saved stats and saved credited answers rather than the live bank key', async () => {
    // Saved section had credited answer A for q1 and A for q2; bank key later changed to B!
    mockState.liveKey = 'B';
    const savedQuestions: SectionQuestionStat[] = [
      {
        qid: 'q1',
        qnum: 1,
        qtype: 'Flaw',
        difficulty: 3,
        initialAnswer: 'A',
        correctAnswer: 'A',
        initialCorrect: true,
        timeMs: 45_000,
        flagged: false,
        switchCount: 0,
      },
      {
        qid: 'q2',
        qnum: 2,
        qtype: 'Flaw',
        difficulty: 3,
        initialAnswer: 'D',
        correctAnswer: 'A',
        initialCorrect: false,
        timeMs: 45_000,
        flagged: false,
        switchCount: 0,
      },
    ];
    // Student leaves q1 untouched (empty) and picks A on q2. Live EnhancedBlindReview
    // marked q2 wrong because the live bank changed to B, while saved key is A.
    const results: BlindReviewResult[] = [
      {
        qid: 'q1',
        preAnswer: 'A',
        preCorrect: true,
        brAnswer: '',
        brRationale: '',
        brTimeMs: 2_000,
        brTouched: false,
        brChanged: false,
        correct: true,
      },
      {
        qid: 'q2',
        preAnswer: 'D',
        preCorrect: false,
        brAnswer: 'A',
        brRationale: 'A matches saved key',
        brTimeMs: 10_000,
        brTouched: true,
        brChanged: true,
        correct: false, // stale live-bank flag from EnhancedBlindReview
      },
    ];
    const staleSession = {
      mode: 'full-section',
      questionQueue: ['q1', 'q2'],
      attempts: new Map([
        ['q1', { selectedAnswer: 'A', correct: true, timeMs: 45_000, timestamp: 1 }],
        ['q2', { selectedAnswer: 'D', correct: false, timeMs: 45_000, timestamp: 2 }],
      ]),
      fullSectionConfig: { pt: 130, section: 2 },
    } as unknown as DrillSession;

    await saveSectionBlindReview('hist-1', results, {
      savedQuestions,
      session: staleSession,
    });

    const analysis = mockState.rpcCalls[0].args.p_analysis as SectionAnalysis;
    expect(analysis).toBeTruthy();
    // q1 was right first pass and left untouched (0 misses). q2 was missed first pass ('D')
    // and answered 'A' in BR, which matches the SAVED credited answer 'A' (not live bank 'B'),
    // so diagnosis treats q2 as recovered in BR ('test-taking', not content/process).
    expect(analysis.categories).toEqual([
      expect.objectContaining({ category: 'test-taking', qnums: [2] }),
    ]);
    expect(analysis.findings.find((f) => f.rule === 'R10')?.headline).toBe(
      'Most of what you missed, you can already do.',
    );
  });
});
