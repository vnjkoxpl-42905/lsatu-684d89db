import { describe, expect, it } from 'vitest';
import { buildStandaloneDrillHistory, classifyRcHistoryTake } from './standaloneDrillHistory';
import type { StandaloneDrillRun } from './drillRunLedger';
import type { RcAttempt, RcDrillSession } from '@/features/rc/lib/rcTypes';
import type { DrillResumeSession } from './drillResumeSession';

const rc = (id: string, overrides: Partial<RcDrillSession> = {}): RcDrillSession => ({
  id,
  userId: 'student',
  config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } },
  passageIds: [12],
  status: 'in_progress',
  excludedFromAnalytics: false,
  startedAt: '2026-09-28T12:00:00Z',
  completedAt: null,
  ...overrides,
});
const answer = (sessionId: string): RcAttempt => ({
  sessionId, questionId: 33, passageId: 12, selected: 'A', isCorrect: true,
  timeMs: 300, flagged: false, eliminations: [], isFirstAttempt: true,
});
const lr = (id: string, status: 'in_progress' | 'completed', attempts: number): StandaloneDrillRun => ({
  id, source_key: 'custom::set', label: 'Custom LR', updated_at: '2026-09-29T12:00:00Z',
  session: { status, attempts: Array.from({ length: attempts }, () => ({})), question_queue: ['q1'] },
} as StandaloneDrillRun);
const smart = (status: 'in_progress' | 'completed', attempts: number): DrillResumeSession => ({
  pool_slug: 'drill::adaptive', status,
  attempts: Array.from({ length: attempts }, () => ({})),
  question_queue: ['q1', 'q2'], updated_at: '2026-09-30T14:00:00Z',
} as DrillResumeSession);

describe('buildStandaloneDrillHistory', () => {
  it('distinguishes observed repeats from unknown legacy exposure and preserves explicit start snapshots', () => {
    const earlier = rc('earlier', { status: 'completed', startedAt: '2026-09-01T12:00:00Z', completedAt: '2026-09-01T13:00:00Z' });
    const later = rc('later');
    const attempts = new Map([['earlier', [answer('earlier')]]]);
    expect(classifyRcHistoryTake(later, [earlier, later], attempts)).toBe('repeat');
    expect(classifyRcHistoryTake(earlier, [earlier, later], attempts)).toBe('unknown');
    const snapshotted = rc('snapshot', { config: { ...later.config, passageExposureAtStart: { 12: 'no-recorded-exposure' } } as RcDrillSession['config'] });
    expect(classifyRcHistoryTake(snapshotted, [snapshotted], new Map())).toBe('first-recorded');
    expect(classifyRcHistoryTake(rc('mixed', { passageIds: [12, 13] }), [earlier], attempts)).toBe('mixed');
    expect(classifyRcHistoryTake(later, [{ ...earlier, userId: 'another-account' }], attempts)).toBe('unknown');
  });
  it('exposes timing mode as history metadata without unsealing correctness', () => {
    const timed = rc('timed', { status: 'completed', config: { ...rc('base').config, timing: { mode: 'per_passage_budget', secondsPerPassage: 525 } } });
    const rows = buildStandaloneDrillHistory([], [timed], new Map([['timed', [answer('timed')]]]));
    expect(rows[0]).toMatchObject({ rcTiming: 'timed', rcTake: 'unknown', detail: 'Completed · results hidden until you reveal them' });
  });
  it('hides completed RC score until an acknowledged reveal, including legacy sessions', () => {
    const rows = buildStandaloneDrillHistory([], [rc('hidden', { status: 'completed' })], new Map([['hidden', [answer('hidden')]]]));
    expect(rows[0].detail).toBe('Completed · results hidden until you reveal them');
    expect(rows[0].detail).not.toContain('correct');
  });

  it('makes unchecked account drafts resumable without scored attempts', () => {
    const draft = { questionId: 33, selected: 'A', attemptId: '12345678-1234-1234-1234-123456789012', flagged: false, eliminations: [] } as const;
    const rows = buildStandaloneDrillHistory([], [rc('draft', { config: {
      source: 'manual', reveal: 'per_passage', timing: { mode: 'unlimited' }, draftAnswers: [{ ...draft, eliminations: [] }],
    } })], new Map());
    expect(rows).toMatchObject([{ key: 'rc:draft', section: 'rc', detail: '1 answer saved', continueTo: '/rc/drill?sessionId=draft' }]);
  });
  it('names RC cards by PrepTest, section, passage and title, and scores finished drills', () => {
    const names = new Map([[12, { preptest: 139, section: 3, setNumber: 1, title: 'Improving Farm Economics' }]]);
    const graded = (sessionId: string, questionId: number, isCorrect: boolean | null): RcAttempt => ({
      ...answer(sessionId), questionId, isCorrect, selected: isCorrect === null ? null : 'A',
    });
    const rows = buildStandaloneDrillHistory(
      [],
      [rc('done', { config: { ...rc('base').config, resultsRevealedAt: '2026-10-17T12:00:00Z' }, status: 'completed', completedAt: '2026-09-30T12:00:00Z' }), rc('open')],
      new Map([
        ['done', [graded('done', 1, true), graded('done', 2, false), graded('done', 3, null)]],
        ['open', [answer('open')]],
      ]),
      null,
      names,
    );
    const done = rows.find((row) => row.key === 'rc:done')!;
    expect(done.title).toBe('PT 139 · S3 · P1 · Improving Farm Economics');
    expect(done.detail).toBe('1/3 correct · 33%');
    expect(done.discardId).toBeUndefined();
    const open = rows.find((row) => row.key === 'rc:open')!;
    expect(open.title).toBe('PT 139 · S3 · P1 · Improving Farm Economics');
    expect(open.discardId).toBe('open');
  });

  it('summarizes multi-passage drills and falls back when a passage is unknown', () => {
    const names = new Map([
      [12, { preptest: 139, section: 3, setNumber: 1, title: 'A' }],
      [13, { preptest: 140, section: 2, setNumber: 3, title: null }],
      [14, { preptest: 141, section: 1, setNumber: 2, title: 'C' }],
    ]);
    const rows = buildStandaloneDrillHistory(
      [],
      [rc('many', { passageIds: [12, 13, 14] }), rc('unknown', { passageIds: [12, 99] })],
      new Map([['many', [answer('many')]], ['unknown', [answer('unknown')]]]),
      null,
      names,
    );
    expect(rows.find((row) => row.key === 'rc:many')?.title).toBe('RC drill · 3 passages · PT 139 S3 P1, PT 140 S2 P3 +1 more');
    expect(rows.find((row) => row.key === 'rc:unknown')?.title).toBe('RC drill · 2 passages');
  });

  it('keeps each saved sitting distinct and sorts LR with RC', () => {
    const rows = buildStandaloneDrillHistory(
      [lr('lr-1', 'in_progress', 1), lr('lr-2', 'completed', 1)],
      [rc('rc-1'), rc('rc-2', { status: 'completed', completedAt: '2026-09-30T12:00:00Z' })],
      new Map([['rc-1', [answer('rc-1')]], ['rc-2', [answer('rc-2')]]]),
    );
    expect(rows.map((row) => row.key)).toEqual(['rc:rc-2', 'lr:lr-1', 'lr:lr-2', 'rc:rc-1']);
    expect(rows.find((row) => row.key === 'rc:rc-1')?.continueTo).toBe('/rc/drill?sessionId=rc-1');
    expect(rows.find((row) => row.key === 'rc:rc-2')?.reviewTo).toBe('/rc/drill?sessionId=rc-2&review=1');
    expect(rows.find((row) => row.key === 'lr:lr-2')?.resultsTo).toBe('/practice/drills/runs/lr-2?view=results');
  });

  it('includes started unanswered ordinary RC while excluding protected, assigned and abandoned sessions', () => {
    const rows = buildStandaloneDrillHistory(
      [lr('empty', 'in_progress', 0), lr('finished', 'completed', 0)],
      [
        rc('empty-rc'),
        rc('abandoned-rc', { status: 'abandoned' }),
        rc('pt-rc', { config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, practiceTestRunId: 'test' } }),
        rc('assigned-rc', { config: { source: 'assignment', reveal: 'end_of_set', timing: { mode: 'unlimited' } } }),
        rc('section-rc', { config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, timedSectionSittingId: 'sitting' } }),
        rc('finished-rc', { status: 'completed' }),
      ],
      new Map([['pt-rc', [answer('pt-rc')]], ['assigned-rc', [answer('assigned-rc')]], ['section-rc', [answer('section-rc')]]]),
    );
    expect(rows.map((row) => row.key)).toEqual(['lr:finished', 'rc:empty-rc', 'rc:finished-rc']);
    expect(rows.find(row => row.key === 'rc:empty-rc')).toMatchObject({
      status: 'in_progress', detail: '0 first answers saved', discardId: 'empty-rc',
      continueTo: '/rc/drill?sessionId=empty-rc',
    });
    expect(rows.every(row => !['pt-rc', 'assigned-rc', 'section-rc', 'abandoned-rc'].includes(row.discardId ?? ''))).toBe(true);
  });

  it('lists assignment-link practice with Resume and completed Review destinations', () => {
    const config = { source: 'manual' as const, assignmentOrigin: true, reveal: 'end_of_set' as const, timing: { mode: 'unlimited' as const } };
    const rows = buildStandaloneDrillHistory([], [rc('origin-active', { config }), rc('origin-complete', { config, status: 'completed' })], new Map());
    expect(rows.find(row => row.key === 'rc:origin-active')?.continueTo).toBe('/rc/drill?sessionId=origin-active');
    expect(rows.find(row => row.key === 'rc:origin-complete')?.reviewTo).toBe('/rc/drill?sessionId=origin-complete&review=1');
  });

  it('shows a saved Smart Drill as one resumable row, never as completed history', () => {
    const rows = buildStandaloneDrillHistory([], [], new Map(), smart('in_progress', 1));
    expect(rows).toMatchObject([{
      key: 'smart:adaptive', title: 'Smart Drill', detail: '1 answer saved', status: 'in_progress',
      continueTo: '/drill?drill=smart-drill&returnTo=%2Fclassroom',
    }]);
    expect(buildStandaloneDrillHistory([], [], new Map(), smart('completed', 1))).toEqual([]);
    expect(buildStandaloneDrillHistory([], [], new Map(), smart('in_progress', 0))).toEqual([]);
  });

  it('does not duplicate an active Smart Drill when it has an account ledger row', () => {
    const ledger = { ...lr('run', 'in_progress', 1), source_key: 'drill::adaptive' };
    const rows = buildStandaloneDrillHistory([ledger], [], new Map(), smart('in_progress', 1));
    expect(rows.map((row) => row.key)).toEqual(['lr:run']);
    expect(rows[0]).toMatchObject({
      title: 'Smart Drill', detail: '1 answer saved', status: 'in_progress',
      continueTo: '/drill?drill=smart-drill&returnTo=%2Fpractice%2Fdrills&run=run',
    });
  });

  it('keeps completed adaptive sittings distinct from the current one', () => {
    const rows = buildStandaloneDrillHistory([
      { ...lr('old', 'completed', 1), source_key: 'drill::adaptive' },
      { ...lr('new', 'completed', 1), source_key: 'drill::adaptive' },
      { ...lr('current', 'in_progress', 1), source_key: 'drill::adaptive' },
    ], [], new Map(), smart('in_progress', 1));
    expect(rows.map((row) => row.key)).toEqual(['lr:old', 'lr:new', 'lr:current']);
    expect(rows.filter((row) => row.status === 'completed')).toHaveLength(2);
    expect(rows[0].resultsTo).toBe('/practice/drills/runs/old?view=results');
    expect(rows[1].reviewTo).toBe('/practice/drills/runs/new?view=review');
  });
});
