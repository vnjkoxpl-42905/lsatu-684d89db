import { describe, it, expect, vi, beforeEach } from 'vitest';

const order = vi.fn();
const eq = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ eq }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select }) },
}));

import {
  fetchSectionHistory,
  hasDetail,
  sectionLabel,
  summarizeSections,
  type SectionHistoryRow,
} from './sectionHistory';

/** A raw row as PostgREST returns it. */
const raw = (over: Record<string, unknown> = {}) => ({
  id: 'row-1',
  pt: 105,
  section: 2,
  mode: 'full-section',
  initial_score: 20,
  initial_total: 25,
  initial_percent: 80,
  br_score: null,
  br_percent: null,
  br_delta: null,
  br_used: false,
  total_time_ms: 60000,
  avg_time_ms: 2400,
  unanswered_count: 0,
  by_qtype_json: { Flaw: { correct: 2, total: 3 } },
  by_difficulty_json: { 3: { correct: 2, total: 3 } },
  questions_json: [],
  completed_at: '2026-08-29T07:00:00Z',
  created_at: '2026-08-29T07:00:00Z',
  ...over,
});

/** A mapped row, for the pure helpers. */
const row = (over: Partial<SectionHistoryRow> = {}): SectionHistoryRow =>
  ({
    id: 'r',
    pt: 105,
    section: 2,
    mode: 'full-section',
    initialScore: 20,
    initialTotal: 25,
    initialPercent: 80,
    brScore: null,
    brPercent: null,
    brDelta: null,
    brUsed: false,
    totalTimeMs: 60000,
    avgTimeMs: 2400,
    unansweredCount: 0,
    byQtype: {},
    byDifficulty: {},
    questions: [],
    completedAt: '2026-08-29T07:00:00Z',
    ...over,
  }) as SectionHistoryRow;

beforeEach(() => {
  vi.clearAllMocks();
  order.mockResolvedValue({ data: [raw()], error: null });
});

describe('fetchSectionHistory', () => {
  it('reads the student’s own sections, newest first', async () => {
    await fetchSectionHistory('user-1');

    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(order).toHaveBeenCalledWith('completed_at', { ascending: false });
  });

  it('carries the totals and the per-question record through', async () => {
    order.mockResolvedValue({
      data: [
        raw({
          questions_json: [
            { qid: 'q1', qnum: 1, initialAnswer: 'B', correctAnswer: 'B', initialCorrect: true },
          ],
        }),
      ],
      error: null,
    });

    const [r] = await fetchSectionHistory('u');

    expect(r).toMatchObject({
      pt: 105,
      section: 2,
      initialScore: 20,
      initialTotal: 25,
      initialPercent: 80,
      unansweredCount: 0,
    });
    expect(r.questions).toHaveLength(1);
    expect(hasDetail(r)).toBe(true);
  });

  it('treats a row with no blind review as having none', async () => {
    const [r] = await fetchSectionHistory('u');

    expect(r.brUsed).toBe(false);
    expect(r.brScore).toBeNull();
    expect(r.brPercent).toBeNull();
    expect(r.brDelta).toBeNull();
  });

  it('ignores a phantom BR score left on a row from before the fix', async () => {
    // Rows written before the empty-array fix carry br_score/br_delta for a
    // review that was never sat. `br_used` is the authority.
    order.mockResolvedValue({
      data: [raw({ br_used: false, br_score: 0, br_percent: 0, br_delta: -20 })],
      error: null,
    });

    const [r] = await fetchSectionHistory('u');

    expect(r.brScore).toBeNull();
    expect(r.brDelta).toBeNull();
  });

  it('keeps a real blind review', async () => {
    order.mockResolvedValue({
      data: [raw({ br_used: true, br_score: 23, br_percent: 92, br_delta: 3 })],
      error: null,
    });

    const [r] = await fetchSectionHistory('u');

    expect(r).toMatchObject({ brUsed: true, brScore: 23, brPercent: 92, brDelta: 3 });
  });

  it('reports a legacy row as having no detail rather than an empty section', async () => {
    const [r] = await fetchSectionHistory('u');

    expect(r.questions).toEqual([]);
    expect(hasDetail(r)).toBe(false);
  });

  it('throws so the page can say it failed instead of showing zero sections', async () => {
    order.mockResolvedValue({ data: null, error: { message: 'nope' } });

    await expect(fetchSectionHistory('u')).rejects.toBeTruthy();
  });
});

describe('sectionLabel', () => {
  it('reads as PT<n>.S<n>', () => {
    expect(sectionLabel(row({ pt: 105, section: 2 }))).toBe('PT105.S2');
  });
});

describe('summarizeSections', () => {
  it('reports nothing rather than zero when no section has been sat', () => {
    expect(summarizeSections([])).toEqual({
      sections: 0,
      bestPercent: null,
      bestLabel: null,
      averagePercent: null,
      totalTimeMs: 0,
    });
  });

  it('averages percent, not raw score, across sections of different lengths', () => {
    // 12/24 = 50% and 20/25 = 80%. Mean of the percents is 65. A mean of the
    // raw scores would be 16, which is not a score anything was out of.
    const s = summarizeSections([
      row({ initialScore: 12, initialTotal: 24, initialPercent: 50 }),
      row({ initialScore: 20, initialTotal: 25, initialPercent: 80 }),
    ]);

    expect(s.averagePercent).toBe(65);
    expect(s.sections).toBe(2);
  });

  it('names the best section, not just its number', () => {
    const s = summarizeSections([
      row({ pt: 103, section: 1, initialPercent: 50 }),
      row({ pt: 105, section: 2, initialPercent: 80 }),
    ]);

    expect(s.bestPercent).toBe(80);
    expect(s.bestLabel).toBe('PT105.S2');
  });

  it('totals the time spent', () => {
    const s = summarizeSections([row({ totalTimeMs: 1000 }), row({ totalTimeMs: 2500 })]);

    expect(s.totalTimeMs).toBe(3500);
  });
});
