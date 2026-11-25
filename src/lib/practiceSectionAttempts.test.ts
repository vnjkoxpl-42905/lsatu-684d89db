import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PracticeSession } from '@/bootcamps/main-conclusion/persistence/records';
import { isCompletedLrMirror, listPracticeSectionAttempts } from './practiceSectionAttempts';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LEGACY_REC_ID = '22222222-2222-4222-8222-222222222222';
const SITTING_REC_ID = '33333333-3333-4333-8333-333333333333';
const SITTING_ID = '44444444-4444-4444-8444-444444444444';
const HIST_ID = '55555555-5555-4555-8555-555555555555';

const mockState = vi.hoisted(() => ({
  userId: '11111111-1111-4111-8111-111111111111',
  standaloneSittings: [] as Record<string, unknown>[],
  bootcampKv: [] as Array<{ data: unknown }>,
  sectionHistory: [] as Record<string, unknown>[],
  localRows: [] as unknown[],
  upserts: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: mockState.userId } }, error: null })),
    },
    from: (table: string) => {
      if (table === 'timed_section_sittings_v1') {
        return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      }
      if (table === 'standalone_section_sittings') {
        return { select: () => ({ eq: async () => ({ data: mockState.standaloneSittings, error: null }) }) };
      }
      if (table === 'bootcamp_kv') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: mockState.bootcampKv, error: null }),
            }),
          }),
          upsert: async (row: Record<string, unknown>) => {
            mockState.upserts.push(row);
            return { error: null };
          },
        };
      }
      if (table === 'section_history') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  order: async () => ({ data: mockState.sectionHistory, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
    },
  },
}));

vi.mock('@/lib/sectionRelease', () => ({
  readReleasedSectionRows: async () => mockState.sectionHistory,
}));

vi.mock('@/bootcamps/main-conclusion/persistence/factory', () => ({
  getPersistence: () => ({
    ready: async () => {},
    list: async () => mockState.localRows,
  }),
}));

vi.mock('@/features/rc/lib/rcBank', () => ({
  loadRcIndex: async () => ({ preptests: [] }),
}));

vi.mock('@/features/rc/api/rcProgress', () => ({
  listSessions: async () => [],
  getSessionAttempts: async () => [],
}));

const session = {
  status: 'completed', pool_slug: 'drill::section::pt101-s2',
  started_at: '2026-09-28T10:00:00.000Z', updated_at: '2026-09-28T10:35:00.000Z',
  question_queue: ['PT101-S2-Q1', 'PT101-S2-Q2'],
  attempts: [{ qid: 'PT101-S2-Q1', selected_answer: 'B' }],
} as PracticeSession;

describe('isCompletedLrMirror', () => {
  const result = {
    pt: 101, section: 2, completedAt: '2026-09-28T10:35:05.000Z',
    questions: [
      { qid: 'PT101-S2-Q1', initialAnswer: 'B' },
      { qid: 'PT101-S2-Q2', initialAnswer: '—' },
    ],
  };

  it('recognizes the matching account result and device snapshot', () => {
    expect(isCompletedLrMirror(session, result)).toBe(true);
  });

  it('keeps different sittings, changed answers, and older rows without detail', () => {
    expect(isCompletedLrMirror(session, { ...result, completedAt: '2026-09-29T10:35:05.000Z' })).toBe(false);
    expect(isCompletedLrMirror(session, { ...result, questions: [{ qid: 'PT101-S2-Q1', initialAnswer: 'C' }, result.questions[1]] })).toBe(false);
    expect(isCompletedLrMirror(session, { ...result, questions: [] })).toBe(false);
  });
});

function makePracticeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: LEGACY_REC_ID,
    user_id: USER_ID,
    pool_slug: 'drill::section::pt101-s2',
    completion_id: 'drill::section::pt101-s2',
    data_version: 2,
    question_queue: ['PT101-S2-Q1', 'PT101-S2-Q2'],
    current_index: 1,
    attempts: [],
    status: 'in_progress',
    started_at: '2026-11-20T10:00:00.000Z',
    updated_at: '2026-11-20T10:05:00.000Z',
    ...overrides,
  };
}

describe('listPracticeSectionAttempts adoption & sitting dedupe (Phase 5.1)', () => {
  beforeEach(() => {
    mockState.standaloneSittings = [];
    mockState.bootcampKv = [];
    mockState.sectionHistory = [];
    mockState.localRows = [];
    mockState.upserts = [];
  });

  it('keeps a rejected local save out of the account when the attempts list loads', async () => {
    const poolKey = 'drill::section::pt101-s2';
    const account = makePracticeSession({
      id: SITTING_REC_ID,
      pool_slug: `${poolKey}#${SITTING_ID}`,
    });
    mockState.standaloneSittings = [
      { id: SITTING_ID, pool_key: poolKey, state: 'open', generation: 1 },
    ];
    mockState.bootcampKv = [{ data: account }];
    mockState.localRows = [
      { ...account, current_index: 0, updated_at: '2026-11-20T10:10:00.000Z' },
      makePracticeSession({ updated_at: '2026-11-20T10:10:00.000Z' }),
      makePracticeSession({ id: HIST_ID, pool_slug: 'drill::section::pt102-s2#orphan' }),
    ];

    await listPracticeSectionAttempts(USER_ID);

    expect(mockState.upserts).toEqual([]);
    expect(mockState.bootcampKv).toEqual([{ data: account }]);
  });

  it('shows exactly one entry before adoption, after adoption, after completion, and with a stale local copy', async () => {
    const legacyRec = makePracticeSession({ id: LEGACY_REC_ID });
    const sittingRec = makePracticeSession({
      id: SITTING_REC_ID,
      pool_slug: `drill::section::pt101-s2#${SITTING_ID}`,
      completion_id: `drill::section::pt101-s2#${SITTING_ID}`,
      updated_at: '2026-11-20T10:06:00.000Z',
    });

    // 1. Before adoption: only legacy record exists
    mockState.bootcampKv = [{ data: legacyRec }];
    let list = await listPracticeSectionAttempts(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('in-progress');
    expect(list[0].href).toContain('pt=101&section=2');

    // 2. After adoption: sitting is open and names adopted_from_record_id = LEGACY_REC_ID
    mockState.standaloneSittings = [
      { id: SITTING_ID, pool_key: 'drill::section::pt101-s2', state: 'open', generation: 1, history_id: null, adopted_from_record_id: LEGACY_REC_ID },
    ];
    mockState.bootcampKv = [{ data: legacyRec }, { data: sittingRec }];
    list = await listPracticeSectionAttempts(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(SITTING_REC_ID);
    expect(list[0].status).toBe('in-progress');

    // 3. Stale local copy of the adopted record is skipped by the upload loop and does not duplicate
    mockState.localRows = [
      makePracticeSession({ id: LEGACY_REC_ID, updated_at: '2026-11-20T10:10:00.000Z' }),
    ];
    list = await listPracticeSectionAttempts(USER_ID);
    expect(mockState.upserts).toHaveLength(0);
    expect(list).toHaveLength(1);

    // 4. After completion: sitting is closed, history row exists -> 1 completed entry linking to report
    mockState.standaloneSittings = [
      { id: SITTING_ID, pool_key: 'drill::section::pt101-s2', state: 'closed', generation: 1, history_id: HIST_ID, adopted_from_record_id: LEGACY_REC_ID },
    ];
    mockState.sectionHistory = [
      {
        id: HIST_ID,
        pt: 101,
        section: 2,
        initial_score: 1,
        initial_total: 2,
        unanswered_count: 0,
        created_at: '2026-11-20T10:00:00.000Z',
        completed_at: '2026-11-20T10:35:00.000Z',
        questions_json: [],
      },
    ];
    list = await listPracticeSectionAttempts(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(HIST_ID);
    expect(list[0].status).toBe('completed');
    expect(list[0].href).toBe(`/review/section/${HIST_ID}`);
  });

  it('hides the SQL-copied adopted #adopted-g1 row carrying the old pool_slug once closed (F2)', async () => {
    const { practiceSessionIdFor } = await import('@/bootcamps/main-conclusion/lib/practiceSessionStore');
    const poolKey = 'drill::section::pt101-s2';
    const adoptedRecId = practiceSessionIdFor(USER_ID, `${poolKey}#adopted-g1`);
    const legacyRec = makePracticeSession({ id: LEGACY_REC_ID });
    // SQL `legacy.data || jsonb_build_object('id', p_sitting_record_id)` preserves old pool_slug!
    const sqlCopiedRec = makePracticeSession({
      id: adoptedRecId,
      pool_slug: poolKey,
      completion_id: poolKey,
      updated_at: '2026-11-20T10:06:00.000Z',
    });

    // While open: 1 in-progress entry (no duplicate with legacy)
    mockState.standaloneSittings = [
      { id: SITTING_ID, pool_key: poolKey, state: 'open', generation: 1, history_id: null, adopted_from_record_id: LEGACY_REC_ID },
    ];
    mockState.bootcampKv = [{ data: legacyRec }, { data: sqlCopiedRec }];
    let list = await listPracticeSectionAttempts(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(adoptedRecId);
    expect(list[0].status).toBe('in-progress');

    // Once closed: 0 phantom in-progress rows, only 1 completed history row
    mockState.standaloneSittings = [
      { id: SITTING_ID, pool_key: poolKey, state: 'closed', generation: 1, history_id: HIST_ID, adopted_from_record_id: LEGACY_REC_ID },
    ];
    mockState.sectionHistory = [
      {
        id: HIST_ID,
        pt: 101,
        section: 2,
        initial_score: 1,
        initial_total: 2,
        unanswered_count: 0,
        created_at: '2026-11-20T10:00:00.000Z',
        completed_at: '2026-11-20T10:35:00.000Z',
        questions_json: [],
      },
    ];
    list = await listPracticeSectionAttempts(USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(HIST_ID);
    expect(list[0].status).toBe('completed');
  });
});
