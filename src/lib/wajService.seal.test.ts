import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  wajRows: [] as Array<Record<string, unknown>>,
  sectionHistoryRows: [] as Array<Record<string, unknown>>,
  reviewRecords: [] as Array<Record<string, unknown>>,
  sectionHistoryError: null as Error | null,
  reviewRecordsError: null as Error | null,
  sectionHistoryCalls: 0,
}));

function makeBuilder(table: string) {
  const filters: Array<{ op: 'eq' | 'in'; col: string; val: unknown }> = [];
  const builder: any = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filters.push({ op: 'eq', col, val });
      return builder;
    },
    in: (col: string, val: unknown[]) => {
      filters.push({ op: 'in', col, val });
      return builder;
    },
    order: () => builder,
    then: (resolve: (value: unknown) => void, reject?: (err: unknown) => void) => {
      try {
        if (table === 'wrong_answer_journal') {
          let rows = [...state.wajRows];
          for (const f of filters) {
            if (f.op === 'eq') rows = rows.filter((r) => r[f.col] === f.val);
          }
          resolve({ data: rows, error: null });
          return;
        }
        if (table === 'section_history') {
          state.sectionHistoryCalls += 1;
          if (state.sectionHistoryError) {
            resolve({ data: null, error: state.sectionHistoryError });
            return;
          }
          let rows = [...state.sectionHistoryRows];
          for (const f of filters) {
            if (f.op === 'eq') rows = rows.filter((r) => r[f.col] === f.val);
            if (f.op === 'in') rows = rows.filter((r) => (f.val as unknown[]).includes(r[f.col]));
          }
          resolve({ data: rows, error: null });
          return;
        }
        if (table === 'section_review_records') {
          if (state.reviewRecordsError) {
            resolve({ data: null, error: state.reviewRecordsError });
            return;
          }
          let rows = [...state.reviewRecords];
          for (const f of filters) {
            if (f.op === 'in') rows = rows.filter((r) => (f.val as unknown[]).includes(r[f.col]));
          }
          resolve({ data: rows, error: null });
          return;
        }
        resolve({ data: [], error: null });
      } catch (err) {
        if (reject) reject(err);
      }
    },
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
  },
}));

import { getWAJEntries } from './wajService';

describe('getWAJEntries sealed assigned-section enforcement', () => {
  beforeEach(() => {
    state.wajRows = [];
    state.sectionHistoryRows = [];
    state.reviewRecords = [];
    state.sectionHistoryError = null;
    state.reviewRecordsError = null;
    state.sectionHistoryCalls = 0;
  });

  it('hides entries whose only miss comes from a sealed assigned section', async () => {
    state.wajRows = [
      {
        id: 'waj-sealed-1',
        class_id: 'class-1',
        qid: 'PT156-S4-Q26',
        pt: 156,
        section: 4,
        qnum: 26,
        qtype: 'Principle-Conform',
        level: 3,
        first_wrong_at_iso: '2026-11-23T20:57:36.000Z',
        last_status: 'wrong',
        revisit_count: 0,
        history_json: [
          {
            attempt_at_iso: '2026-11-23T20:57:36.000Z',
            result: 0,
            chosen_answer: 'UNANSWERED',
            correct_answer: 'B',
            time_ms: 0,
            confidence_1_5: null,
            sitting_id: 'sit-sealed-1',
          },
        ],
        created_at: '2026-11-23T20:57:36.000Z',
        updated_at: '2026-11-23T20:57:36.000Z',
      },
    ];
    state.sectionHistoryRows = [
      { id: 'hist-sealed-1', client_sitting_id: 'sit-sealed-1', release_requires_br: true },
    ];

    const entries = await getWAJEntries('class-1');
    expect(entries).toEqual([]);
  });

  it('preserves earlier released events while stripping a newer sealed sitting event and restoring metadata', async () => {
    state.wajRows = [
      {
        id: 'waj-mixed-1',
        class_id: 'class-1',
        qid: 'PT156-S4-Q1',
        pt: 156,
        section: 4,
        qnum: 1,
        qtype: 'Method of Reasoning',
        level: 2,
        first_wrong_at_iso: '2026-08-29T01:00:00.000Z',
        last_status: 'wrong',
        revisit_count: 1,
        history_json: [
          {
            attempt_at_iso: '2026-08-29T01:00:00.000Z',
            result: 0,
            chosen_answer: 'D',
            correct_answer: 'E',
            time_ms: 45000,
            confidence_1_5: null,
          },
          {
            attempt_at_iso: '2026-11-23T20:57:36.000Z',
            result: 0,
            chosen_answer: 'A',
            correct_answer: 'E',
            time_ms: 12000,
            confidence_1_5: null,
            sitting_id: 'sit-sealed-1',
          },
        ],
        created_at: '2026-08-29T01:00:00.000Z',
        updated_at: '2026-11-23T20:57:36.000Z',
      },
    ];
    state.sectionHistoryRows = [
      { id: 'hist-sealed-1', client_sitting_id: 'sit-sealed-1', release_requires_br: true },
    ];

    const entries = await getWAJEntries('class-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].history_json).toHaveLength(1);
    expect(entries[0].history_json[0].attempt_at_iso).toBe('2026-08-29T01:00:00.000Z');
    expect(entries[0].revisit_count).toBe(0);
    expect(entries[0].first_wrong_at_iso).toBe('2026-08-29T01:00:00.000Z');
    expect(entries[0].updated_at).toBe('2026-08-29T01:00:00.000Z');
    expect(entries[0].last_status).toBe('wrong');
  });

  it('drops an entry whose released history was right when last_status filter requires wrong and sealed miss is stripped', async () => {
    state.wajRows = [
      {
        id: 'waj-right-then-sealed-wrong',
        class_id: 'class-1',
        qid: 'PT156-S4-Q2',
        pt: 156,
        section: 4,
        qnum: 2,
        qtype: 'Weaken',
        level: 3,
        first_wrong_at_iso: '2026-11-23T20:57:36.000Z',
        last_status: 'wrong',
        revisit_count: 1,
        history_json: [
          {
            attempt_at_iso: '2026-08-29T01:00:00.000Z',
            result: 1,
            chosen_answer: 'B',
            correct_answer: 'B',
            time_ms: 30000,
            confidence_1_5: null,
          },
          {
            attempt_at_iso: '2026-11-23T20:57:36.000Z',
            result: 0,
            chosen_answer: 'A',
            correct_answer: 'B',
            time_ms: 15000,
            confidence_1_5: null,
            sitting_id: 'sit-sealed-1',
          },
        ],
        created_at: '2026-08-29T01:00:00.000Z',
        updated_at: '2026-11-23T20:57:36.000Z',
      },
    ];
    state.sectionHistoryRows = [
      { id: 'hist-sealed-1', client_sitting_id: 'sit-sealed-1', release_requires_br: true },
    ];

    expect(await getWAJEntries('class-1', { last_status: 'wrong' })).toEqual([]);
  });

  it('releases the entry once blind review completes in section_review_records', async () => {
    state.wajRows = [
      {
        id: 'waj-released-1',
        class_id: 'class-1',
        qid: 'PT156-S4-Q26',
        pt: 156,
        section: 4,
        qnum: 26,
        qtype: 'Principle-Conform',
        level: 3,
        first_wrong_at_iso: '2026-11-23T20:57:36.000Z',
        last_status: 'wrong',
        revisit_count: 0,
        history_json: [
          {
            attempt_at_iso: '2026-11-23T20:57:36.000Z',
            result: 0,
            chosen_answer: 'UNANSWERED',
            correct_answer: 'B',
            time_ms: 0,
            confidence_1_5: null,
            sitting_id: 'sit-released-1',
          },
        ],
        created_at: '2026-11-23T20:57:36.000Z',
        updated_at: '2026-11-23T20:57:36.000Z',
      },
    ];
    state.sectionHistoryRows = [
      { id: 'hist-released-1', client_sitting_id: 'sit-released-1', release_requires_br: true },
    ];
    state.reviewRecords = [
      {
        history_id: 'hist-released-1',
        predicted_score: 17,
        br_results: [],
        br_score: 0,
        br_total: 26,
        br_percent: 0,
        br_delta: 0,
        br_analysis_json: null,
        br_completed_at: '2026-11-23T20:59:10.000Z',
      },
    ];

    const entries = await getWAJEntries('class-1');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('waj-released-1');
  });

  it('fails closed on seal lookup error by hiding sitting-linked events while keeping legacy entries', async () => {
    state.wajRows = [
      {
        id: 'waj-sitting',
        class_id: 'class-1',
        qid: 'PT156-S4-Q10',
        pt: 156,
        section: 4,
        qnum: 10,
        qtype: 'Flaw',
        level: 3,
        first_wrong_at_iso: '2026-11-23T20:57:36.000Z',
        last_status: 'wrong',
        revisit_count: 0,
        history_json: [
          {
            attempt_at_iso: '2026-11-23T20:57:36.000Z',
            result: 0,
            chosen_answer: 'A',
            correct_answer: 'C',
            time_ms: 10000,
            confidence_1_5: null,
            sitting_id: 'sit-unknown',
          },
        ],
        created_at: '2026-11-23T20:57:36.000Z',
        updated_at: '2026-11-23T20:57:36.000Z',
      },
      {
        id: 'waj-legacy',
        class_id: 'class-1',
        qid: 'PT101-S1-Q1',
        pt: 101,
        section: 1,
        qnum: 1,
        qtype: 'Strengthen',
        level: 2,
        first_wrong_at_iso: '2026-08-01T12:00:00.000Z',
        last_status: 'wrong',
        revisit_count: 0,
        history_json: [
          {
            attempt_at_iso: '2026-08-01T12:00:00.000Z',
            result: 0,
            chosen_answer: 'E',
            correct_answer: 'A',
            time_ms: 25000,
            confidence_1_5: null,
          },
        ],
        created_at: '2026-08-01T12:00:00.000Z',
        updated_at: '2026-08-01T12:00:00.000Z',
      },
    ];
    state.sectionHistoryError = new Error('network outage');

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const entries = await getWAJEntries('class-1');
    errSpy.mockRestore();

    expect(entries.map((e) => e.id)).toEqual(['waj-legacy']);
  });

  it('makes zero extra section_history queries when entries carry no sitting_id', async () => {
    state.wajRows = [
      {
        id: 'waj-legacy-only',
        class_id: 'class-1',
        qid: 'PT101-S1-Q2',
        pt: 101,
        section: 1,
        qnum: 2,
        qtype: 'Weaken',
        level: 2,
        first_wrong_at_iso: '2026-08-01T12:00:00.000Z',
        last_status: 'wrong',
        revisit_count: 0,
        history_json: [
          {
            attempt_at_iso: '2026-08-01T12:00:00.000Z',
            result: 0,
            chosen_answer: 'B',
            correct_answer: 'D',
            time_ms: 20000,
            confidence_1_5: null,
          },
        ],
        created_at: '2026-08-01T12:00:00.000Z',
        updated_at: '2026-08-01T12:00:00.000Z',
      },
    ];

    const entries = await getWAJEntries('class-1');
    expect(entries).toHaveLength(1);
    expect(state.sectionHistoryCalls).toBe(0);
  });
});
