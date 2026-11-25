import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOwnedSectionReport, fetchSectionHistory } from './sectionHistory';

const mockState = vi.hoisted(() => ({
  selectCalls: [] as Array<{ table: string; columns: string }>,
  step1Row: null as Record<string, unknown> | null,
  step2Row: null as Record<string, unknown> | null,
  reviewRecords: [] as Array<Record<string, unknown>>,
  reviewError: null as Error | null,
  practiceTestRun: null as Record<string, unknown> | null,
  practiceTestRunError: null as Error | null,
  qidsError: null as Error | null,
  assignmentRow: null as Record<string, unknown> | null,
}));

const OUTCOME_COLUMNS = [
  'initial_score',
  'initial_total',
  'initial_percent',
  'questions_json',
  'analysis_json',
  'br_score',
  'br_percent',
  'br_delta',
  'br_used',
  'by_qtype_json',
  'by_difficulty_json',
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async () => ({ data: ['q1'], error: mockState.qidsError }),
    from: (table: string) => ({
      select: (columns: string) => {
        mockState.selectCalls.push({ table, columns });
        const filters: Record<string, unknown> = {};
        const chain: Record<string, any> = {
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return chain;
          },
          order: () => chain,
          range: () => chain,
          contains: () => chain,
          not: () => chain,
          in: () => chain,
          maybeSingle: async () => {
            if (table === 'section_history') {
              if (columns === '*') {
                return { data: mockState.step2Row, error: null };
              }
              return { data: mockState.step1Row, error: null };
            }
            if (table === 'practice_test_runs') {
              return { data: mockState.practiceTestRun, error: mockState.practiceTestRunError };
            }
            if (table === 'homework_assignments') {
              return { data: mockState.assignmentRow, error: null };
            }
            return { data: null, error: null };
          },
          then: (resolve: (v: unknown) => void) => {
            if (table === 'section_history') {
              resolve({ data: [columns === '*' ? mockState.step2Row : mockState.step1Row], error: null });
              return;
            }
            if (table === 'section_review_records') {
              if (mockState.reviewError) {
                resolve({ data: null, error: mockState.reviewError });
              } else {
                resolve({ data: mockState.reviewRecords, error: null });
              }
              return;
            }
            resolve({ data: [], error: null });
          },
        };
        return chain;
      },
    }),
  },
}));

describe('fetchOwnedSectionReport two-step sealed projection (F1)', () => {
  beforeEach(() => {
    mockState.selectCalls = [];
    mockState.step1Row = {
      id: 'hist-1',
      user_id: 'user-1',
      mode: 'full-section',
      completed_at: '2026-11-23T10:00:00Z',
      pt: 130,
      section: 2,
      practice_test_run_id: null,
      assignment_id: 'asg-1',
      release_requires_br: true,
      client_sitting_id: 'sit-1',
    };
    mockState.step2Row = {
      ...mockState.step1Row,
      initial_score: 21,
      initial_total: 25,
      initial_percent: 84,
      questions_json: [
        { qid: 'q1', qnum: 1, qtype: 'Flaw', difficulty: 3, initialAnswer: 'B', correctAnswer: 'C', initialCorrect: false, timeMs: 60_000, flagged: false, switchCount: 0 },
      ],
      analysis_json: { headline: 'Secret diagnosis', categories: [], findings: [], notRun: [] },
    };
    mockState.reviewRecords = [];
    mockState.reviewError = null;
    mockState.practiceTestRun = null;
    mockState.practiceTestRunError = null;
    mockState.qidsError = null;
    mockState.assignmentRow = { question_qids: ['q1', 'q2'] };
  });

  it('fetches only release metadata when an assigned result is sealed in history', async () => {
    expect(await fetchSectionHistory('user-1')).toEqual([]);
    expect(mockState.selectCalls.filter(({ table }) => table === 'section_history')).toEqual([
      { table: 'section_history', columns: 'id,practice_test_run_id,release_requires_br' },
    ]);
    expect(mockState.selectCalls.filter(({ table }) => table === 'section_review_records')).toEqual([
      { table: 'section_review_records', columns: 'history_id' },
    ]);
  });

  it('never fetches "*" or outcome columns on section_history when an assigned section is sealed', async () => {
    const res = await fetchOwnedSectionReport('user-1', 'hist-1');

    expect(res.state).toBe('sealed');
    const historySelects = mockState.selectCalls.filter((c) => c.table === 'section_history');
    expect(historySelects).toHaveLength(1);
    expect(historySelects[0].columns).not.toBe('*');
    for (const col of OUTCOME_COLUMNS) {
      expect(historySelects[0].columns).not.toContain(col);
    }
    expect(JSON.stringify(res)).not.toContain('Secret diagnosis');
    expect(JSON.stringify(res)).not.toContain('initialScore');
    if (res.state === 'sealed') {
      expect(res.questionQids).toEqual(['q1']);
    }
  });

  it('prepares blind review from the ordered frozen qids instead of a changed assignment', async () => {
    mockState.assignmentRow = { question_qids: ['replacement'] };
    const res = await fetchOwnedSectionReport('user-1', 'hist-1');
    expect(res).toMatchObject({ state: 'sealed', questionQids: ['q1'] });
    expect(mockState.selectCalls.some(({ table }) => table === 'homework_assignments')).toBe(false);
  });

  it('keeps outcomes sealed and allows preparation to be retried on a QID read failure', async () => {
    mockState.qidsError = new Error('offline');
    expect(await fetchOwnedSectionReport('user-1', 'hist-1')).toMatchObject({
      state: 'sealed', questionQids: [], blindReviewPreparationFailed: true,
    });
    mockState.qidsError = null;
    expect(await fetchOwnedSectionReport('user-1', 'hist-1')).toMatchObject({
      state: 'sealed', questionQids: ['q1'], blindReviewPreparationFailed: false,
    });
  });

  it('never fetches "*" or outcome columns when the review-record lookup fails', async () => {
    mockState.reviewError = new Error('network error');
    const res = await fetchOwnedSectionReport('user-1', 'hist-1');

    expect(res.state).toBe('sealed');
    const historySelects = mockState.selectCalls.filter((c) => c.table === 'section_history');
    expect(historySelects).toHaveLength(1);
    expect(historySelects[0].columns).not.toBe('*');
    for (const col of OUTCOME_COLUMNS) {
      expect(historySelects[0].columns).not.toContain(col);
    }
  });

  it('diagnoses a released review from the frozen key when no diagnosis was stored', async () => {
    mockState.reviewRecords = [{
      history_id: 'hist-1',
      br_results: [{ qid: 'q1', preAnswer: 'B', brAnswer: 'C', brTimeMs: 30_000, brChanged: true, correct: false }],
      br_score: 1,
      br_total: 1,
      br_percent: 100,
      br_delta: 1,
      br_analysis_json: null,
      br_completed_at: '2026-11-23T11:00:00Z',
    }];

    expect(await fetchOwnedSectionReport('user-1', 'hist-1')).toMatchObject({
      state: 'released',
      row: {
        analysisSource: 'blind-review',
        brScore: 1,
        analysis: { totals: { recoveredInBlindReview: 1 } },
      },
    });
  });

  it('fetches full outcome columns in step 2 only after release is confirmed', async () => {
    mockState.reviewRecords = [
      {
        history_id: 'hist-1',
        predicted_score: 20,
        br_results: [{ qid: 'q1', preAnswer: 'B', brAnswer: 'C', brTimeMs: 30_000, brChanged: true, correct: true }],
        br_score: 25,
        br_total: 25,
        br_percent: 100,
        br_delta: 4,
        br_analysis_json: { headline: 'Released BR diagnosis', categories: [], findings: [], notRun: [] },
        br_completed_at: '2026-11-23T11:00:00Z',
      },
    ];

    const res = await fetchOwnedSectionReport('user-1', 'hist-1');

    expect(res.state).toBe('released');
    const historySelects = mockState.selectCalls.filter((c) => c.table === 'section_history');
    expect(historySelects).toHaveLength(2);
    expect(historySelects[0].columns).not.toBe('*');
    expect(historySelects[1].columns).toBe('*');
    if (res.state === 'released') {
      expect(res.row.initialScore).toBe(21);
      expect(res.row.analysisSource).toBe('blind-review');
    }
  });
});
