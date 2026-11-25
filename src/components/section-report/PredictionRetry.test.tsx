import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrillRunSpec } from '@/lib/drillRunSpec';
import type { LRQuestion } from '@/lib/questionLoader';
import type { Persistence } from '@/bootcamps/main-conclusion/persistence/Persistence';
import type { SectionHistoryRow } from '@/lib/sectionHistory';

const rpcMock = vi.hoisted(() => ({
  predictionFails: 0,
  predictionCalls: [] as Array<{ historyId: string; score: number }>,
  reportFetchCount: 0,
  emails: [] as Array<Record<string, unknown>>,
  opens: [] as Array<Record<string, unknown>>,
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => rpcMock.toastError(...args),
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
vi.mock('@/lib/drillResumeSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/drillResumeSession')>();
  return {
    ...actual,
    saveDrillResumeSnapshot: async () => undefined,
  };
});
vi.mock('@/lib/sectionReviewRecord', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sectionReviewRecord')>();
  return {
    ...actual,
    saveSectionPrediction: async (historyId: string, predictedScore: number) => {
      rpcMock.predictionCalls.push({ historyId, score: predictedScore });
      if (rpcMock.predictionFails > 0) {
        rpcMock.predictionFails -= 1;
        throw new Error('prediction RPC offline');
      }
    },
  };
});
vi.mock('@/lib/sectionHistory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sectionHistory')>();
  return {
    ...actual,
    fetchOwnedSectionReport: async (_userId: string, historyId: string) => {
      rpcMock.reportFetchCount += 1;
      const savedPrediction =
        rpcMock.predictionCalls.length > 0 && rpcMock.predictionFails === 0
          ? 18
          : null;
      const row: SectionHistoryRow = {
        id: historyId,
        pt: 23,
        section: 2,
        mode: 'full-section',
        initialScore: 1,
        initialTotal: 20,
        initialPercent: 5,
        brUsed: false,
        brScore: null,
        brPercent: null,
        brDelta: null,
        totalTimeMs: 30_000,
        avgTimeMs: 1500,
        unansweredCount: 19,
        byQtype: {},
        byDifficulty: {},
        completedAt: '2026-11-23T12:00:00Z',
        predictedScore: savedPrediction,
        assignmentId: null,
        clientSittingId: '55555555-5555-4555-8555-555555555555',
        practiceTestRunId: null,
        releaseRequiresBr: false,
        questions: Array.from({ length: 20 }, (_, i) => ({
          qid: `PT23-S2-Q${i + 1}`,
          qnum: i + 1,
          qtype: 'Strengthen',
          difficulty: 3,
          initialAnswer: i === 0 ? 'B' : '—',
          correctAnswer: 'B',
          initialCorrect: i === 0,
          timeMs: i === 0 ? 30_000 : 0,
          flagged: false,
          switchCount: 0,
        })),
        analysis: null,
        analysisSource: 'first-pass',
        brResults: [],
      };
      return { state: 'released' as const, row };
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
      from: () => ({ ...chain(), insert: async () => ({ error: null }) }),
      auth: { getSession: async () => ({ data: { session: null } }) },
      rpc: async (fn: string, args?: Record<string, unknown>) => {
        if (fn === 'reconcile_standalone_section_v1') {
          return { data: { status: 'reconciled' }, error: null };
        }
        if (fn === 'open_section_sitting_v1') {
          rpcMock.opens.push(args ?? {});
          return {
            data: {
              status: 'open',
              sitting_id: args?.p_restart
                ? '66666666-6666-4666-8666-666666666666'
                : '55555555-5555-4555-8555-555555555555',
              generation: args?.p_restart ? 2 : 1,
              history_id: null,
              adopted: false,
              adopted_revision: null,
            },
            error: null,
          };
        }
        if (fn === 'close_standalone_section_v1') {
          return {
            data: {
              status: 'created',
              history_id: 'hist-pred-1',
              conflict: false,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      functions: {
        invoke: async (name: string, options: { body: Record<string, unknown> }) => {
          if (name === 'send-section-report') rpcMock.emails.push(options.body);
          return { data: { ok: true }, error: null };
        },
      },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
    },
  };
});

import Drill from '@/pages/Drill';
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

function seedTwentyQuestions() {
  const map = (questionBank as unknown as { questions: Map<string, LRQuestion> }).questions;
  map.clear();
  for (let qnum = 1; qnum <= 20; qnum++) {
    const qid = `PT23-S2-Q${qnum}`;
    map.set(qid, {
      qid,
      pt: 23,
      section: 2,
      qnum,
      qtype: 'Strengthen',
      difficulty: 3,
      stimulus: `Stimulus ${qnum}: Television coverage rose.`,
      questionStem: `Stem ${qnum}: Which most supports?`,
      answerChoices: { A: `Choice A ${qnum}`, B: `Choice B ${qnum}`, C: `Choice C ${qnum}` },
      correctAnswer: 'B',
      reasoningType: [],
      questionFeatures: [],
    } as unknown as LRQuestion);
  }
}

const sectionSpec: DrillRunSpec = {
  launchKind: 'section',
  mode: 'full-section',
  config: { pt: 23, section: 2, timer: { mode: 'unlimited' } } as DrillRunSpec['config'],
  sealed: false,
};

describe('Prediction save failure retry (F11)', () => {
  beforeEach(() => {
    seedTwentyQuestions();
    rpcMock.predictionFails = 0;
    rpcMock.emails = [];
    rpcMock.predictionCalls = [];
    rpcMock.reportFetchCount = 0;
    rpcMock.opens = [];
    rpcMock.toastError.mockReset();
    window.localStorage.clear();
    __setPersistenceForTests(memoryPersistence());
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    __setPersistenceForTests(null);
    vi.restoreAllMocks();
  });

  it('does not block progression when saving 18 fails, keeps 18 pending for explicit retry across complete and report screens, and clears after retry succeeds', async () => {
    rpcMock.predictionFails = 2;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/drill?drill=section&pt=23&section=2']}>
          <DrillRunSpecProvider spec={sectionSpec}>
            <Drill />
          </DrillRunSpecProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText(/Stimulus 1:/, {}, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: 'Complete Section' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit anyway' }));

    await screen.findByText('Section submitted', {}, { timeout: 4000 });
    fireEvent.change(screen.getByLabelText('Predicted score'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lock it in' }));

    await waitFor(() => expect(rpcMock.predictionCalls).toEqual([{ historyId: 'hist-pred-1', score: 18 }]));
    expect(await screen.findByText('Section complete')).toBeInTheDocument();

    // Non-blocking retry action on SectionComplete retaining score 18
    const retryOnComplete = await screen.findByRole('button', { name: 'Retry saving prediction' });
    expect(retryOnComplete).toBeInTheDocument();
    expect(screen.getByText(/18/)).toBeInTheDocument();

    // Progression continues to the report where retry remains available
    fireEvent.click(screen.getByRole('button', { name: 'Skip to results' }));
    expect(await screen.findByText('Section Results')).toBeInTheDocument();
    const retryOnReport = await screen.findByRole('button', { name: 'Retry saving prediction' });

    // A second failure keeps the retry action mounted
    fireEvent.click(retryOnReport);
    await waitFor(() => expect(rpcMock.predictionCalls).toHaveLength(2));
    expect(await screen.findByRole('button', { name: 'Retry saving prediction' })).toBeInTheDocument();

    // Succeeding on the third try persists 18 and clears the retry banner
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving prediction' }));
    await waitFor(() =>
      expect(rpcMock.predictionCalls).toEqual([
        { historyId: 'hist-pred-1', score: 18 },
        { historyId: 'hist-pred-1', score: 18 },
        { historyId: 'hist-pred-1', score: 18 },
      ]),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Retry saving prediction' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText(/You guessed 18/)).toBeInTheDocument();
  });

  it('starts exactly one retake from the immediate report on a double click', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/drill?drill=section&pt=23&section=2']}>
          <DrillRunSpecProvider spec={sectionSpec}>
            <Drill />
          </DrillRunSpecProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText(/Stimulus 1:/);
    fireEvent.click(screen.getByRole('button', { name: 'Complete Section' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Submit anyway' }));
    const skipPrediction = await screen.findByRole('button', { name: 'Skip' });
    expect(rpcMock.emails).toEqual([{ sectionHistoryId: expect.any(String) }]);
    fireEvent.click(skipPrediction);
    fireEvent.click(await screen.findByRole('button', { name: 'Skip to results' }));
    const action = await screen.findByRole('button', { name: 'Start over' });
    expect(rpcMock.emails).toHaveLength(1);
    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });
    await screen.findByText(/Stimulus 1:/);
    expect(rpcMock.opens.filter((request) => request.p_restart)).toEqual([
      expect.objectContaining({ p_expected_generation: 1 }),
    ]);
  });

  it('shows the prediction retry banner on SealedSectionReportView when a sealed assigned section failed to save prediction', async () => {
    const { SealedSectionReportView } = await import('@/components/section-report/SectionReportView');
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <SealedSectionReportView
          pt={23}
          section={2}
          reason="blind-review"
          onBack={vi.fn()}
          onStartBlindReview={vi.fn()}
          pendingPrediction={18}
          onRetryPrediction={onRetry}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Your prediction \(18\) did not save yet\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving prediction' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
