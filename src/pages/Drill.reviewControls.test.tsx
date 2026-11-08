/**
 * Drill-level tests for the review controls (LSAT Lab shape) on the official
 * surface: a guided drill (`fixed` + `list`), a filter drill (`fixed` +
 * `commit`), and the legacy full-section behaviour, which must not change.
 *
 * The page is rendered for real. Everything that would reach a network is
 * mocked at the module edge: auth, class id, the Supabase client (attempt
 * inserts are counted), the authored explanation query, and rrweb.
 */
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrillRunSpec } from '@/lib/drillRunSpec';
import type { LRQuestion } from '@/lib/questionLoader';

const insertCalls = vi.hoisted(() => ({ attempts: [] as Array<Record<string, unknown>>, failNext: 0, delayMs: 0 }));
const resumeSave = vi.hoisted(() => ({ fail: false, failNext: 0, calls: 0 }));
const resumeLoad = vi.hoisted(() => ({ fail: false }));
const ledgerSave = vi.hoisted(() => ({ fail: false, created: 0 }));
const journalCalls = vi.hoisted(() => ({ wrong: vi.fn(), correct: vi.fn() }));
const guidedCompletion = vi.hoisted(() => ({
  updates: [] as Array<{ values: Record<string, unknown>; filters: Record<string, string> }>,
  linkedTodo: vi.fn(async (_id: string) => {}),
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
    selectSmartDrillQuestion: (questions: LRQuestion[]) => ({ question: questions[0] }),
  }),
}));
vi.mock('@/hooks/useHomeworkSets', () => ({ useHomeworkSet: () => ({ set: null }) }));
vi.mock('@/lib/questionExposure', () => ({
  getRecentExposureSet: async () => new Set<string>(),
  recordExposures: vi.fn(async () => {}),
}));
vi.mock('@/lib/wajService', () => ({
  logWrongAnswer: journalCalls.wrong,
  logCorrectAnswer: journalCalls.correct,
}));
vi.mock('@/lib/lastActivity', () => ({ upsertLastActivity: vi.fn(async () => {}) }));
vi.mock('@/lib/todoActions', () => ({ completeLinkedTodo: guidedCompletion.linkedTodo }));
vi.mock('@/lib/drillResumeSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/drillResumeSession')>();
  return {
    ...actual,
    loadDrillResumeSession: async (...args: Parameters<typeof actual.loadDrillResumeSession>) => {
      if (resumeLoad.fail) throw new Error('offline');
      return actual.loadDrillResumeSession(...args);
    },
    saveDrillResumeSnapshot: async () => {
      resumeSave.calls += 1;
      if (resumeSave.fail || resumeSave.failNext > 0) {
        if (resumeSave.failNext > 0) resumeSave.failNext -= 1;
        throw new Error('The account save failed.');
      }
      // Navigation tests control account acknowledgments explicitly. The
      // real adapter needs IndexedDB, which jsdom does not provide.
      return undefined;
    },
  };
});
vi.mock('@/lib/drillRunLedger', () => ({
  createStandaloneDrillRun: vi.fn(async () => {
    if (ledgerSave.fail) throw new Error('offline');
    ledgerSave.created += 1;
    return { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' };
  }),
  loadStandaloneDrillRun: vi.fn(async () => null),
  listStandaloneDrillRuns: vi.fn(async () => []),
  saveStandaloneDrillRun: vi.fn(async () => ({})),
  completeStandaloneDrillRun: vi.fn(async () => ({})),
  beginGuidedDrillCloseout: vi.fn(async (_userId, _runId, snapshot) => ({ closeout_attempts: snapshot.attempts })),
}));
vi.mock('@/lib/questionPoolService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/questionPoolService')>();
  return {
    ...actual,
    QuestionPoolService: {
      filterQuestionPool: (qs: unknown[]) => ({ available: qs, exhausted: false }),
      getPoolStatus: async () => null,
      getQuestionUsage: async () => new Map(),
      markQuestionSeen: vi.fn(),
      markViewAnswered: vi.fn(),
      resetPool: vi.fn(),
      trackQuestionView: vi.fn(async () => null),
    },
  };
});
vi.mock('@/hooks/useLrExplanation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useLrExplanation')>();
  return {
    ...actual,
    useLrExplanation: (_q: unknown, enabled: boolean) => ({
      data: enabled
        ? {
            questionId: 'x',
            preptest: 23,
            section: 2,
            questionNumber: 18,
            questionType: 'Strengthen',
            correctChoice: 'B',
            choices: [
              { letter: 'A', text: '', tag: 'Out of Scope', studentPercent: 12, isCorrect: false },
              { letter: 'B', text: '', tag: 'Correct', studentPercent: 58, isCorrect: true },
            ],
            styles: [
              {
                style: 'standard',
                label: 'Standard',
                steps: [{ position: 1, label: 'Conclusion', body: 'TV explains the rise.' }],
                notesByLetter: { A: 'A is out of scope.', B: 'B adds plausibility.' },
              },
            ],
            hasAuthored: true,
          }
        : undefined,
      isLoading: false,
      isError: false,
    }),
  };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    const self = () => c;
    for (const m of ['select', 'eq', 'in', 'order', 'limit', 'upsert', 'update', 'delete', 'gte', 'lte', 'is', 'not', 'or']) {
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
        if (table === 'guided_drill_assignments') {
          return {
            ...chain(),
            update: (values: Record<string, unknown>) => {
              const filters: Record<string, string> = {};
              const query = {
                eq: (field: string, value: string) => {
                  filters[field] = value;
                  return query;
                },
                then: (resolve: (value: unknown) => void) => {
                  guidedCompletion.updates.push({ values, filters });
                  resolve({ error: null });
                },
              };
              return query;
            },
          };
        }
        if (table === 'attempts') {
          return {
            ...chain(),
            insert: async (row: Record<string, unknown>) => {
              if (insertCalls.delayMs) await new Promise((r) => setTimeout(r, insertCalls.delayMs));
              if (insertCalls.failNext > 0) {
                insertCalls.failNext -= 1;
                return { error: { message: 'insert failed (boom)' } };
              }
              insertCalls.attempts.push(row);
              return { error: null };
            },
          };
        }
        return { ...chain(), insert: async () => ({ error: null }) };
      },
      auth: { getSession: async () => ({ data: { session: null } }) },
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
import type { Persistence } from '@/bootcamps/main-conclusion/persistence/Persistence';

/**
 * The Run Record store, in memory. The real adapter for a signed-in user is
 * Supabase-synced; this keeps the record where the test can read it.
 */
function memoryPersistence(): Persistence & { rows: Map<string, unknown> } {
  const rows = new Map<string, unknown>();
  const k = (table: string, id: string) => `${table}/${id}`;
  const tx = {
    get: async <T,>(table: string, id: string) => (rows.get(k(table, id)) as T) ?? null,
    set: async <T,>(table: string, id: string, record: T) => {
      rows.set(k(table, id), record);
    },
  };
  return {
    rows,
    ready: async () => {},
    get: tx.get,
    set: tx.set,
    remove: async (table, id) => {
      rows.delete(k(table, id));
    },
    list: async <T,>(table: string) =>
      Array.from(rows.entries())
        .filter(([key]) => key.startsWith(`${table}/`))
        .map(([, v]) => v as T),
    putBlob: async () => {},
    getBlob: async () => null,
    removeBlob: async () => {},
    transaction: async (fn) => fn(tx),
  };
}
let store = memoryPersistence();

function makeQuestion(qnum: number, correct: string): LRQuestion {
  return {
    qid: `PT23-S2-Q${qnum}`,
    pt: 23,
    section: 2,
    qnum,
    qtype: 'Strengthen',
    difficulty: 3,
    stimulus: `Stimulus ${qnum}: The advent of television helps to explain the rise in urban homicide.`,
    questionStem: `Stem ${qnum}: Which one of the following most supports the argument?`,
    answerChoices: {
      A: `Choice A of ${qnum}`,
      B: `Choice B of ${qnum}`,
      C: `Choice C of ${qnum}`,
    },
    correctAnswer: correct,
    reasoningType: [],
    questionFeatures: [],
  } as unknown as LRQuestion;
}

const Q1 = makeQuestion(18, 'B');
const Q2 = makeQuestion(19, 'A');

function seedBank() {
  const map = (questionBank as unknown as { questions: Map<string, LRQuestion> }).questions;
  map.clear();
  map.set(Q1.qid, Q1);
  map.set(Q2.qid, Q2);
}

function renderDrill(spec: DrillRunSpec, search = '') {
  function LocationProbe() {
    const location = useLocation();
    return <output data-testid="location-path">{location.pathname}</output>;
  }

  return render(
    <MemoryRouter initialEntries={[`/drill${search}`]}>
      <DrillRunSpecProvider spec={spec}>
        <Drill />
        <LocationProbe />
      </DrillRunSpecProvider>
    </MemoryRouter>,
  );
}

const guidedSpec: DrillRunSpec = {
  launchKind: 'guided-drill',
  mode: 'type-drill',
  config: { qtypes: [], difficulties: [], pts: [], count: 2, selectedQids: [Q1.qid, Q2.qid] },
  isGuidedDrill: true,
  sealed: false,
};

const guidedEndSpec: DrillRunSpec = {
  ...guidedSpec,
  guidedAssignmentId: 'test-end-persist',
};

const filterSpec: DrillRunSpec = {
  launchKind: 'filter',
  mode: 'type-drill',
  config: { qtypes: ['Strengthen'], difficulties: [], pts: [23], count: 2 },
  sealed: false,
};

const adaptiveSpec: DrillRunSpec = {
  launchKind: 'smart-drill',
  mode: 'adaptive',
  config: { qtypes: [], difficulties: [], pts: [], count: 10 },
  sealed: false,
};

const sectionSpec: DrillRunSpec = {
  launchKind: 'section',
  mode: 'full-section',
  config: { pt: 23, section: 2, timer: { mode: 'unlimited' } } as DrillRunSpec['config'],
  sealed: false,
};

async function waitForQuestion(qnum: number) {
  await screen.findByText(new RegExp(`Stimulus ${qnum}:`), {}, { timeout: 4000 });
}

const choiceButton = (letter: string) => screen.getByRole('button', { name: letter });
const choiceBlock = (letter: string, qnum: number) => {
  const el = screen.getByText(`Choice ${letter} of ${qnum}`).closest("[id^='choice-']");
  if (!(el instanceof HTMLElement)) throw new Error('no choice block');
  return el;
};

beforeEach(() => {
  seedBank();
  insertCalls.attempts = [];
  insertCalls.failNext = 0;
  insertCalls.delayMs = 0;
  resumeSave.fail = false;
  resumeSave.failNext = 0;
  resumeSave.calls = 0;
  resumeLoad.fail = false;
  ledgerSave.fail = false;
  ledgerSave.created = 0;
  journalCalls.wrong.mockReset();
  journalCalls.correct.mockReset();
  journalCalls.wrong.mockResolvedValue(undefined);
  journalCalls.correct.mockResolvedValue(undefined);
  guidedCompletion.updates = [];
  guidedCompletion.linkedTodo.mockClear();
  window.localStorage.clear();
  store = memoryPersistence();
  __setPersistenceForTests(store);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterEach(() => {
  __setPersistenceForTests(null);
  vi.restoreAllMocks();
});

describe('Drill review controls — guided drill (fixed + list)', () => {
  it('has no Submit pill, and Answer / Explanation are independent and never lock or ask', async () => {
    renderDrill(guidedSpec);
    await waitForQuestion(18);

    expect(screen.queryByRole('button', { name: /^Submit$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

    // Answer with no pick: reveals at once, no dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(choiceBlock('B', 18)).toHaveClass('text-green-900');
    expect(screen.getByRole('button', { name: 'Hide Answer' })).toBeInTheDocument();

    // Choices stay live: a pick after the reveal is recorded, and coloured red.
    fireEvent.click(choiceButton('A'));
    expect(choiceBlock('A', 18)).toHaveClass('text-red-900');

    // Answer off: colour gone, pick stays.
    fireEvent.click(screen.getByRole('button', { name: 'Hide Answer' }));
    expect(choiceBlock('B', 18)).not.toHaveClass('text-green-900');
    expect(choiceButton('A')).toHaveClass('bg-[#1f3a5f]');

    // Explanation: expanders only, drawer stays closed, no dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Explanation' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show argument breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show explanation for B' })).toBeInTheDocument();
    expect(screen.queryByText('TV explains the rise.')).not.toBeInTheDocument();
    expect(screen.queryByText('B adds plausibility.')).not.toBeInTheDocument();
    // The drawer did not open on its own: its tab is still unselected and its
    // placeholder never rendered.
    expect(screen.queryByText('Press Explanation to open the written explanation.')).not.toBeInTheDocument();
    for (const tab of screen.queryAllByRole('tab', { name: /Explanation/ })) {
      expect(tab).toHaveAttribute('aria-selected', 'false');
    }

    fireEvent.click(screen.getByRole('button', { name: 'Show argument breakdown' }));
    expect(screen.getByText('TV explains the rise.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show explanation for B' }));
    expect(screen.getByText('B adds plausibility.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide Explanation' }));
    expect(screen.queryByText('TV explains the rise.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /explanation for/ })).not.toBeInTheDocument();

    // Reset Response clears the pick and leaves the pills alone.
    fireEvent.click(screen.getByRole('button', { name: 'Reset Response' }));
    expect(choiceButton('A')).not.toHaveClass('bg-[#1f3a5f]');
    expect(screen.getByRole('button', { name: 'Reset Response' })).toBeDisabled();

    // Nothing was persisted per question: a list drill saves at the end.
    expect(insertCalls.attempts).toHaveLength(0);
  });

  it('End persists the list-model session before completing the drill', async () => {
    renderDrill(guidedEndSpec);
    await waitForQuestion(18);

    fireEvent.click(choiceButton('C'));
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish drill' }));

    await waitFor(() => expect(insertCalls.attempts).toHaveLength(1));
    expect(insertCalls.attempts[0]).toMatchObject({ qid: Q1.qid, selected_answer: 'C' });
    expect(await screen.findByText(/Section Complete/i)).toBeInTheDocument();
    await waitFor(() => expect(guidedCompletion.updates).toHaveLength(1));
    expect(guidedCompletion.updates[0]).toMatchObject({
      values: { status: 'completed', completed_at: expect.any(String) },
      filters: { id: 'test-end-persist', student_id: '11111111-1111-4111-8111-111111111111' },
    });
    expect(guidedCompletion.linkedTodo).toHaveBeenCalledWith('test-end-persist');
  });

  it('marks the assigned guided drill complete after finishing its last question', async () => {
    renderDrill(guidedEndSpec);
    await waitForQuestion(18);
    fireEvent.click(choiceButton('B'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitForQuestion(19);
    fireEvent.click(choiceButton('C'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(guidedCompletion.updates).toHaveLength(1));
    expect(guidedCompletion.updates[0].filters).toEqual({
      id: 'test-end-persist',
      student_id: '11111111-1111-4111-8111-111111111111',
    });
    expect(guidedCompletion.linkedTodo).toHaveBeenCalledWith('test-end-persist');
  });
});

describe('Drill review controls — filter drill (fixed + commit)', () => {
  it('resumes saved manual conditions despite a changed layout URL and keeps old answers unknown', async () => {
    const sourceKey = 'drill::type-drill::original-filter';
    const saved = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user_id: '11111111-1111-4111-8111-111111111111',
      source_key: sourceKey, mode: 'type-drill', label: 'Original filter',
      provenance: { version: 1, study_mode: 'training', feedback: 'manual_answer_and_explanation',
        source_key: sourceKey, launch_kind: 'filter', pick_model: 'commit', layout: 'official' },
      session: { status: 'in_progress', question_queue: [Q1.qid, Q2.qid], current_index: 1,
        attempts: [{ qid: Q1.qid, selected_answer: 'A', correct: false, time_ms: 1200 }] },
    } as unknown as import('@/lib/drillRunLedger').StandaloneDrillRun;
    renderDrill({ ...filterSpec, savedStandaloneRun: saved }, '?run=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&layout=classic');
    await waitForQuestion(19);
    expect(screen.getByRole('note')).toHaveTextContent('Training · Answers and explanations appear when you choose to reveal them.');
    expect(screen.getByRole('button', { name: 'Answer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Submit$/ })).not.toBeInTheDocument();
    fireEvent.click(choiceButton('C'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const { saveStandaloneDrillRun, completeStandaloneDrillRun } = await import('@/lib/drillRunLedger');
    await waitFor(() => expect(completeStandaloneDrillRun).toHaveBeenCalled());
    const calls = vi.mocked(saveStandaloneDrillRun).mock.calls;
    const snapshot = calls.at(-1)?.[2];
    expect(snapshot?.attempts.find(a => a.qid === Q1.qid)?.provenance).toBeUndefined();
    expect(snapshot?.attempts.find(a => a.qid === Q2.qid)?.provenance).toMatchObject({ source_key: sourceKey, feedback: 'manual_answer_and_explanation' });
    expect(ledgerSave.created).toBe(0);
  });

  it('keeps the picked question in place when its account run cannot be created', async () => {
    ledgerSave.fail = true;
    renderDrill(filterSpec);
    await screen.findByText(/Stimulus 1[89]:/, {}, { timeout: 4000 });
    const before = screen.getByText(/Stimulus 1[89]:/).textContent;
    fireEvent.click(choiceButton('C'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(console.error).toHaveBeenCalledWith('[drill:run] account save failed', expect.any(Error)));
    expect(screen.getByText(/Stimulus 1[89]:/).textContent).toBe(before);
    expect(choiceButton('C')).toHaveClass('bg-[#1f3a5f]');
    expect(ledgerSave.created).toBe(0);
  });

  it('the arrow commits once, and a pill press never commits', async () => {
    renderDrill(filterSpec);
    await screen.findByText(/Stimulus 1[89]:/, {}, { timeout: 4000 });
    const firstQnum = screen.getByText(/Stimulus 1[89]:/).textContent?.includes('18') ? 18 : 19;

    expect(screen.queryByRole('button', { name: /^Submit$/ })).not.toBeInTheDocument();
    fireEvent.click(choiceButton('A'));
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(insertCalls.attempts).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(insertCalls.attempts).toHaveLength(1));
    expect(insertCalls.attempts[0]).toMatchObject({ qid: `PT23-S2-Q${firstQnum}`, selected_answer: 'A' });
    await screen.findByText(new RegExp(`Stimulus ${firstQnum === 18 ? 19 : 18}:`), {}, { timeout: 4000 });
  });

  it('a double arrow persists once and moves once', async () => {
    insertCalls.delayMs = 60;
    renderDrill(filterSpec);
    await screen.findByText(/Stimulus 1[89]:/, {}, { timeout: 4000 });
    fireEvent.click(choiceButton('B'));
    const next = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(next);
    fireEvent.click(next);
    await waitFor(() => expect(insertCalls.attempts).toHaveLength(1), { timeout: 3000 });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150));
    });
    expect(insertCalls.attempts).toHaveLength(1);
    // Moved exactly one question: the other of the two is on screen and the
    // drill has not finished.
    expect(screen.getByText(/Stimulus 1[89]:/)).toBeInTheDocument();
    expect(screen.queryByText(/Section Complete|Practice Set Complete/i)).not.toBeInTheDocument();
  });

  it('a failed save leaves the question in place with its pick and writes nothing', async () => {
    insertCalls.failNext = 1;
    renderDrill(filterSpec);
    await screen.findByText(/Stimulus 1[89]:/, {}, { timeout: 4000 });
    const before = screen.getByText(/Stimulus 1[89]:/).textContent;
    fireEvent.click(choiceButton('C'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByText(/Stimulus 1[89]:/).textContent).toBe(before);
    expect(choiceButton('C')).toHaveClass('bg-[#1f3a5f]');
    expect(insertCalls.attempts).toHaveLength(0);
    const failures = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      (c) => c[0] === '[drill:commit-failed]',
    );
    expect(failures.length).toBeGreaterThanOrEqual(1);
  });

  it('End commits the pending pick before completing the drill', async () => {
    renderDrill(filterSpec);
    await screen.findByText(/Stimulus 1[89]:/, {}, { timeout: 4000 });
    const qid = screen.getByText(/Stimulus 1[89]:/).textContent?.includes('18') ? Q1.qid : Q2.qid;

    fireEvent.click(choiceButton('C'));
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, leave' }));

    await waitFor(() => expect(insertCalls.attempts).toHaveLength(1));
    expect(insertCalls.attempts[0]).toMatchObject({ qid, selected_answer: 'C' });
    expect(await screen.findByText(/Section Complete/i)).toBeInTheDocument();
    expect(screen.getByTestId('location-path')).toHaveTextContent('/drill');
  });

  it('a delayed right arrow followed by End performs only the arrow transition', async () => {
    insertCalls.delayMs = 60;
    renderDrill(filterSpec);
    await screen.findByText(/Stimulus 1[89]:/, {}, { timeout: 4000 });
    const firstStimulus = screen.getByText(/Stimulus 1[89]:/).textContent;

    fireEvent.click(choiceButton('B'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'End' }));

    await waitFor(() => expect(insertCalls.attempts).toHaveLength(1), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText(/Stimulus 1[89]:/).textContent).not.toBe(firstStimulus));
    expect(screen.queryByRole('dialog', { name: 'Leave drill session?' })).not.toBeInTheDocument();
    expect(screen.getByTestId('location-path')).toHaveTextContent('/drill');
  });
});

describe('Drill review controls — Smart Drill (adaptive)', () => {
  it('logs a wrong adaptive answer in the Wrong Answer Journal', async () => {
    renderDrill(adaptiveSpec);
    await waitForQuestion(18);

    fireEvent.click(choiceButton('A'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(journalCalls.wrong).toHaveBeenCalledTimes(1));
    expect(journalCalls.wrong).toHaveBeenCalledWith(
      expect.objectContaining({
        class_id: 'class-1',
        qid: Q1.qid,
        chosen_answer: 'A',
        correct_answer: 'B',
      }),
    );
  });

  it('keeps choices live after auto-reveal without writing a second attempt', async () => {
    renderDrill(adaptiveSpec);
    await waitForQuestion(18);

    fireEvent.click(choiceButton('A'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(insertCalls.attempts).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();

    fireEvent.click(choiceButton('C'));
    expect(choiceButton('C')).toHaveClass('bg-red-500');
    expect(choiceButton('A')).not.toHaveClass('bg-red-500');
    expect(insertCalls.attempts).toHaveLength(1);
  });
});

describe('Drill review controls — full section keeps the legacy behaviour', () => {
  it('hides the questions and offers account-load retry when hydration fails', async () => {
    resumeLoad.fail = true;
    renderDrill(sectionSpec);
    expect(await screen.findByRole('heading', { name: 'Your drill is paused' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry loading drill' })).toBeInTheDocument();
    expect(screen.queryByText(/Stimulus 18:/)).not.toBeInTheDocument();
    expect(resumeSave.calls).toBe(0);
  });

  it('does not automatically save a recovered device copy before Retry save', async () => {
    const { writeSectionDeviceBackup } = await import('@/lib/drillResumeSession');
    writeSectionDeviceBackup('11111111-1111-4111-8111-111111111111', 'drill::section::pt23-s2', {
      questionQueue: [Q1.qid, Q2.qid], currentIndex: 0, attempts: [], elapsedMs: 9000, timerMode: '35',
    });
    renderDrill({ ...sectionSpec, config: { pt: 23, section: 2, timer: { mode: '35' } } as DrillRunSpec['config'] });
    expect(await screen.findByRole('alertdialog', { name: 'Saving paused this section' })).toBeInTheDocument();
    expect(resumeSave.calls).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(resumeSave.calls).toBeGreaterThan(0));
    await waitFor(() => expect(screen.queryByRole('alertdialog', { name: 'Saving paused this section' })).not.toBeInTheDocument());
  });

  it.each(['Next', 'question index', 'keyboard'])(
    'keeps the current timed question when %s cannot save to the account',
    async (navigation) => {
      renderDrill({
        ...sectionSpec,
        config: { pt: 23, section: 2, timer: { mode: '35' } } as DrillRunSpec['config'],
      });
      await waitForQuestion(18);
      await waitFor(() => expect(resumeSave.calls).toBeGreaterThan(0));
      const initialSaves = resumeSave.calls;
      fireEvent.click(choiceButton('B'));
      await waitFor(() => expect(resumeSave.calls).toBeGreaterThan(initialSaves));
      resumeSave.failNext = 1;
      if (navigation === 'Next') {
        fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
      } else if (navigation === 'question index') {
        fireEvent.click(screen.getByRole('button', { name: 'Question 19' }));
      } else {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
      }
      expect(await screen.findByRole('alertdialog', { name: 'Saving paused this section' })).toBeInTheDocument();
      expect(screen.getByText(/Stimulus 18:/)).toBeInTheDocument();
      expect(screen.getByText('Choice B of 18')).toBeInTheDocument();
      expect(screen.queryByText(/Stimulus 19:/)).not.toBeInTheDocument();
    },
  );

  it('pauses a timed section when its account snapshot cannot be saved', async () => {
    resumeSave.fail = true;
    renderDrill({
      ...sectionSpec,
      config: { pt: 23, section: 2, timer: { mode: '35' } } as DrillRunSpec['config'],
    });
    await waitForQuestion(18);
    expect(await screen.findByRole('alertdialog', { name: 'Saving paused this section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume Section', hidden: true })).toBeInTheDocument();
  });

  it('Answer is gated until the question is attempted and Explanation opens the drawer', async () => {
    renderDrill(sectionSpec);
    await waitForQuestion(18);
    const answer = screen.getByRole('button', { name: 'Answer' });
    expect(answer).toBeDisabled();
    fireEvent.click(choiceButton('B'));
    expect(screen.getByRole('button', { name: 'Answer' })).not.toBeDisabled();
    // No Reset Response and no expanders on the legacy surface.
    expect(screen.queryByRole('button', { name: 'Reset Response' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(choiceBlock('B', 18)).toHaveClass('text-green-900');
    // The legacy reveal locks the choices.
    expect(choiceButton('A')).toBeDisabled();
  });
});

describe('Drill — the AI Tutor is off', () => {
  it('a wrong pick on a fixed drill never opens the Coach', async () => {
    renderDrill(guidedSpec);
    await waitForQuestion(18);
    fireEvent.click(choiceButton('A'));
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByText(/Ask Joshua/)).not.toBeInTheDocument();
    expect(screen.queryByText(/having trouble connecting/i)).not.toBeInTheDocument();
    expect(within(document.body).queryByRole('dialog', { name: /coach|tutor/i })).not.toBeInTheDocument();
  });
});
