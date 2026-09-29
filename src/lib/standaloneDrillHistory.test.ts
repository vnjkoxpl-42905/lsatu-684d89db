import { describe, expect, it } from 'vitest';
import { buildStandaloneDrillHistory } from './standaloneDrillHistory';
import type { StandaloneDrillRun } from './drillRunLedger';
import type { RcAttempt, RcDrillSession } from '@/features/rc/lib/rcTypes';

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
  id, label: 'Custom LR', updated_at: '2026-09-29T12:00:00Z',
  session: { status, attempts: Array.from({ length: attempts }, () => ({})), question_queue: ['q1'] },
} as StandaloneDrillRun);

describe('buildStandaloneDrillHistory', () => {
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

  it('requires saved work for in-progress rows and excludes test and assigned RC', () => {
    const rows = buildStandaloneDrillHistory(
      [lr('empty', 'in_progress', 0), lr('finished', 'completed', 0)],
      [
        rc('empty-rc'),
        rc('pt-rc', { config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, practiceTestRunId: 'test' } }),
        rc('assigned-rc', { config: { source: 'assignment', reveal: 'end_of_set', timing: { mode: 'unlimited' } } }),
        rc('finished-rc', { status: 'completed' }),
      ],
      new Map([['pt-rc', [answer('pt-rc')]], ['assigned-rc', [answer('assigned-rc')]]]),
    );
    expect(rows.map((row) => row.key)).toEqual(['lr:finished', 'rc:finished-rc']);
  });
});
