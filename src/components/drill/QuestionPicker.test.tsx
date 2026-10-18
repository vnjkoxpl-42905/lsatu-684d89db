import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestionManifest } from '@/lib/questionLoader';
import { QuestionPicker } from './QuestionPicker';

const { mockQuestions, mockToast, mockRecordExposures } = vi.hoisted(() => {
  const makeQuestion = (overrides: Record<string, unknown>) => ({
    qid: 'PT101-S1-Q1',
    pt: 101,
    section: 1,
    qnum: 1,
    qtype: 'Strengthen',
    reasoningType: ['Causation'],
    questionFeatures: ['Alternative Cause'],
    difficulty: 1,
    stimulus: 'A compact fixture stimulus.',
    questionStem: 'Which answer most strengthens the argument?',
    answerChoices: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
    correctAnswer: 'A',
    ...overrides,
  });

  return {
    mockQuestions: [
      makeQuestion({ qid: 'PT101-S1-Q1' }),
      makeQuestion({ qid: 'PT101-S1-Q2', qnum: 2, difficulty: 2 }),
      makeQuestion({
        qid: 'PT101-S2-Q3',
        section: 2,
        qnum: 3,
        difficulty: 3,
        questionFeatures: ['Sampling'],
      }),
      makeQuestion({
        qid: 'PT101-S2-Q4',
        section: 2,
        qnum: 4,
        difficulty: 4,
        questionFeatures: ['Sampling'],
      }),
      makeQuestion({ qid: 'PT101-S1-Q5', qnum: 5, difficulty: 5 }),
      makeQuestion({
        qid: 'PT102-S2-Q6',
        pt: 102,
        section: 2,
        qnum: 6,
        qtype: 'Weaken',
        stimulus: 'A rare botanical argument.',
        difficulty: 3,
        reasoningType: ['Conditional Reasoning'],
        questionFeatures: ['Conditional Diagramming'],
      }),
      makeQuestion({
        qid: 'PT102-S1-Q7',
        pt: 102,
        qnum: 7,
        qtype: 'Weaken',
        difficulty: 4,
        reasoningType: ['Comparative Reasoning'],
        questionFeatures: ['Comparison'],
      }),
    ],
    mockToast: vi.fn(),
    mockRecordExposures: vi.fn(() => Promise.resolve()),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, authReady: true }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useSavedSets', () => ({
  useSavedSets: () => ({
    save: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/lib/questionExposure', () => ({
  recordExposures: mockRecordExposures,
}));

vi.mock('@/lib/questionLoader', () => ({
  CANONICAL_QTYPES: {
    allTypes: ['Strengthen', 'Weaken'],
    groups: [{ name: 'Core', types: ['Strengthen', 'Weaken'] }],
  },
  questionBank: {
    getAllQuestions: () => mockQuestions,
    getQuestion: (qid: string) => mockQuestions.find((question) => question.qid === qid),
    shuffleQuestions: (questions: unknown[]) => [...questions],
  },
  shuffleArray: (values: unknown[]) => [...values],
}));

const manifest: QuestionManifest = {
  totalQuestions: 7,
  byPT: { PT101: 5, PT102: 2 },
  byQType: { Strengthen: 5, Weaken: 2 },
  byFeature: {
    'Alternative Cause': 3,
    Sampling: 2,
    'Conditional Diagramming': 1,
    Comparison: 1,
  },
  byReasoningType: {
    Causation: 5,
    'Conditional Reasoning': 1,
    'Comparative Reasoning': 1,
  },
  bySection: { 1: 4, 2: 3 },
  byDifficulty: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 1 },
  sections: [
    { pt: 101, section: 1, count: 3, filename: 'PT101-S1.json' },
    { pt: 101, section: 2, count: 2, filename: 'PT101-S2.json' },
    { pt: 102, section: 1, count: 1, filename: 'PT102-S1.json' },
    { pt: 102, section: 2, count: 1, filename: 'PT102-S2.json' },
  ],
};

function setup(expanded = true) {
  const onStartDrill = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <QuestionPicker manifest={manifest} onStartDrill={onStartDrill} onCancel={onCancel} />,
  );
  if (expanded) {
    fireEvent.click(screen.getByRole('button', { name: 'Add specific questions' }));
    fireEvent.click(screen.getByRole('button', { name: 'More filters' }));
  }
  return { ...view, onStartDrill, onCancel };
}

function trigger(name: RegExp) {
  return screen.getByRole('button', { name });
}

function togglePopoverOption(triggerName: RegExp, checkboxId: string) {
  fireEvent.click(trigger(triggerName));
  const checkbox = document.getElementById(checkboxId);
  expect(checkbox).not.toBeNull();
  fireEvent.click(checkbox!);
  fireEvent.click(trigger(triggerName));
}

function pasteReferences(text: string) {
  const input = screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

function previewSet() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Preview drill (5)' })[0]);
}

describe('QuestionPicker LR drill setup', () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockRecordExposures.mockClear();
  });

  it('returns to practice options from the header', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Back to practice' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('starts with the essential filters and reveals optional controls without starting practice', () => {
    const { onStartDrill } = setup(false);
    expect(trigger(/^Question type/)).toBeInTheDocument();
    expect(trigger(/^Difficulty/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Number of questions' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const specific = screen.getByRole('button', { name: 'Add specific questions' });
    expect(specific).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(specific);
    expect(specific).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(specific);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More filters' }));
    expect(trigger(/^Reasoning/)).toBeInTheDocument();
    expect(trigger(/^Question features/)).toBeInTheDocument();
    expect(onStartDrill).not.toHaveBeenCalled();
    expect(mockRecordExposures).not.toHaveBeenCalled();
  });

  it('combines PrepTest, section, reasoning, feature, and level filters', () => {
    setup();
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    togglePopoverOption(/^Section selector/, 'section-1');
    togglePopoverOption(/^Reasoning/, 'rt-Causation');
    togglePopoverOption(/^Question features/, 'feat-Alternative Cause');
    togglePopoverOption(/^Difficulty/, 'diff-1');
    expect(screen.getByText('1 matching question')).toBeInTheDocument();
  });

  it('retains a selected option when its contextual count becomes zero', () => {
    setup();
    togglePopoverOption(/^Reasoning/, 'rt-Comparative Reasoning');
    pasteReferences('Q1');
    expect(screen.getByText('0 matching questions')).toBeInTheDocument();
    fireEvent.click(trigger(/^Reasoning/));
    expect(document.getElementById('rt-Comparative Reasoning')).toBeChecked();
    expect(document.querySelector('label[for="rt-Comparative Reasoning"]')).toHaveTextContent('Comparison (0)');
  });

  it('clears one facet or all filters without removing exact picks', () => {
    setup();
    pasteReferences('PT101.S1.Q1');
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    fireEvent.click(trigger(/^Reasoning/));
    fireEvent.click(document.getElementById('rt-Causation')!);
    const header = screen.getByText('Reasoning').parentElement!;
    fireEvent.click(within(header).getByRole('button', { name: 'Clear' }));
    expect(trigger(/^PrepTest selector/)).toHaveAccessibleName(/101/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('1 added by you')).toBeInTheDocument();
    expect(screen.getByText('7 matching questions')).toBeInTheDocument();
  });

  it('finds a question by its dotted address', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' }), {
      target: { value: 'PT102.S2.Q6' },
    });
    expect(screen.getByText('7 matching questions')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Preview drill (5)' })[0]).toBeEnabled();
  });

  it('adds an exact PT, section, and question-number choice without starting a drill', () => {
    const { onStartDrill } = setup();
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    togglePopoverOption(/^Section selector/, 'section-2');
    fireEvent.click(screen.getByRole('combobox', { name: 'Question number' }));
    fireEvent.click(screen.getByRole('option', { name: 'Question 3' }));
    expect(screen.getByRole('button', { name: 'Remove PT101 section 2 question 3' })).toBeInTheDocument();
    expect(onStartDrill).not.toHaveBeenCalled();
  });

  it('uses the same field for text search and multiple exact questions', () => {
    setup();
    const search = screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' });
    fireEvent.change(search, { target: { value: 'botanical' } });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Add questions' })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'PT101.S1.Q1, PT101.S1.Q2' } });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Add questions' }));
    expect(screen.getByText('2 added by you')).toBeInTheDocument();
    expect(search).toHaveValue('');
  });

  it('previews and launches the exact set shown', () => {
    const { onStartDrill } = setup();
    previewSet();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill (5)' }));
    expect(onStartDrill).toHaveBeenCalledWith(expect.objectContaining({
      count: 5,
      selectedQids: [
        'PT101-S1-Q1',
        'PT101-S1-Q2',
        'PT101-S2-Q3',
        'PT101-S2-Q4',
        'PT101-S1-Q5',
      ],
    }));
  });

  it('guarantees exact picks and fills the remaining places from filters', () => {
    const { onStartDrill } = setup();
    pasteReferences('PT102.S2.Q6');
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    previewSet();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill (5)' }));
    expect(onStartDrill.mock.calls[0][0].selectedQids).toEqual([
      'PT102-S2-Q6',
      'PT101-S1-Q1',
      'PT101-S1-Q2',
      'PT101-S2-Q3',
      'PT101-S2-Q4',
    ]);
  });

  it('shows the actual fill pool and every launched question before starting', async () => {
    const { onStartDrill } = setup();
    pasteReferences('PT102.S2.Q6');
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    expect(screen.getAllByText(/5 matching questions/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Your 1 added question is kept outside these filters/)).not.toHaveLength(0);

    previewSet();
    const viewQuestions = screen.getByRole('button', { name: 'View questions (5)' });
    expect(viewQuestions).toHaveFocus();
    fireEvent.click(viewQuestions);
    const dialog = screen.getByRole('dialog', { name: 'Your drill: 5 questions' });
    expect(dialog.querySelectorAll('details')).toHaveLength(5);
    expect(within(dialog).getByText(/PT 102 · Section 2 · Question 6/)).toBeInTheDocument();
    expect(within(dialog).getByText(/PT 101 · Section 2 · Question 4/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText(/PT 102 · Section 2 · Question 6/));
    expect(within(dialog).getByText('A rare botanical argument.')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Which answer most strengthens the argument?').length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/correct answer:/i)).not.toBeInTheDocument();
    expect(onStartDrill).not.toHaveBeenCalled();
    expect(mockRecordExposures).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to setup' }));
    await waitFor(() => expect(viewQuestions).toHaveFocus());
    fireEvent.click(viewQuestions);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start drill (5)' }));
    expect(onStartDrill.mock.calls[0][0].selectedQids).toHaveLength(5);
  });

  it('blocks preview when filters cannot fill the remaining places', () => {
    setup();
    togglePopoverOption(/^PrepTest selector/, 'pt-102');
    expect(screen.getAllByText(/2 matching questions/)).not.toHaveLength(0);
    expect(screen.getAllByText(/filters need 3 more questions/)).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Preview drill (5)' })[0]).toBeDisabled();
  });

  it('applies a pasted range and rejects invalid references atomically', () => {
    setup();
    expect(screen.queryByText('Advanced: add several by reference')).not.toBeInTheDocument();
    pasteReferences('PT101 S1 Q1,2');
    expect(screen.getByText('2 matching questions')).toBeInTheDocument();
    pasteReferences('PT101.S1.Q1, PT101.S9.Q99');
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was added');
    expect(screen.getByText('0 added by you')).toBeInTheDocument();
  });

  it('places an exact pick that is also in the pool exactly once', () => {
    const { onStartDrill } = setup();
    pasteReferences('PT101.S1.Q2');
    previewSet();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill (5)' }));
    const launched: string[] = onStartDrill.mock.calls[0][0].selectedQids;
    expect(launched).toHaveLength(5);
    expect(launched[0]).toBe('PT101-S1-Q2');
    expect(launched.filter((qid) => qid === 'PT101-S1-Q2')).toHaveLength(1);
    expect(new Set(launched).size).toBe(5);
  });

  it('blocks a set with more exact picks than places and says how to fix it', () => {
    const { onStartDrill } = setup();
    pasteReferences('PT101.S1.Q1, PT101.S1.Q2, PT101.S2.Q3, PT101.S2.Q4, PT101.S1.Q5, PT102.S2.Q6');
    expect(screen.getByText('6 added by you')).toBeInTheDocument();
    expect(screen.getAllByText(/You selected 6 questions\. Increase the set size or remove some\./)).not.toHaveLength(0);
    for (const button of screen.getAllByRole('button', { name: 'Preview drill (5)' })) expect(button).toBeDisabled();
    expect(onStartDrill).not.toHaveBeenCalled();
  });

  it('clears a preview visibly when the composition changes, then launches only the new preview', () => {
    const { onStartDrill } = setup();
    previewSet();
    expect(screen.getAllByRole('button', { name: 'Start drill (5)' })).not.toHaveLength(0);
    pasteReferences('PT102.S2.Q6');
    expect(screen.queryByRole('button', { name: 'Start drill (5)' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Your drill changed, so the earlier preview was cleared/)).not.toHaveLength(0);

    previewSet();
    expect(screen.queryByText(/Your drill changed/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start drill (5)' }));
    expect(onStartDrill.mock.calls[0][0].selectedQids[0]).toBe('PT102-S2-Q6');
  });

  it('keeps the preview when only the discovery search changes', () => {
    setup();
    previewSet();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' }), {
      target: { value: 'botanical' },
    });
    expect(screen.getByRole('button', { name: 'Start drill (5)' })).toBeInTheDocument();
    expect(screen.queryByText(/Your drill changed/)).not.toBeInTheDocument();
  });

  it('opens specific questions and moves focus to search when editing a preview', () => {
    const { onStartDrill } = setup(false);
    previewSet();
    fireEvent.click(screen.getByRole('button', { name: 'Edit questions' }));
    expect(screen.getByRole('button', { name: /Add specific questions/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Start drill (5)' })).not.toBeInTheDocument();
    expect(onStartDrill).not.toHaveBeenCalled();
    expect(mockRecordExposures).not.toHaveBeenCalled();
  });

  it('launches once when Start is pressed twice in one batch', () => {
    const { onStartDrill } = setup();
    previewSet();
    const start = screen.getByRole('button', { name: 'Start drill (5)' });
    act(() => {
      start.click();
      start.click();
    });
    expect(onStartDrill).toHaveBeenCalledTimes(1);
    expect(mockRecordExposures).not.toHaveBeenCalled(); // no signed-in user in this harness
  });

  it('states the actual training mode before Start without offering a timed choice', () => {
    setup();
    const mode = screen.getByTestId('lr-set-mode');
    expect(mode).toHaveTextContent('No time limit. Your time is recorded.');
    expect(mode).toHaveTextContent('Reveal answers when you choose, or review them after finishing.');
    previewSet();
    fireEvent.click(screen.getAllByRole('button', { name: 'View questions (5)' })[0]);
    expect(screen.getByRole('dialog', { name: 'Your drill: 5 questions' })).toHaveTextContent('Your questions, in order. Open a question to read it.');
  });
});
