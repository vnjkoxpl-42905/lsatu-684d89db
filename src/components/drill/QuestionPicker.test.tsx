import { fireEvent, render, screen, within } from '@testing-library/react';
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

function setup() {
  const onStartDrill = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <QuestionPicker manifest={manifest} onStartDrill={onStartDrill} onCancel={onCancel} />,
  );
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
  fireEvent.click(screen.getAllByRole('button', { name: 'Create set preview (5)' })[0]);
}

describe('QuestionPicker LR drill setup', () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockRecordExposures.mockClear();
  });

  it('returns to practice options from the header', () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Back to practice options' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('places search and address controls before the four focus controls', () => {
    setup();
    const controls = [
      screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' }),
      trigger(/^PrepTest selector/),
      trigger(/^Section selector/),
      screen.getByRole('combobox', { name: 'Question number' }),
      trigger(/^Question Type/),
      trigger(/^Reasoning Types/),
      trigger(/^Question Features/),
      trigger(/^Levels/),
    ];
    for (let index = 0; index < controls.length - 1; index += 1) {
      expect(controls[index].compareDocumentPosition(controls[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByText('Choose your questions')).toBeInTheDocument();
    expect(screen.getByText('Narrow the rest')).toBeInTheDocument();
  });

  it('combines PrepTest, section, reasoning, feature, and level filters', () => {
    setup();
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    togglePopoverOption(/^Section selector/, 'section-1');
    togglePopoverOption(/^Reasoning Types/, 'rt-Causation');
    togglePopoverOption(/^Question Features/, 'feat-Alternative Cause');
    togglePopoverOption(/^Levels/, 'diff-1');
    expect(screen.getByText('1 matching question')).toBeInTheDocument();
  });

  it('retains a selected option when its contextual count becomes zero', () => {
    setup();
    togglePopoverOption(/^Reasoning Types/, 'rt-Comparative Reasoning');
    pasteReferences('Q1');
    expect(screen.getByText('0 matching questions')).toBeInTheDocument();
    fireEvent.click(trigger(/^Reasoning Types/));
    expect(document.getElementById('rt-Comparative Reasoning')).toBeChecked();
    expect(document.querySelector('label[for="rt-Comparative Reasoning"]')).toHaveTextContent('Comparison (0)');
  });

  it('clears one facet or all filters without removing exact picks', () => {
    setup();
    pasteReferences('PT101.S1.Q1');
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    fireEvent.click(trigger(/^Reasoning Types/));
    fireEvent.click(document.getElementById('rt-Causation')!);
    const header = screen.getByText('Select Reasoning Types').parentElement!;
    fireEvent.click(within(header).getByRole('button', { name: 'Clear' }));
    expect(trigger(/^PrepTest selector/)).toHaveAccessibleName(/101/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('1 added to set')).toBeInTheDocument();
    expect(screen.getByText('7 matching questions')).toBeInTheDocument();
  });

  it('finds a question by its dotted address', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find questions by text or PrepTest reference' }), {
      target: { value: 'PT102.S2.Q6' },
    });
    expect(screen.getByText('7 matching questions')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Create set preview (5)' })[0]).toBeEnabled();
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
    expect(screen.getByText('2 added to set')).toBeInTheDocument();
    expect(search).toHaveValue('');
  });

  it('previews and launches the exact set shown', () => {
    const { onStartDrill } = setup();
    previewSet();
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill (5)' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Start this drill (5)' }));
    expect(onStartDrill.mock.calls[0][0].selectedQids).toEqual([
      'PT102-S2-Q6',
      'PT101-S1-Q1',
      'PT101-S1-Q2',
      'PT101-S2-Q3',
      'PT101-S2-Q4',
    ]);
  });

  it('shows the actual fill pool and every launched question before starting', () => {
    const { onStartDrill } = setup();
    pasteReferences('PT102.S2.Q6');
    togglePopoverOption(/^PrepTest selector/, 'pt-101');
    expect(screen.getAllByText(/5 available from filters for 4 remaining places/)).not.toHaveLength(0);
    expect(screen.getAllByText(/1 chosen question stays.*outside these filters/)).not.toHaveLength(0);

    previewSet();
    fireEvent.click(screen.getAllByRole('button', { name: 'Inspect all 5 questions' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Your set: 5 questions' });
    expect(dialog.querySelectorAll('details')).toHaveLength(5);
    expect(within(dialog).getByText(/1\. PT102 · S2 · Q6/)).toBeInTheDocument();
    expect(within(dialog).getByText(/5\. PT101 · S2 · Q4/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText(/1\. PT102 · S2 · Q6/));
    expect(within(dialog).getByText('A rare botanical argument.')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Which answer most strengthens the argument?').length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/correct answer:/i)).not.toBeInTheDocument();
    expect(onStartDrill).not.toHaveBeenCalled();
    expect(mockRecordExposures).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start this drill (5)' }));
    expect(onStartDrill.mock.calls[0][0].selectedQids).toHaveLength(5);
  });

  it('blocks preview when filters cannot fill the remaining places', () => {
    setup();
    togglePopoverOption(/^PrepTest selector/, 'pt-102');
    expect(screen.getAllByText(/2 available from filters for 5 remaining places/)).not.toHaveLength(0);
    expect(screen.getAllByText(/filters need 3 more questions/)).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Create set preview (5)' })[0]).toBeDisabled();
  });

  it('applies a pasted range and rejects invalid references atomically', () => {
    setup();
    expect(screen.queryByText('Advanced: add several by reference')).not.toBeInTheDocument();
    pasteReferences('PT101 S1 Q1,2');
    expect(screen.getByText('2 matching questions')).toBeInTheDocument();
    pasteReferences('PT101.S1.Q1, PT101.S9.Q99');
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was added');
    expect(screen.getByText('0 added to set')).toBeInTheDocument();
  });
});
