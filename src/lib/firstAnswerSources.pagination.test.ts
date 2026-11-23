import { beforeEach, describe, expect, it, vi } from 'vitest';

const owner = '22222222-2222-4222-8222-222222222222';
const state = vi.hoisted(() => ({
  sectionRows: [] as Array<Record<string, unknown>>,
  sealedIds: new Set<string>(),
  ranges: [] as Array<[number, number]>,
}));

vi.mock('@/lib/studentScopedWork', () => ({ assertActiveStudentScope: vi.fn(async () => {}) }));
vi.mock('@/lib/sectionRelease', async () => {
  const actual = await vi.importActual<typeof import('./sectionRelease')>('./sectionRelease');
  return {
    ...actual,
    withoutBrSealedRows: async <T extends { id: string }>(rows: T[]) =>
      rows.filter((r) => !state.sealedIds.has(r.id)),
  };
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: owner, error: null })),
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: async (from: number, to: number) => {
          if (table === 'section_history') {
            state.ranges.push([from, to]);
            return { data: state.sectionRows.slice(from, to + 1), error: null };
          }
          return { data: [], error: null };
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
    state.sealedIds.clear();
    state.sectionRows = Array.from({ length: 501 }, (_, i) => ({
      id: `sec-${i + 1}`,
      user_id: owner,
      mode: 'full-section',
      completed_at: '2026-11-20T10:00:00Z',
      practice_test_run_id: null,
      practice_test_leg: null,
      questions_json: [
        {
          qid: `PT101-S2-Q${(i % 25) + 1}-${i}`,
          initialAnswer: 'A',
          initialCorrect: true,
        },
      ],
    }));
    // One sealed row inside the first 500-row page.
    state.sealedIds.add('sec-10');
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
