import { beforeEach, describe, expect, it, vi } from 'vitest';

const account = vi.hoisted(() => ({
  userId: '11111111-1111-4111-8111-111111111111',
  rows: new Map<string, unknown>(),
  failWrite: false,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: account.userId } }, error: null }) },
    from: () => {
      const filters: Record<string, string> = {};
      const chain = {
        select: () => chain,
        eq: (field: string, value: string) => {
          filters[field] = value;
          return chain;
        },
        order: () => chain,
        range: async (start: number, end: number) => ({
          data: [...account.rows.entries()]
            .filter(([id]) => !filters.record_id || id === filters.record_id)
            .map(([record_id, data]) => ({ record_id, data }))
            .slice(start, end + 1),
          error: null,
        }),
        maybeSingle: async () => {
          const data = account.rows.get(filters.record_id);
          return { data: data ? { record_id: filters.record_id, data } : null, error: null };
        },
        upsert: async (row: { record_id: string; data: unknown }) => {
          if (account.failWrite) return { error: new Error('offline') };
          account.rows.set(row.record_id, row.data);
          return { error: null };
        },
      };
      return chain;
    },
  },
}));

import {
  beginGuidedDrillCloseout,
  completeStandaloneDrillRun,
  createStandaloneDrillRun,
  listStandaloneDrillRuns,
  loadStandaloneDrillRun,
  saveStandaloneDrillRun,
  parseOwnedDrillRun,
} from './drillRunLedger';
import { lrRunProvenanceForSpec } from './lrRunProvenance';

const snapshot = {
  questionQueue: ['PT150-S1-Q1', 'PT150-S1-Q2'],
  currentIndex: 0,
  attempts: [{ qid: 'PT150-S1-Q1', selected_answer: 'B', correct: true, time_ms: 1200 }],
};

beforeEach(() => {
  account.userId = '11111111-1111-4111-8111-111111111111';
  account.rows.clear();
  account.failWrite = false;
});

describe('standalone drill run ledger', () => {
  it('retains saved LR policy and source across updates, reload and completion', async () => {
    const key = 'drill::type-drill::abc';
    const provenance = lrRunProvenanceForSpec({ mode: 'type-drill', launchKind: 'questions' }, key, 'official')!;
    const run = await createStandaloneDrillRun(account.userId, key, snapshot, { mode: 'type-drill', provenance });
    expect(run.session.attempts[0].provenance).toEqual(provenance);
    const wrong = { ...provenance, source_key: 'drill::type-drill::other' };
    await saveStandaloneDrillRun(account.userId, run.id, { ...snapshot, attempts: [{ ...snapshot.attempts[0], provenance: wrong }, { ...snapshot.attempts[0], qid: snapshot.questionQueue[1] }] });
    const loaded = await loadStandaloneDrillRun(account.userId, run.id);
    expect(loaded?.provenance).toEqual(provenance);
    expect(loaded?.session.attempts.map(attempt => attempt.provenance)).toEqual([provenance, provenance]);
    const completed = await completeStandaloneDrillRun(account.userId, run.id, { ...snapshot, attempts: loaded!.session.attempts });
    expect(completed.provenance).toEqual(provenance);
    expect(completed.session.status).toBe('completed');
  });

  it('does not infer historical provenance when an old sitting resumes', async () => {
    const key = 'drill::type-drill::abc';
    const run = await createStandaloneDrillRun(account.userId, key, snapshot, { mode: 'type-drill' });
    const provenance = lrRunProvenanceForSpec({ mode: 'type-drill', launchKind: 'questions' }, key, 'official')!;
    const updated = await saveStandaloneDrillRun(account.userId, run.id, { ...snapshot, attempts: [{ ...snapshot.attempts[0], provenance }, { ...snapshot.attempts[0], qid: snapshot.questionQueue[1], provenance }] });
    expect(updated.provenance).toBeUndefined();
    expect(updated.session.attempts[0].provenance).toBeUndefined();
    expect(updated.session.attempts[1].provenance).toEqual(provenance);
  });

  it('refuses malformed or mismatched saved policy without reinterpreting the source', async () => {
    const key = 'drill::type-drill::abc';
    const provenance = lrRunProvenanceForSpec({ mode: 'type-drill', launchKind: 'questions' }, key, 'official')!;
    const run = await createStandaloneDrillRun(account.userId, key, snapshot, { mode: 'type-drill', provenance });
    for (const changed of [{ provenance: { ...provenance, version: 2 } }, { source_key: 'drill::type-drill::other' }, { mode: 'adaptive' }, { session: { ...run.session, attempts: [{ ...run.session.attempts[0], provenance: { ...provenance, source_key: 'drill::type-drill::other' } }] } }]) {
      expect(parseOwnedDrillRun(account.userId, run.id, { ...run, ...changed })).toBeNull();
    }
  });
  it('keeps repeated assigned guided drill sittings separate, even after one is completed', async () => {
    const key = 'guided::33333333-3333-4333-8333-333333333333';
    const first = await createStandaloneDrillRun(account.userId, key, snapshot, { mode: 'type-drill', label: 'Reasoning drill' });
    await completeStandaloneDrillRun(account.userId, first.id, snapshot);
    const second = await createStandaloneDrillRun(account.userId, key, {
      ...snapshot,
      attempts: [{ qid: 'PT150-S1-Q1', selected_answer: 'C', correct: false, time_ms: 2000 }],
    });
    expect(first.id).not.toBe(second.id);
    expect((await loadStandaloneDrillRun(account.userId, first.id))?.session.status).toBe('completed');
    expect((await loadStandaloneDrillRun(account.userId, second.id))?.session.attempts[0].selected_answer).toBe('C');
    expect((await listStandaloneDrillRuns(account.userId)).filter((row) => row.source_key === key)).toHaveLength(2);
  });
  it('freezes the first guided closeout answer across a failed final save and retry', async () => {
    const key = 'guided::33333333-3333-4333-8333-333333333333';
    const run = await createStandaloneDrillRun(account.userId, key, snapshot);
    const frozen = await beginGuidedDrillCloseout(account.userId, run.id, snapshot);
    expect(frozen.closeout_attempts?.[0].selected_answer).toBe('B');
    const changed = { ...snapshot, attempts: [{ ...snapshot.attempts[0], selected_answer: 'C', correct: false }] };
    account.failWrite = true;
    await expect(completeStandaloneDrillRun(account.userId, run.id, changed)).rejects.toThrow('offline');
    account.failWrite = false;
    const retried = await beginGuidedDrillCloseout(account.userId, run.id, changed);
    expect(retried.closeout_attempts?.[0].selected_answer).toBe('B');
    const completed = await completeStandaloneDrillRun(account.userId, run.id, changed);
    expect(completed.session.attempts[0].selected_answer).toBe('B');
    expect(completed.session.status).toBe('completed');
  });
  it('keeps two sittings of the same question pool with distinct IDs and results', async () => {
    const key = 'drill::type-drill::abc';
    const first = await createStandaloneDrillRun(account.userId, key, snapshot, { mode: 'type-drill', label: 'Conclusion' });
    const second = await createStandaloneDrillRun(account.userId, key, { ...snapshot, attempts: [] });
    expect(first.id).not.toBe(second.id);
    await completeStandaloneDrillRun(account.userId, first.id, snapshot);
    const rows = await listStandaloneDrillRuns(account.userId);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === first.id)?.session.status).toBe('completed');
    expect(rows.find((row) => row.id === second.id)?.session.status).toBe('in_progress');
  });

  it('requires account acknowledgement and does not resurrect a completed run', async () => {
    account.failWrite = true;
    await expect(createStandaloneDrillRun(account.userId, 'drill::adaptive', snapshot)).rejects.toThrow('offline');
    expect(account.rows.size).toBe(0);
    account.failWrite = false;
    const created = await createStandaloneDrillRun(account.userId, 'drill::adaptive', snapshot);
    const completed = await completeStandaloneDrillRun(account.userId, created.id, snapshot);
    const stale = await saveStandaloneDrillRun(account.userId, created.id, { ...snapshot, attempts: [] });
    expect(stale).toEqual(completed);
    expect((await loadStandaloneDrillRun(account.userId, created.id))?.session.status).toBe('completed');
  });

  it('rejects another account and ignores mismatched stored ownership', async () => {
    const run = await createStandaloneDrillRun(account.userId, 'drill::adaptive', snapshot);
    account.userId = '22222222-2222-4222-8222-222222222222';
    await expect(loadStandaloneDrillRun('11111111-1111-4111-8111-111111111111', run.id))
      .rejects.toThrow('Sign in');
    expect(await loadStandaloneDrillRun(account.userId, run.id)).toBeNull();
    expect(await listStandaloneDrillRuns(account.userId)).toEqual([]);
  });
});
