import { describe, expect, it } from 'vitest';
import { CONFIGURABLE_FLAG_KEYS, FLOOR_FLAG_KEYS, tierFlags, type ManagedUser } from '@/lib/adminUsers';
import { signupQueueRows } from '@/components/teacher/SignupQueue';
import { drillAuthorisation } from '@/components/AssignmentGate';

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
