import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ actor: '10000000-0000-4000-8000-000000000001', sittings: [] as Record<string, unknown>[], lr: [] as unknown[], history: [] as unknown[], rc: [] as unknown[], attempts: [] as unknown[], tableError: null as { code: string } | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: state.actor } }, error: null }) },
  from: (table: string) => {
    const chain = { select: () => chain, eq: () => chain, is: () => chain, order: () => chain,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === 'timed_section_sittings_v1' ? state.sittings : table === 'bootcamp_kv' ? state.lr.map(data => ({ data })) : state.history, error: table === 'timed_section_sittings_v1' ? state.tableError : null }).then(resolve) };
    return chain;
  },
} }));
vi.mock('@/bootcamps/main-conclusion/persistence/factory', () => ({ getPersistence: () => ({ ready: async () => {}, list: async () => [] }) }));
vi.mock('@/features/rc/api/rcProgress', () => ({ listSessions: async () => state.rc, getSessionAttempts: async () => state.attempts }));
vi.mock('@/features/rc/lib/rcBank', () => ({ loadRcIndex: async () => ({ preptests: [] }) }));
import { listPracticeSectionAttempts } from './practiceSectionAttempts';
const owner = state.actor;
const id = '20000000-0000-4000-8000-000000000002';
const at = '2026-09-30T10:00:00.000Z';
const sitting = { id, owner_id: owner, kind: 'lr', pt: 101, section: 2, phase: 'paused', created_at: at, updated_at: at, frozen_qids: ['PT101-S2-Q1', 'PT101-S2-Q2'], result: null };
describe('account section list protected resume', () => {
  beforeEach(() => Object.assign(state, { actor: owner, sittings: [], lr: [], history: [], rc: [], attempts: [], tableError: null }));
  it('lists ready work with no child and resumes its exact sitting while creation is disabled', async () => {
    state.sittings = [{ ...sitting, phase: 'ready' }];
    expect(await listPracticeSectionAttempts(owner)).toEqual([expect.objectContaining({ id, kind: 'lr-section', status: 'in-progress', answered: 0, total: 2, href: `/testing/sections/${id}` })]);
  });
  it('keeps protected LR account answers without trying to parse its nonlegacy ID as a UUID session', async () => {
    state.sittings = [sitting];
    state.lr = [{ id: `timed-section::${id}`, user_id: owner, attempts: [{ qid: 'PT101-S2-Q1', selected_answer: 'B' }] }];
    expect(await listPracticeSectionAttempts(owner)).toEqual([expect.objectContaining({ answered: 1, href: `/testing/sections/${id}` })]);
  });
  it('lists one completed protected result and removes its legacy history mirror', async () => {
    state.sittings = [{ ...sitting, phase: 'complete', result: { correct: 1, answered: 2, historyId: 'history' } }];
    state.history = [{ id: 'history', pt: 101, section: 2, completed_at: at, created_at: at, initial_total: 2, initial_score: 1, unanswered_count: 0 }];
    expect(await listPracticeSectionAttempts(owner)).toEqual([expect.objectContaining({ id: 'history', status: 'completed', correct: 1, href: `/testing/sections/${id}` })]);
  });
  it('routes protected RC to the same dedicated sitting and counts first answered questions only', async () => {
    state.sittings = [{ ...sitting, kind: 'rc', section: 1 }];
    state.rc = [{ id: 'rc-child', config: { timedSectionSittingId: id }, status: 'in_progress' }];
    state.attempts = [{ isFirstAttempt: true, selected: 'A' }, { isFirstAttempt: true, selected: null }, { isFirstAttempt: false, selected: 'B' }];
    expect(await listPracticeSectionAttempts(owner)).toEqual([expect.objectContaining({ kind: 'rc-section', answered: 1, href: `/testing/sections/${id}` })]);
  });
  it('does not expose abandoned or foreign owned rows and tolerates a backend before installation', async () => {
    state.sittings = [{ ...sitting, phase: 'abandoned' }, { ...sitting, owner_id: 'foreign' }];
    expect(await listPracticeSectionAttempts(owner)).toEqual([]);
    state.sittings = []; state.tableError = { code: '42P01' };
    expect(await listPracticeSectionAttempts(owner)).toEqual([]);
  });
});
