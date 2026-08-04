import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignWorkSheet, type AssignWorkSheetItem } from './AssignWorkSheet';
import type { GuidedDrill } from '@/lib/guidedDrills';
import type { LRQuestion } from '@/lib/questionLoader';

const { mockAssignBundle, bankQuestions } = vi.hoisted(() => ({
  mockAssignBundle: vi.fn(),
  bankQuestions: { current: [] as unknown[] },
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
