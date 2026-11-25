import { beforeEach, describe, expect, it, vi } from 'vitest';

const owner = '22222222-2222-4222-8222-222222222222';
const state = vi.hoisted(() => ({
  sectionRows: [] as Array<Record<string, unknown>>,
  outcomeIds: [] as string[],
  runs: [] as Array<Record<string, unknown>>,
  ranges: [] as Array<[number, number]>,
}));

vi.mock('@/lib/studentScopedWork', () => ({ assertActiveStudentScope: vi.fn(async () => {}) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: owner, error: null })),
    from: (table: string) => {
      let ids: string[] = [];
      const chain = {
        in: (_column: string, values: string[]) => {
          ids = values;
          if (table === 'section_history') state.outcomeIds.push(...values);
          return chain;
        },
        not: () => chain,
        contains: () => chain,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({
          data: table === 'section_history' ? state.sectionRows.filter(row => ids.includes(String(row.id)))
            : table === 'practice_test_runs' ? state.runs.filter(row => ids.includes(String(row.id))) : [],
          error: null,
        }).then(resolve),
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: async (from: number, to: number) => {
          if (table === 'section_history') {
            state.ranges.push([from, to]);
            return { data: state.sectionRows.slice(from, to + 1), error: null };
          }
          return { data: table === 'practice_test_runs' ? state.runs : [], error: null };
        },
      };
      return chain;
    },
  },
}));

import { loadFirstAnswerLedger } from './firstAnswerSources';

describe('loadFirstAnswerLedger post-pagination release filtering (F7)', () => {
  beforeEach(() => {
    state.ranges = [];
    state.outcomeIds = [];
    state.runs = [];
    state.sectionRows = Array.from({ length: 501 }, (_, i) => ({
      id: `sec-${i + 1}`,
      user_id: owner,
      mode: 'full-section',
      completed_at: '2026-11-20T10:00:00Z',
      practice_test_run_id: null,
      release_requires_br: i === 9,
      practice_test_leg: null,
      questions_json: [
        {
          qid: `PT101-S2-Q${(i % 25) + 1}-${i}`,
          initialAnswer: 'A',
          initialCorrect: true,
        },
      ],
    }));
  });

  it('keeps a complete-status leg sealed without a persisted completion timestamp', async () => {
    state.runs = [{ id: 'pending', user_id: owner, status: 'complete', completed_at: null }];
    state.sectionRows[1].practice_test_run_id = 'pending';
    const ledger = await loadFirstAnswerLedger({ mode: 'self', actorId: owner, studentId: owner });

    expect(ledger.answers.some((answer) => answer.attemptId.includes('sec-2:'))).toBe(false);
    expect(state.outcomeIds).not.toContain('sec-2');
    expect(state.outcomeIds).toContain('sec-3');
  });

  it('fetches page 2 across 501 rows even when a sealed row sits inside page 1, returning all 500 released sections', async () => {
    const ledger = await loadFirstAnswerLedger({
      mode: 'self',
      actorId: owner,
      studentId: owner,
    });

    expect(state.ranges).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(ledger.answers).toHaveLength(500);
    expect(ledger.answers.some((a) => a.attemptId.includes('sec-501'))).toBe(true);
    expect(ledger.answers.some((a) => a.attemptId.includes('sec-10:'))).toBe(false);
  });
});
