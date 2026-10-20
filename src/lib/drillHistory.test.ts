import { ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ owner: 'owner', tables: {} as Record<string, { data: unknown[]; error: { message: string } | null }>, calls: [] as { table: string; filters: [string, unknown][] }[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: mock.owner } }, error: null })) },
  from: (table: string) => {
    const call = { table, filters: [] as [string, unknown][] }; mock.calls.push(call);
    const query = { select: () => query, eq: (k: string, v: unknown) => { call.filters.push([k, v]); return query; },
      neq: (k: string, v: unknown) => { call.filters.push([`not:${k}`, v]); return query; },
      or: () => query, in: (k: string, v: unknown) => { call.filters.push([k, v]); return query; }, order: () => query,
      range: async () => mock.tables[table] ?? { data: [], error: null } };
    return query;
  },
} }));
import { fetchDrillHistory, filterCompletedHistorySections, readableHistoryRow, rollupByQuestion, attemptNumbers } from './drillHistory';
const session = (id: string, parent: string | null = null) => ({ id, user_id: 'owner', status: 'completed', completed_at: '2026-09-30', practice_test_run_id: parent, config: {} });
const attempt = (id: string, correct: boolean) => ({ user_id: 'owner', session_id: id, question_id: 7, passage_id: 2, is_correct: correct, time_ms: 1000, selected: 'B', is_first_attempt: true, created_at: '2026-09-30' });
describe('saved drill history RC disclosure boundary', () => {
  beforeEach(() => { mock.owner = 'owner'; mock.tables = {}; mock.calls = []; });
  it('never reads raw RC view outcomes or attempts from active sessions', async () => {
    mock.tables.rc_drill_sessions = { data: [{ ...session('active'), status: 'in_progress' }], error: null };
    expect(await fetchDrillHistory('owner')).toEqual([]);
    expect(mock.calls[0].filters).toContainEqual(['not:source', 'rc']);
    expect(mock.calls[0].filters).toContainEqual(['not:source', 'lr']);
    expect(mock.calls.some(c => c.table === 'rc_attempts')).toBe(false);
  });
  it('retains repeated completed-question outcomes using exact session bindings', async () => {
    mock.tables.rc_drill_sessions = { data: [session('one'), session('two')], error: null };
    mock.tables.rc_attempts = { data: [attempt('one', false), attempt('two', true), attempt('active', true), { ...attempt('one', false), selected: null }], error: null };
    const rows = await fetchDrillHistory('owner');
    expect(rows.map(r => r.correct)).toEqual([false, true]);
    expect(mock.calls.find(c => c.table === 'rc_attempts')?.filters).toContainEqual(['session_id', ['one', 'two']]);
  });
  it('withholds completed PrepTest child outcomes until the exact parent completion', async () => {
    mock.tables.rc_drill_sessions = { data: [session('child', 'parent')], error: null };
    mock.tables.practice_test_runs = { data: [{ id: 'other', user_id: 'owner', status: 'completed', completed_at: '2026-09-30' }], error: null };
    expect(await fetchDrillHistory('owner')).toEqual([]);
    expect(mock.calls.some(c => c.table === 'rc_attempts')).toBe(false);
    mock.tables.practice_test_runs.data = [{ id: 'parent', user_id: 'owner', status: 'completed', completed_at: '2026-09-30' }];
    mock.tables.rc_attempts = { data: [attempt('child', false)], error: null };
    expect(await fetchDrillHistory('owner')).toHaveLength(1);
  });
  it('withholds LR timed outcomes until exact owned completed work', async () => {
    const base = { user_id: 'owner', class_id: 'owner', qid: 'q', pt: 140, section: 1, qnum: 1, qtype: 'Must be true', correct: true, time_ms: 1000, selected_answer: 'A', mode: 'full-section', timestamp_iso: '2026-09-30', timed_pt_run_id: null, timed_section_sitting_id: null };
    mock.tables.attempts = { data: [{ ...base, timed_pt_run_id: 'active' }, { ...base, timed_pt_run_id: 'done' }, { ...base, timed_section_sitting_id: 'active-section' }, base], error: null };
    mock.tables.practice_test_runs = { data: [{ id: 'done', user_id: 'owner', status: 'completed', completed_at: '2026-09-30' }], error: null };
    expect(await fetchDrillHistory('owner')).toHaveLength(2);
  });
  it('rejects failed source authority rather than showing empty saved history', async () => {
    mock.tables.rc_drill_sessions = { data: [], error: { message: 'offline' } };
    await expect(fetchDrillHistory('owner')).rejects.toThrow('offline');
  });
  it('stops an old-owner request before any source read', async () => {
    mock.owner = 'new-owner';
    await expect(fetchDrillHistory('owner')).rejects.toThrow('account changed');
    expect(mock.calls).toEqual([]);
  });
});

it('sections exclude incomplete parents without altering original records', async () => {
  mock.owner = 'owner'; mock.tables = {};
  const rows = [{ practiceTestRunId: null }, { practiceTestRunId: 'active' }];
  expect(await filterCompletedHistorySections('owner', rows)).toEqual([rows[0]]);
  expect(rows).toHaveLength(2);
});
it('formats a supported native saved answer without exposing submission UUID or JSON', () => {
  const run = '12345678-1234-4123-8123-123456789012';
  const row = { user_id: 'owner', source: 'intro-lr' as const, question_key: 'q', question_ref: 'mc-001', detail: `native-lab:main-conclusion:${run}`, correct: true, time_ms: 1, mode: 'native_lab_v1', attempted_at: '2026-09-30', selected_answer: JSON.stringify({ answer: '0', run_id: run, ordinal: 1 }) };
  // Use the real canonical roster so formatting is checked against actual saved identity.
  const known = ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS[0];
  const result = readableHistoryRow({ ...row, question_ref: known.id });
  expect(result.detail).toBe('Main Conclusion Lab');
  expect(result.selected_answer).toBe(known.chunks[0]);
});

it('groups repeated native runs by authored question while retaining distinct attempts', () => {
  const known = ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS[0];
  const runs = ['12345678-1234-4123-8123-123456789012', '22345678-1234-4123-8123-123456789012'];
  const rows = runs.map((run, index) => readableHistoryRow({ user_id: 'owner', source: 'intro-lr', question_key: `${run}::${known.id}`, question_ref: known.id, detail: `native-lab:main-conclusion:${run}`, correct: index === 1, time_ms: 1000, mode: 'native_lab_v1', attempted_at: `2026-09-${29 + index}`, selected_answer: JSON.stringify({ answer: '0', run_id: run, ordinal: 1 }) }));
  const rollup = rollupByQuestion(rows);
  expect(rollup).toHaveLength(1);
  expect(rollup[0]).toMatchObject({ attempts: 2, gradedAttempts: 2, correctCount: 1, accuracy: 0.5 });
  expect([...attemptNumbers(rows).values()]).toEqual([1, 2]);
  expect(rows).toHaveLength(2);
});
