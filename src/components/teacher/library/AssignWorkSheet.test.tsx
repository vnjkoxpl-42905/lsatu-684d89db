import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignWorkSheet, type AssignWorkSheetItem } from './AssignWorkSheet';
import type { GuidedDrill } from '@/lib/guidedDrills';
import type { LRQuestion } from '@/lib/questionLoader';

const { mockAssignBundle, bankQuestions, statQuestions } = vi.hoisted(() => ({
  mockAssignBundle: vi.fn(),
  bankQuestions: { current: [] as unknown[] },
  statQuestions: { current: new Map<string, unknown>() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1' } }),
}));

vi.mock('@/hooks/useHubStudents', () => ({
  useHubStudents: () => ({
    rows: [
      { class_id: 'stu-beginner', display_name: 'Priya Shah' },
      { class_id: 'stu-advanced', display_name: 'Marcus Lee' },
      { class_id: 'stu-unset', display_name: 'Dana Wu' },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useStudentLevels', () => ({
  useStudentLevels: () => ({
    data: { 'stu-beginner': 'beginner', 'stu-advanced': 'advanced', 'stu-unset': null },
  }),
}));

// The sheet reads the bank singleton directly so it needs no provider.
vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    isReady: () => true,
    load: async () => undefined,
    getAllQuestions: () => bankQuestions.current,
  },
}));

// Same shape for the cohort-percentage sidecar. Empty by default, so every
// pre-existing spec exercises the no-stats path and proves the row is
// unchanged when percentages are unavailable.
vi.mock('@/lib/questionStats', () => ({
  questionStats: {
    isReady: () => statQuestions.current.size > 0,
    load: async () => undefined,
    asMap: () => statQuestions.current,
    get: (qid: string) => statQuestions.current.get(qid),
    coverage: () => null,
  },
}));

vi.mock('@/lib/assignWork', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/assignWork')>();
  return {
    ...actual,
    assignWorkBundle: (args: unknown) => mockAssignBundle(args),
  };
});

/** A pool of 6 easy and 6 hard questions, so the bands differ visibly. */
function makeBank(): LRQuestion[] {
  const mk = (d: number, n: number) =>
    Array.from({ length: n }, (_, i) => ({
      qid: `d${d}-${i}`,
      qtype: 'Flaw',
      difficulty: d,
      questionFeatures: [],
      reasoningType: [],
    })) as unknown as LRQuestion[];
  return [...mk(1, 6), ...mk(5, 6)];
}

const DRILL: GuidedDrill = {
  id: 'drill-1',
  slug: 'w2-07-necessary-assumption-first-taste',
  week: 2,
  order_in_week: 7,
  title: 'Necessary Assumption: First Taste',
  category: null,
  estimated_minutes: 30,
  question_count: 6,
  difficulty_min: 1,
  difficulty_max: 5,
  question_types: ['Flaw'],
  question_features: [],
  reasoning_types: [],
  start_button_label: 'Start',
  instruction_card: {},
  bank_filter: { qtypes: ['Flaw'] },
  is_published: true,
};

const ITEM: AssignWorkSheetItem = {
  item: { kind: 'guided_drill', drillId: 'drill-1' },
  title: DRILL.title,
  kindLabel: 'Drill',
  drill: DRILL,
};

function renderSheet(items: AssignWorkSheetItem[] = [ITEM]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AssignWorkSheet open items={items} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

function selectStudent(name: string) {
  fireEvent.click(screen.getByText(name));
}

beforeEach(() => {
  vi.clearAllMocks();
  bankQuestions.current = makeBank();
  statQuestions.current = new Map();
  mockAssignBundle.mockResolvedValue({ ok: [{ studentId: 'x' }], failed: [] });
});

describe('AssignWorkSheet — level and size', () => {
  it('shows each selected student their own band and at-level count', async () => {
    renderSheet();
    selectStudent('Priya Shah');

    // 6 of the 12-question pool are difficulty 1, all inside beginner 1-3.
    expect(await screen.findByText(/Beginner \(profile\).*6 of 6 at level/)).toBeInTheDocument();
  });

  it('warns before assigning when the drill has nothing at the student’s level', async () => {
    // A pool of difficulty-5s only: an advanced drill, given to a beginner.
    bankQuestions.current = Array.from({ length: 6 }, (_, i) => ({
      qid: `hard-${i}`,
      qtype: 'Flaw',
      difficulty: 5,
      questionFeatures: [],
      reasoningType: [],
    })) as unknown as LRQuestion[];

    renderSheet();
    selectStudent('Priya Shah');

    const warning = await screen.findByText(/nothing at this level in a pool of 6/);
    expect(warning).toBeInTheDocument();
    // Amber, not muted: this is a decision to make before committing.
    expect(warning.className).toContain('text-amber-700');
  });

  it('says so plainly when a student has no level set', async () => {
    renderSheet();
    selectStudent('Dana Wu');

    expect(await screen.findByText(/Level not set/)).toBeInTheDocument();
  });

  it('sends each student’s profile level through to the assign call', async () => {
    renderSheet();
    selectStudent('Priya Shah');
    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));

    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    // No override was set, so the sheet passes an empty map and assignWork
    // falls back to each student's stored profile level.
    expect(mockAssignBundle.mock.calls[0][0]).toMatchObject({
      studentIds: ['stu-beginner'],
      levelOverrides: {},
    });
  });

  it('carries a per-student override through to the assign call', async () => {
    renderSheet();
    selectStudent('Priya Shah');

    fireEvent.click(screen.getByTitle(/Advanced — difficulty 3-5/));
    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));

    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    expect(mockAssignBundle.mock.calls[0][0].levelOverrides).toEqual({
      'stu-beginner': 'advanced',
    });
  });

  it('scales the time estimate when the drill is shortened', async () => {
    renderSheet();
    selectStudent('Priya Shah');

    // 6 questions / 30 min -> 3 questions should read as about 15 min.
    fireEvent.change(screen.getByLabelText(/Questions/), { target: { value: '3' } });
    expect(await screen.findByText(/about 15 min/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));
    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    expect(mockAssignBundle.mock.calls[0][0].questionCountOverride).toBe(3);
  });

  it('leaves the count alone when the field is blank', async () => {
    renderSheet();
    selectStudent('Priya Shah');
    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));

    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    expect(mockAssignBundle.mock.calls[0][0].questionCountOverride).toBeUndefined();
  });

  it('shows no level controls at all for non-drill work', async () => {
    renderSheet([
      { item: { kind: 'homework_set', setId: 'set-1' }, title: 'Weaken set', kindLabel: 'Homework' },
    ]);
    selectStudent('Priya Shah');

    expect(screen.queryByText(/at level/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Questions/)).not.toBeInTheDocument();
  });
});

describe('AssignWorkSheet — cohort accuracy', () => {
  /** Percentages for the 6 easy (d1) and 6 hard (d5) questions in makeBank(). */
  function makeStats() {
    const m = new Map<string, unknown>();
    for (let i = 0; i < 6; i++) {
      m.set(`d1-${i}`, { correctPct: 92, topTrapTag: 'No Impact' });
      m.set(`d5-${i}`, { correctPct: 54, topTrapTag: 'Too Strong' });
    }
    return m;
  }

  it('shows what the student will actually face, not just how many', async () => {
    statQuestions.current = makeStats();
    renderSheet();
    selectStudent('Priya Shah'); // beginner, band 1-3, so only the d1s
    expect(await screen.findByText(/avg 92% correct/)).toBeInTheDocument();
  });

  it('reports a harder average for a higher band on the same drill', async () => {
    statQuestions.current = makeStats();
    renderSheet();
    selectStudent('Marcus Lee'); // advanced, band 3-5, so only the d5s
    expect(await screen.findByText(/avg 54% correct/)).toBeInTheDocument();
  });

  it('states coverage rather than implying every question is measured', async () => {
    const partial = makeStats();
    partial.delete('d1-0');
    partial.delete('d1-1');
    statQuestions.current = partial;
    renderSheet();
    selectStudent('Priya Shah');
    expect(await screen.findByText(/avg 92% correct \(4 of 6 measured\)/)).toBeInTheDocument();
  });

  it('says nothing at all when no percentages are available', async () => {
    statQuestions.current = new Map();
    renderSheet();
    selectStudent('Priya Shah');
    expect(await screen.findByText(/6 of 6 at level/)).toBeInTheDocument();
    expect(screen.queryByText(/% correct/)).not.toBeInTheDocument();
  });
});

describe('AssignWorkSheet — fixing the question set for an email', () => {
  const checkbox = () => screen.getByRole('checkbox', { name: /Fix the question set/ });

  it('does not freeze anything unless asked', async () => {
    renderSheet();
    selectStudent('Priya Shah');
    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));

    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    expect(mockAssignBundle.mock.calls[0][0].frozenQidsByStudent).toBeUndefined();
  });

  it('warns that the drill stops re-drawing before the teacher commits', async () => {
    renderSheet();
    expect(await screen.findByText(/stops re-drawing/)).toBeInTheDocument();
  });

  it('pins a set drawn at each student’s own band', async () => {
    renderSheet();
    selectStudent('Priya Shah'); // beginner 1-3 -> only the d1s
    selectStudent('Marcus Lee'); // advanced 3-5 -> only the d5s
    fireEvent.click(checkbox());
    fireEvent.click(screen.getByRole('button', { name: /Assign to 2 students/ }));

    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    const frozen = mockAssignBundle.mock.calls[0][0].frozenQidsByStudent;
    expect(Object.keys(frozen).sort()).toEqual(['stu-advanced', 'stu-beginner']);
    expect(frozen['stu-beginner'].every((q: string) => q.startsWith('d1-'))).toBe(true);
    expect(frozen['stu-advanced'].every((q: string) => q.startsWith('d5-'))).toBe(true);
  });

  it('honours a trimmed question count in the frozen set', async () => {
    renderSheet();
    selectStudent('Priya Shah');
    fireEvent.change(screen.getByLabelText(/Questions/), { target: { value: '3' } });
    fireEvent.click(checkbox());
    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));

    await waitFor(() => expect(mockAssignBundle).toHaveBeenCalled());
    expect(mockAssignBundle.mock.calls[0][0].frozenQidsByStudent['stu-beginner']).toHaveLength(3);
  });

  it('shows the pinned list afterwards so the file can be built from it', async () => {
    renderSheet();
    selectStudent('Priya Shah');
    fireEvent.click(checkbox());
    fireEvent.click(screen.getByRole('button', { name: /Assign to 1 student/ }));

    expect(await screen.findByText(/Fixed question sets/)).toBeInTheDocument();
    // The sheet stays open: closing it would drop the only on-screen copy.
    expect(screen.getByRole('button', { name: /^Copy$/ })).toBeInTheDocument();
  });

  it('offers no freeze control for a bundle, where one set makes no sense', async () => {
    renderSheet([
      ITEM,
      { item: { kind: 'homework_set', setId: 'set-1' }, title: 'Weaken set', kindLabel: 'Homework' },
    ]);
    expect(screen.queryByRole('checkbox', { name: /Fix the question set/ })).not.toBeInTheDocument();
  });
});
