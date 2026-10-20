import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  rows: {} as Record<string, { record_id: string; data: unknown }[]>,
  reads: [] as { userId: string; table: string; start: number; end: number }[],
  failedTable: '',
  nullTable: '',
  authRead: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: store.authRead },
    from: () => {
      const filters: Record<string, string> = {};
      const query = {
        select: () => query,
        eq: (name: string, value: string) => { filters[name] = value; return query; },
        order: () => query,
        range: async (start: number, end: number) => {
          store.reads.push({ userId: filters.user_id, table: filters.table_name, start, end });
          return {
            data: filters.table_name === store.nullTable ? null : (store.rows[filters.table_name] ?? []).slice(start, end + 1),
            error: filters.table_name === store.failedTable ? new Error('source unavailable') : null,
          };
        },
      };
      return query;
    },
  },
}));
import { practiceSessionIdFor } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { loadAssignmentWorkEvidence, projectAssignmentWorkEvidence, assignmentProgressUnverified, projectGuidedWorkEvidence, projectHomeworkWorkEvidence } from './studentWorkEvidence';

const studentId = '11111111-1111-4111-8111-111111111111';
const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };

function runRow(assignmentId: string, options: { id?: string; status?: 'in_progress' | 'completed'; time?: string; attempts?: typeof answer[] } = {}) {
  const id = options.id ?? '33333333-3333-4333-8333-333333333333';
  const time = options.time ?? '2026-09-29T12:00:00.000Z';
  const legacy = row(assignmentId, options.attempts ?? [answer]);
  return {
    record_id: id,
    data: {
      id, user_id: studentId, source_key: legacy.data.pool_slug, mode: 'type-drill', label: 'Reasoning drill',
      session: { ...legacy.data, id, status: options.status ?? 'in_progress', updated_at: time },
      created_at: time, updated_at: time,
    },
  };
}

beforeEach(() => {
  store.rows = {};
  store.reads = [];
  store.failedTable = '';
  store.nullTable = '';
  store.authRead.mockClear();
});

function row(assignmentId: string, attempts: unknown[] = [], prefix = 'guided::') {
  const poolSlug = `${prefix}${assignmentId}`;
  const id = practiceSessionIdFor(studentId, poolSlug);
  return {
    record_id: id,
    data: {
      id,
      user_id: studentId,
      pool_slug: poolSlug,
      completion_id: poolSlug,
      question_queue: ['PT101-S2-Q1'],
      current_index: 0,
      attempts,
      status: 'in_progress',
      started_at: '2026-09-28T12:00:00.000Z',
      updated_at: '2026-09-28T12:00:00.000Z',
    },
  };
}

describe('account-saved guided assignment evidence', () => {
  it('recognizes a newly answered ledger sitting without a legacy singleton', () => {
    const run = runRow('assignment-a');
    expect(projectGuidedWorkEvidence(studentId, [], [run])).toEqual({
      'assignment-a': { sessionId: run.record_id, savedAnswerCount: 1, status: 'in_progress' },
    });
  });

  it('keeps issued assignment IDs separate and chooses the newest answered sitting without summing retakes', () => {
    const old = runRow('assignment-a', { time: '2026-09-28T12:00:00.000Z', attempts: [answer, answer] });
    const newer = runRow('assignment-a', { id: '44444444-4444-4444-8444-444444444444' });
    const other = runRow('assignment-b', { id: '55555555-5555-4555-8555-555555555555' });
    const evidence = projectGuidedWorkEvidence(studentId, [], [newer, other, old]);
    expect(Object.keys(evidence).sort()).toEqual(['assignment-a', 'assignment-b']);
    expect(evidence['assignment-a']).toEqual({ sessionId: newer.record_id, savedAnswerCount: 1, status: 'in_progress' });
  });

  it('preserves completion through migration and later incomplete retakes in either source', () => {
    const legacy = row('assignment-a', [answer]);
    legacy.data.status = 'completed';
    const newer = runRow('assignment-a');
    expect(projectGuidedWorkEvidence(studentId, [legacy], [newer])['assignment-a'].status).toBe('completed');
    legacy.data.status = 'in_progress';
    const complete = runRow('assignment-a', { status: 'completed', time: '2026-09-27T12:00:00.000Z' });
    expect(projectGuidedWorkEvidence(studentId, [legacy], [newer, complete])['assignment-a'].sessionId).toBe(complete.record_id);
  });

  it('uses a newer legacy snapshot while incomplete and selects equal-date sittings deterministically', () => {
    const legacy = row('assignment-a', [answer]);
    const older = runRow('assignment-a', { time: '2026-09-27T12:00:00.000Z' });
    expect(projectGuidedWorkEvidence(studentId, [legacy], [older])['assignment-a'].sessionId).toBe(legacy.record_id);
    const tied = runRow('assignment-a', { id: '44444444-4444-4444-8444-444444444444' });
    const first = runRow('assignment-a');
    expect(projectGuidedWorkEvidence(studentId, [], [tied, first])).toEqual(projectGuidedWorkEvidence(studentId, [], [first, tied]));
  });

  it('excludes direct launches, custom drills, and zero-answer ledger sittings', () => {
    const direct = runRow('drill:content-id');
    const slug = runRow('slug:content-slug');
    const blank = runRow('assignment-a', { attempts: [] });
    const custom = runRow('assignment-a');
    custom.data.source_key = custom.data.session.pool_slug = custom.data.session.completion_id = 'drill::adaptive';
    expect(projectGuidedWorkEvidence(studentId, [], [direct, slug, blank, custom])).toEqual({});
  });

  it('rejects malformed ownership, row IDs, and embedded assignment references', () => {
    const otherId = '22222222-2222-4222-8222-222222222222';
    const malformed = [
      (run: ReturnType<typeof runRow>) => { run.data.user_id = otherId; },
      (run: ReturnType<typeof runRow>) => { run.data.session.user_id = otherId; },
      (run: ReturnType<typeof runRow>) => { run.record_id = otherId; },
      (run: ReturnType<typeof runRow>) => { run.data.session.id = otherId; },
      (run: ReturnType<typeof runRow>) => { run.data.session.pool_slug = 'guided::assignment-b'; },
      (run: ReturnType<typeof runRow>) => { run.data.session.completion_id = 'guided::assignment-b'; },
    ].map((mutate) => { const run = runRow('assignment-a'); mutate(run); return run; });
    expect(projectGuidedWorkEvidence(studentId, [], malformed)).toEqual({});
  });
  it('does not count a launched drill with no saved answer', () => {
    expect(projectGuidedWorkEvidence(studentId, [row('assignment-a')])).toEqual({});
  });

  it('links saved answers to each issued assignment instance', () => {
    const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };
    const evidence = projectGuidedWorkEvidence(studentId, [row('assignment-a', [answer]), row('assignment-b', [answer])]);
    expect(Object.keys(evidence).sort()).toEqual(['assignment-a', 'assignment-b']);
    expect(evidence['assignment-a'].savedAnswerCount).toBe(1);
  });

  it('rejects records for another account and mismatched keys', () => {
    const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };
    const good = row('assignment-a', [answer]);
    expect(projectGuidedWorkEvidence(studentId, [
      { ...good, record_id: 'not-the-matching-record' },
      { ...good, data: { ...good.data, user_id: '22222222-2222-4222-8222-222222222222' } },
    ])).toEqual({});
  });

  it('links homework answers to the issued homework row', () => {
    const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };
    const opened = row('homework-a', [], 'drill::assignment::');
    const answered = row('homework-b', [answer], 'drill::assignment::');
    const evidence = projectHomeworkWorkEvidence(studentId, [opened, answered]);
    expect(Object.keys(evidence)).toEqual(['homework-b']);
    expect(evidence['homework-b'].savedAnswerCount).toBe(1);
  });
});

describe('selected-student assignment evidence reads', () => {
  it('reads both sources for the subject without applying a self-only authentication guard', async () => {
    store.rows.drill_runs = [runRow('assignment-a')];
    const evidence = await loadAssignmentWorkEvidence(studentId);
    expect(evidence.guided['assignment-a'].status).toBe('in_progress');
    expect(store.reads.map((read) => [read.userId, read.table])).toEqual([
      [studentId, 'practice_sessions'], [studentId, 'drill_runs'],
    ]);
    expect(store.authRead).not.toHaveBeenCalled();
  });

  it('pages each source so a late guided sitting still supplies progress', async () => {
    const legacyFiller = row('drill:direct', [answer]);
    const runFiller = runRow('drill:direct');
    store.rows.practice_sessions = [...Array(500).fill(legacyFiller), row('assignment-legacy', [answer])];
    store.rows.drill_runs = [...Array(500).fill(runFiller), runRow('assignment-ledger')];
    const evidence = await loadAssignmentWorkEvidence(studentId);
    expect(Object.keys(evidence.guided).sort()).toEqual(['assignment-ledger', 'assignment-legacy']);
    expect(store.reads.filter((read) => read.start === 500).map((read) => read.table).sort()).toEqual(['drill_runs', 'practice_sessions']);
  });

  it('surfaces a failed ledger read instead of treating the source as untouched', async () => {
    store.failedTable = 'drill_runs';
    store.rows.practice_sessions = [row('homework-a', [answer], 'drill::assignment::')];
    const evidence = await loadAssignmentWorkEvidence(studentId);
    expect(evidence.homework['homework-a'].savedAnswerCount).toBe(1);
    expect(evidence.diagnostics).toEqual([{ source: 'drill_runs', family: 'guided', reason: 'read_failed' }]);
    expect(assignmentProgressUnverified(evidence, 'homework', 'homework-b')).toBe(false);
  });
});


describe('saved assignment diagnostics', () => {
  it('keeps valid independent evidence and identifies malformed assigned records', () => {
    const invalid = row('broken', [answer]);
    invalid.data.current_index = -1;
    const result = projectAssignmentWorkEvidence(studentId, [invalid, row('good', [answer])]);
    expect(result.guided.good.savedAnswerCount).toBe(1);
    expect(result.guided.broken).toBeUndefined();
    expect(result.diagnostics).toEqual([{ source: 'practice_sessions', family: 'guided', reason: 'invalid_record', assignmentId: 'broken' }]);
    expect(assignmentProgressUnverified(result, 'guided', 'broken')).toBe(true);
    expect(assignmentProgressUnverified(result, 'guided', 'good')).toBe(false);
  });

  it('diagnoses conflicting run bindings without counting them as saved progress', () => {
    const run = runRow('broken');
    run.data.session.completion_id = 'guided::different';
    const result = projectAssignmentWorkEvidence(studentId, [], [run]);
    expect(result.guided).toEqual({});
    expect(result.diagnostics?.[0]).toMatchObject({ source: 'drill_runs', family: 'guided' });
    expect(result.diagnostics?.[0].assignmentId).toBeUndefined();
    expect(assignmentProgressUnverified(result, 'guided', 'different')).toBe(true);
  });

  it('does not diagnose unrelated timed records, direct launches, or valid blank sessions', () => {
    const unrelated = row('run::leg-0', [answer], 'drill::practice-test::');
    unrelated.data.started_at = '2026-09-30T12:00:00+00:00';
    const direct = row('drill:content', [answer]);
    direct.data.current_index = -1;
    expect(projectAssignmentWorkEvidence(studentId, [unrelated, direct, row('blank')], [runRow('blank', { attempts: [] })]).diagnostics).toEqual([]);
  });

  it('does not expose a foreign stored assignment identity', () => {
    const foreign = row('private-assignment', [answer]);
    foreign.data.user_id = '22222222-2222-4222-8222-222222222222';
    const result = projectAssignmentWorkEvidence(studentId, [foreign]);
    expect(result.guided).toEqual({});
    expect(result.diagnostics?.[0].assignmentId).toBeUndefined();
  });

  it('preserves the independent ledger when legacy source reads fail and recovers cleanly', async () => {
    store.rows.drill_runs = [runRow('good')];
    store.failedTable = 'practice_sessions';
    const failed = await loadAssignmentWorkEvidence(studentId);
    expect(failed.guided.good.savedAnswerCount).toBe(1);
    expect(failed.diagnostics).toHaveLength(1);
    store.failedTable = '';
    expect((await loadAssignmentWorkEvidence(studentId)).diagnostics).toEqual([]);
  });

  it('reports a null successful source response rather than genuine empty progress', async () => {
    store.nullTable = 'practice_sessions';
    expect((await loadAssignmentWorkEvidence(studentId)).diagnostics).toEqual([{ source: 'practice_sessions', family: 'unknown', reason: 'read_failed' }]);
  });
});


it('diagnoses an owned embedded assignment claim that contradicts the outer run namespace', () => {
  const run = runRow('broken');
  run.data.source_key = 'drill::adaptive';
  const result = projectAssignmentWorkEvidence(studentId, [], [run]);
  expect(result.guided).toEqual({});
  expect(result.diagnostics).toEqual([{ source: 'drill_runs', family: 'guided', reason: 'invalid_record', assignmentId: 'broken' }]);
});
