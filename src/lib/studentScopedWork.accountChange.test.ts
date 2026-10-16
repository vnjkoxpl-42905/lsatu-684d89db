import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ authCalls: 0, switchAccount: false }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => {
        state.authCalls += 1;
        const id = state.switchAccount && state.authCalls > 1 ? 'other-account' : 'teacher';
        return { data: { user: { id } }, error: null };
      }),
    },
    from: (table: string) => {
      const result = table === 'user_roles'
        ? { data: { role: 'admin' }, error: null }
        : { data: [], error: null };
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  },
}));

vi.mock('@/hooks/useStudentAssignments', () => ({
  loadStudentAssignments: vi.fn(async () => []),
  loadStudentTAAssignments: vi.fn(async () => []),
}));
vi.mock('@/lib/guidedDrills', () => ({ listAssignmentsForStudent: vi.fn(async () => []) }));
vi.mock('@/features/activity-centre/api/activitiesClient', () => ({ listStudentAssignments: vi.fn(async () => []) }));
vi.mock('@/lib/studentWorkEvidence', () => ({
  loadAssignmentWorkEvidence: vi.fn(async () => ({ guided: {}, homework: {} })),
  loadActivityWorkEvidence: vi.fn(async () => new Set()),
}));

import { loadScopedOwnedAssignmentSources, loadScopedStudentWorkSources } from './studentScopedWork';

const scope = { mode: 'selected_student' as const, actorId: 'teacher', studentId: 'student' };

beforeEach(() => {
  state.authCalls = 0;
  state.switchAccount = false;
});

describe('assignment source account changes', () => {
  it.each([loadScopedStudentWorkSources, loadScopedOwnedAssignmentSources])(
    'does not publish selected-student rows after the signed-in account changes',
    async (load) => {
      state.switchAccount = true;
      await expect(load(scope)).rejects.toThrow('signed-in account changed');
      expect(state.authCalls).toBe(2);
    },
  );

  it.each([loadScopedStudentWorkSources, loadScopedOwnedAssignmentSources])(
    'returns selected-student rows while the actor remains signed in',
    async (load) => {
      await expect(load(scope)).resolves.toMatchObject({ actorId: 'teacher', studentId: 'student' });
      expect(state.authCalls).toBe(2);
    },
  );
});
