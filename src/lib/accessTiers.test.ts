import { describe, expect, it } from 'vitest';
import { CONFIGURABLE_FLAG_KEYS, FLOOR_FLAG_KEYS, tierFlags, type ManagedUser } from '@/lib/adminUsers';
import { signupQueueRows } from '@/components/teacher/SignupQueue';
import { drillAuthorisation, isActivePracticeTestLrLeg, isActivePracticeTestRcLeg } from '@/components/AssignmentGate';

describe('tierFlags', () => {
  it('Tier 1 turns all twelve switches on', () => {
    const flags = tierFlags('tier_1')!;
    expect(Object.keys(flags)).toHaveLength(12);
    expect(Object.values(flags).every(Boolean)).toBe(true);
  });

  it('Tier 3 keeps only the floor', () => {
    const flags = tierFlags('tier_3')!;
    for (const key of CONFIGURABLE_FLAG_KEYS) {
      expect(flags[key]).toBe((FLOOR_FLAG_KEYS as readonly string[]).includes(key));
    }
  });

  it('Tier 2 writes nothing', () => {
    expect(tierFlags('tier_2')).toBeNull();
  });

  it('the retired Wrong answer journal switch is not one of the twelve', () => {
    expect(CONFIGURABLE_FLAG_KEYS).not.toContain('has_waj_access');
    expect(CONFIGURABLE_FLAG_KEYS).toHaveLength(12);
  });
});

describe('assigned PrepTest LR leg gate', () => {
  const run = {
    pt: 140, status: 'in-progress', current_leg: 1,
    legs: [
      { kind: 'rc', section: 1, startedAt: '2026-09-28', completedAt: '2026-09-28' },
      { kind: 'lr', section: 2, startedAt: '2026-09-28' },
    ],
  };
  const exact = { kind: 'section', pt: 140, section: 2, ptLeg: { runId: 'own-run', legIndex: 1 } } as const;

  it('opens only the active, started LR leg of the owned run', () => {
    expect(isActivePracticeTestLrLeg(run, exact, 'own-run')).toBe(true);
    expect(isActivePracticeTestLrLeg({ ...run, status: 'complete' }, exact, 'own-run')).toBe(false);
    expect(isActivePracticeTestLrLeg({ ...run, legs: [run.legs[0], { ...run.legs[1], completedAt: '2026-09-28' }] }, exact, 'own-run')).toBe(false);
  });

  it('does not turn a sitting ID into general drill access', () => {
    expect(isActivePracticeTestLrLeg(run, { ...exact, ptLeg: { runId: 'other-run', legIndex: 1 } }, 'own-run')).toBe(false);
    expect(isActivePracticeTestLrLeg(run, { ...exact, section: 3 }, 'own-run')).toBe(false);
    expect(isActivePracticeTestLrLeg(run, { ...exact, ptLeg: { runId: 'own-run', legIndex: 0 } }, 'own-run')).toBe(false);
    expect(isActivePracticeTestLrLeg(run, { kind: 'questions', qids: ['PT140-S2-Q3'] }, 'own-run')).toBe(false);
  });
});

describe('assigned PrepTest RC session gate', () => {
  const run = {
    status: 'in-progress', current_leg: 0,
    legs: [{ kind: 'rc', startedAt: '2026-09-28', passageIds: [51, 52] }],
  };
  const session = {
    user_id: 'student-1', practice_test_run_id: 'own-run', practice_test_leg: 0,
    status: 'in_progress', passage_ids: [52, 51],
  };

  it('permits only the owned, active RC session of the exact sitting leg', () => {
    expect(isActivePracticeTestRcLeg(run, session, 'student-1', 'own-run', 0)).toBe(true);
    expect(isActivePracticeTestRcLeg(run, { ...session, user_id: 'student-2' }, 'student-1', 'own-run', 0)).toBe(false);
    expect(isActivePracticeTestRcLeg(run, { ...session, practice_test_run_id: 'other-run' }, 'student-1', 'own-run', 0)).toBe(false);
    expect(isActivePracticeTestRcLeg(run, { ...session, passage_ids: [51, 53] }, 'student-1', 'own-run', 0)).toBe(false);
    expect(isActivePracticeTestRcLeg(run, session, 'student-1', 'own-run', 1)).toBe(false);
  });

  it('denies a completed sitting, closed leg, or completed session', () => {
    expect(isActivePracticeTestRcLeg({ ...run, status: 'complete' }, session, 'student-1', 'own-run', 0)).toBe(false);
    expect(isActivePracticeTestRcLeg({ ...run, legs: [{ ...run.legs[0], completedAt: '2026-09-28' }] }, session, 'student-1', 'own-run', 0)).toBe(false);
    expect(isActivePracticeTestRcLeg(run, { ...session, status: 'completed' }, 'student-1', 'own-run', 0)).toBe(false);
  });
});

describe('signupQueueRows', () => {
  const base = { role: 'user', archived_at: null, access_tier: null } as unknown as ManagedUser;
  const row = (over: Partial<ManagedUser>) => ({ ...base, ...over }) as ManagedUser;

  it('holds undecided, active, non-admin accounts, newest first', () => {
    const rows = signupQueueRows([
      row({ class_id: 'old', created_at: '2026-01-01T00:00:00Z' }),
      row({ class_id: 'new', created_at: '2026-09-01T00:00:00Z' }),
      row({ class_id: 'tiered', access_tier: 'tier_3' }),
      row({ class_id: 'archived', archived_at: '2026-09-01T00:00:00Z' }),
      row({ class_id: 'admin', role: 'admin' }),
    ]);
    expect(rows.map((r) => r.class_id)).toEqual(['new', 'old']);
  });
});

describe('drillAuthorisation', () => {
  const ptOf = (runId: string) => (runId === 'run-140' ? 140 : null);

  it('a homework launch is authorised by its assignment row', () => {
    expect(drillAuthorisation({ kind: 'assignment', assignmentId: 'hw1' }, null, ptOf)).toEqual({
      kind: 'homework',
      id: 'hw1',
    });
  });

  it('a guided drill needs its assignment id; a bare drill id opens nothing', () => {
    expect(drillAuthorisation({ kind: 'guided-drill', assignmentId: 'g1' }, null, ptOf)).toEqual({
      kind: 'guided',
      id: 'g1',
    });
    expect(drillAuthorisation({ kind: 'guided-drill', drillId: 'd1' }, null, ptOf)).toBeNull();
  });

  it('a practice-test leg is authorised by the sitting it belongs to', () => {
    expect(drillAuthorisation(null, 'run-140', ptOf)).toEqual({ kind: 'practice-test', pt: 140 });
    expect(
      drillAuthorisation({ kind: 'section', pt: 140, section: 1, ptLeg: { runId: 'run-140', legIndex: 0 } }, null, ptOf),
    ).toEqual({ kind: 'practice-test', pt: 140 });
  });

  it('a free-standing section, smart drill or filter opens nothing on its own', () => {
    expect(drillAuthorisation({ kind: 'section', pt: 140, section: 1 }, null, ptOf)).toBeNull();
    expect(drillAuthorisation({ kind: 'smart-drill' }, null, ptOf)).toBeNull();
    expect(drillAuthorisation({ kind: 'filter', count: 6 }, null, ptOf)).toBeNull();
  });

  it('old links carrying an assignment id still resolve', () => {
    expect(drillAuthorisation(null, null, ptOf, 'hw9')).toEqual({ kind: 'homework', id: 'hw9' });
    expect(
      drillAuthorisation({ kind: 'questions', qids: ['q1'], carry: { assignmentId: 'hw2' } as never }, null, ptOf),
    ).toEqual({ kind: 'homework', id: 'hw2' });
  });
});
