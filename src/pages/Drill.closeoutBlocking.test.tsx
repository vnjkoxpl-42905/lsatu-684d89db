import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrillRunSpec } from '@/lib/drillRunSpec';
import type { LRQuestion } from '@/lib/questionLoader';
import type { Persistence } from '@/bootcamps/main-conclusion/persistence/Persistence';

const state = vi.hoisted(() => ({
  failAttemptInsert: false,
  attemptInsertCount: 0,
  sectionHistoryInsertCount: 0,
  resumeCompleteCalls: [] as Array<string | null>,
  persistSectionCalls: 0,
  emailCalls: 0,
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => state.toastError(...args),
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@rrweb/record', () => ({ record: () => () => {} }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '11111111-1111-4111-8111-111111111111' }, authReady: true, session: null }),
}));
vi.mock('@/hooks/useClassId', () => ({
  useClassId: () => ({ classId: 'class-1', loading: false, error: null }),
}));
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ is_admin: false }),
}));
vi.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({
    settings: { allowRepeats: true, preferUnseen: false, recycleAfterDays: 0, showContrast: false },
  }),
}));
vi.mock('@/contexts/QuestionBankContext', () => ({
  useQuestionBank: () => ({ isLoading: false }),
}));
vi.mock('@/contexts/AdaptiveEngineContext', () => ({
  useAdaptiveEngine: () => ({
    recordAttempt: vi.fn(),
    ensureHydratedFromDB: vi.fn(async () => {}),
    getHydrationStatus: () => 'hydrated',
    getRecentAttempts: () => [],
    buildStudentProfile: () => ({}),
  }),
}));
vi.mock('@/hooks/useHomeworkSets', () => ({ useHomeworkSet: () => ({ set: null }) }));
vi.mock('@/lib/questionExposure', () => ({
  getRecentExposureSet: async () => new Set<string>(),
  recordExposures: vi.fn(async () => {}),
}));
vi.mock('@/lib/wajService', () => ({ logWrongAnswer: vi.fn(async () => {}), logCorrectAnswer: vi.fn(async () => {}) }));
vi.mock('@/lib/lastActivity', () => ({ upsertLastActivity: vi.fn(async () => {}) }));
vi.mock('@/lib/todoActions', () => ({ completeLinkedTodo: vi.fn(async () => {}) }));
vi.mock('@/lib/practiceTestStore', () => ({
  isActivePracticeTestDevice: vi.fn(async () => true),
}));
vi.mock('@/lib/sectionHistorySave', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sectionHistorySave')>();
  return {
    ...actual,
    persistSectionResults: vi.fn(async (...args: Parameters<typeof actual.persistSectionResults>) => {
      state.persistSectionCalls += 1;
      return actual.persistSectionResults(...args);
    }),
    emailSectionReport: vi.fn(async () => {
      state.emailCalls += 1;
    }),
  };
});
vi.mock('@/lib/drillResumeSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/drillResumeSession')>();
  return {
    ...actual,
    saveDrillResumeSnapshot: async () => undefined,
    completeDrillResumeSession: async (
      userId: string,
      key: string | null,
      snapshot: Parameters<typeof actual.completeDrillResumeSession>[2],
    ) => {
      state.resumeCompleteCalls.push(key);
      return actual.completeDrillResumeSession(userId, key, snapshot);
    },
  };
});

vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit', 'upsert', 'update', 'delete', 'gte', 'lte', 'is', 'not', 'or']) {
      c[m] = self;
    }
    c.maybeSingle = async () => ({ data: null, error: null });
    c.single = async () => ({ data: null, error: null });
    c.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
    return c;
  };
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'attempts') {
          return {
            ...chain(),
            insert: async () => {
              state.attemptInsertCount += 1;
              if (state.failAttemptInsert) {
                return { error: { message: 'attempt write failed (boom)' } };
              }
              return { error: null };
            },
          };
        }
        if (table === 'section_history') {
          return {
            ...chain(),
            insert: () => ({
              select: () => ({
                single: async () => {
                  state.sectionHistoryInsertCount += 1;
                  return { data: { id: 'hist-pt-1' }, error: null };
                },
              }),
            }),
          };
        }
        return { ...chain(), insert: async () => ({ error: null }) };
      },
      auth: {
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({
          data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
          error: null,
        }),
      },
      rpc: async () => ({ data: null, error: null }),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
    },
  };
});

import Drill from './Drill';
import { DrillRunSpecProvider } from '@/components/drill/DrillRunSpecContext';
import { questionBank } from '@/lib/questionLoader';
import { __setPersistenceForTests } from '@/bootcamps/main-conclusion/persistence/factory';

function memoryPersistence(): Persistence {
  const rows = new Map<string, unknown>();
  const tx = {
    get: async <T,>(t: string, id: string) => (rows.get(`${t}/${id}`) as T) ?? null,
    set: async <T,>(t: string, id: string, r: T) => {
      rows.set(`${t}/${id}`, r);
    },
  };
  return {
    ready: async () => {},
    get: tx.get,
    set: tx.set,
    remove: async (t, id) => { rows.delete(`${t}/${id}`); },
    list: async () => [],
    putBlob: async () => {},
    getBlob: async () => null,
    removeBlob: async () => {},
    transaction: async (fn) => fn(tx),
  };
}

const Q1: LRQuestion = {
  qid: 'PT23-S2-Q18',
  pt: 23,
  section: 2,
  qnum: 18,
  qtype: 'Strengthen',
  difficulty: 3,
  stimulus: 'Stimulus 18: Television helps explain urban changes.',
  questionStem: 'Stem 18: Which one of the following most supports the claim?',
  answerChoices: {
    A: 'Choice A of 18',
    B: 'Choice B of 18',
    C: 'Choice C of 18',
  },
  correctAnswer: 'B',
  reasoningType: [],
  questionFeatures: [],
} as unknown as LRQuestion;

function renderWithSpec(spec: DrillRunSpec, path = '/drill') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function LocationProbe() {
    const loc = useLocation();
    return <output data-testid="location-path">{loc.pathname}</output>;
  }
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <DrillRunSpecProvider spec={spec}>
          <Drill />
          <LocationProbe />
        </DrillRunSpecProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Answered-correct attempt write failure blocks close-out (DoD 9)', () => {
  beforeEach(() => {
    const map = (questionBank as unknown as { questions: Map<string, LRQuestion> }).questions;
    map.clear();
    map.set(Q1.qid, Q1);
    state.failAttemptInsert = true;
    state.attemptInsertCount = 0;
    state.sectionHistoryInsertCount = 0;
    state.resumeCompleteCalls = [];
    state.persistSectionCalls = 0;
    state.emailCalls = 0;
    state.toastError.mockReset();
    window.localStorage.clear();
    __setPersistenceForTests(memoryPersistence());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    __setPersistenceForTests(null);
    vi.restoreAllMocks();
  });

  it('blocks practice-test leg completion when an answered-correct attempt fails to write', async () => {
    const ptLegSpec: DrillRunSpec = {
      launchKind: 'section',
      mode: 'full-section',
      config: { pt: 23, section: 2, timer: { mode: 'unlimited' } } as DrillRunSpec['config'],
      ptRun: { runId: 'run-dod9', legIndex: 0 },
      returnTo: '/testing/test/run-dod9',
      sealed: true,
    };

    renderWithSpec(ptLegSpec, '/drill?drill=section&pt=23&section=2');
    await screen.findByText(/Stimulus 18:/, {}, { timeout: 4000 });

    // Select the CORRECT choice (B)
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Complete Section' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit anyway' }));

    await waitFor(() => expect(state.attemptInsertCount).toBe(1));
    await waitFor(() =>
      expect(screen.getByTestId('location-path')).toHaveTextContent('/testing/test/run-dod9'),
    );

    expect(state.persistSectionCalls).toBe(0);
    expect(state.sectionHistoryInsertCount).toBe(0);
    expect(state.resumeCompleteCalls).toEqual([]);
    expect(state.emailCalls).toBe(0);
  });

  it('blocks practice-set completion when an answered-correct attempt fails to write', async () => {
    const unhandledErrors: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandledErrors.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);

    try {
      const practiceSetSpec: DrillRunSpec = {
        launchKind: 'filter',
        mode: 'type-drill',
        config: { qtypes: [], difficulties: [], pts: [], count: 1, selectedQids: [Q1.qid] },
        sealed: false,
      };

      renderWithSpec(practiceSetSpec, '/drill?drill=practice-set');
      await screen.findByText(/Stimulus 18:/, {}, { timeout: 4000 });

      // Select the CORRECT choice (B) on the single-question practice set and advance to finish
      fireEvent.click(screen.getByRole('button', { name: 'B' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      await waitFor(() => expect(state.attemptInsertCount).toBe(1));
      await waitFor(() =>
        expect(state.toastError).toHaveBeenCalledWith(
          'Failed to save practice-set attempts. Your progress may be incomplete.',
        ),
      );

      // Must NOT finalize resume session or transition to practice-set results
      expect(state.resumeCompleteCalls).toEqual([]);
      expect(screen.getByText(/Stimulus 18:/)).toBeInTheDocument();
      expect(state.persistSectionCalls).toBe(0);
      expect(unhandledErrors.some((e) => e instanceof Error && e.message.includes('attempt write failed'))).toBe(true);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
