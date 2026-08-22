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
  const view = render(
    <QuestionPicker manifest={manifest} onStartDrill={onStartDrill} onCancel={vi.fn()} />,
  );
  return { ...view, onStartDrill };
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

/** Type a spec and commit it the way a user does: Enter. */
function applySpec(text: string) {
  const input = screen.getByLabelText('Type a PrepTest, section and question range');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('QuestionPicker unified LR drill builder', () => {
  beforeEach(() => {
    mockToast.mockClear();
    mockRecordExposures.mockClear();
  });

  it('renders every filter trigger in the required order', () => {
    setup();

    // The scalar "Question number" input is gone; question numbers are now
    // expressed through the spec line, which sits below the focus row.
    const controls = [
      screen.getByLabelText('Type a PrepTest, section and question range'),
      screen.getByLabelText('Add exact questions'),
      trigger(/^PrepTests/),
      trigger(/^Section/),
      trigger(/^Question Type/),
      trigger(/^Reasoning Types/),
      trigger(/^Question Features/),
      trigger(/^Levels/),
      screen.getByLabelText('Search question text'),
    ];

    for (let index = 0; index < controls.length - 1; index += 1) {
      expect(
        controls[index].compareDocumentPosition(controls[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('labels each filter row in plain words rather than internal names', () => {
    setup();

    // "Spec" was the internal name for the grammar and read as jargon beside
    // SOURCE and FOCUS, which name what you are choosing.
    expect(screen.queryByText('Spec')).toBeNull();
    for (const label of ['Type it', 'Source', 'Focus']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const hint of ['Faster than clicking', 'Where they come from', 'What they test']) {
      expect(screen.getByText(hint)).toBeInTheDocument();
    }
  });

  it('combines independently selected PT, section, reasoning, feature, and level filters', () => {
    setup();

    togglePopoverOption(/^PrepTests/, 'pt-101');
    expect(trigger(/^PrepTests/)).toHaveTextContent('(1)');

    togglePopoverOption(/^Section/, 'section-1');
    togglePopoverOption(/^Reasoning Types/, 'rt-Causation');
    togglePopoverOption(/^Question Features/, 'feat-Alternative Cause');
    togglePopoverOption(/^Levels/, 'diff-1');

    expect(trigger(/^PrepTests/)).toHaveTextContent('(1)');
    expect(trigger(/^Section/)).toHaveTextContent('(1)');
    expect(trigger(/^Reasoning Types/)).toHaveTextContent('(1)');
    expect(trigger(/^Question Features/)).toHaveTextContent('(1)');
    expect(trigger(/^Levels/)).toHaveTextContent('(1)');
    expect(screen.getByText('1 matching question')).toBeInTheDocument();
    expect(screen.getByText('Which answer most strengthens the argument?')).toBeInTheDocument();
  });

  it('hides unselected zero-count options while keeping a selected zero-count option removable', () => {
    setup();

    togglePopoverOption(/^Reasoning Types/, 'rt-Comparative Reasoning');
    applySpec('Q1');

    expect(screen.getByText('0 matching questions')).toBeInTheDocument();
    fireEvent.click(trigger(/^Reasoning Types/));

    const selectedZeroOption = document.getElementById('rt-Comparative Reasoning');
    expect(selectedZeroOption).toBeChecked();
    expect(document.querySelector('label[for="rt-Comparative Reasoning"]')).toHaveTextContent(
      'Comparison (0)',
    );
    expect(document.getElementById('rt-Conditional Reasoning')).toBeNull();

    fireEvent.click(selectedZeroOption!);
    expect(trigger(/^Reasoning Types/)).not.toHaveTextContent('(1)');
    expect(screen.getByText('1 matching question')).toBeInTheDocument();
  });

  it('supports per-facet Clear and Clear all without disturbing unrelated filters', () => {
    setup();

    togglePopoverOption(/^PrepTests/, 'pt-101');
    fireEvent.click(trigger(/^Reasoning Types/));
    fireEvent.click(document.getElementById('rt-Causation')!);

    const reasoningHeader = screen.getByText('Select Reasoning Types').parentElement;
    expect(reasoningHeader).not.toBeNull();
    fireEvent.click(within(reasoningHeader!).getByRole('button', { name: 'Clear' }));

    expect(trigger(/^PrepTests/)).toHaveTextContent('(1)');
    expect(trigger(/^Reasoning Types/)).not.toHaveTextContent('(1)');
    expect(screen.getByText('5 matching questions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(trigger(/^PrepTests/)).not.toHaveTextContent('(1)');
    expect(screen.getByText('7 matching questions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('materializes and launches the exact deterministic preview QIDs', async () => {
    const { onStartDrill } = setup();
    togglePopoverOption(/^PrepTests/, 'pt-101');

    fireEvent.click(screen.getAllByRole('button', { name: 'Generate 5' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Launch this set (5)' }));

    expect(onStartDrill).toHaveBeenCalledTimes(1);
    expect(onStartDrill.mock.calls[0][0]).toMatchObject({
      count: 5,
      selectedQids: [
        'PT101-S1-Q1',
        'PT101-S1-Q2',
        'PT101-S2-Q3',
        'PT101-S2-Q4',
        'PT101-S1-Q5',
      ],
    });
  });

  it('launches a manual selection instead of the larger matching filter pool', async () => {
    const { container, onStartDrill } = setup();
    togglePopoverOption(/^PrepTests/, 'pt-101');

    const firstRow = container.querySelector<HTMLElement>('tbody tr');
    expect(firstRow).not.toBeNull();
    fireEvent.click(within(firstRow!).getByRole('checkbox'));
    fireEvent.click(await screen.findByRole('button', { name: 'Launch (1)' }));

    expect(onStartDrill).toHaveBeenCalledTimes(1);
    expect(onStartDrill.mock.calls[0][0]).toMatchObject({
      count: 1,
      selectedQids: ['PT101-S1-Q1'],
    });
  });

  describe('spec line', () => {
    it('applies PT, section and multiple question numbers in one commit', () => {
      setup();
      applySpec('PT101 S1 Q1,2');

      expect(trigger(/^PrepTests/)).toHaveTextContent('(1)');
      expect(trigger(/^Section/)).toHaveTextContent('(1)');
      expect(screen.getByText('2 matching questions')).toBeInTheDocument();
    });

    it('expresses a set of question numbers the old scalar input could not', () => {
      setup();
      applySpec('Q1,3');

      // Two distinct numbers at once. The previous control held exactly one.
      expect(screen.getByText('2 matching questions')).toBeInTheDocument();
    });

    it('canonicalizes the text it commits', () => {
      setup();
      applySpec('q2,1 pt101');

      expect(screen.getByLabelText('Type a PrepTest, section and question range')).toHaveValue('PT101 Q1,2');
    });

    it('reflects a popover change back into the bar', () => {
      setup();
      togglePopoverOption(/^PrepTests/, 'pt-101');

      expect(screen.getByLabelText('Type a PrepTest, section and question range')).toHaveValue('PT101');
    });

    it('clears a facet when its tokens are removed, rather than restoring the old value', () => {
      setup();
      applySpec('PT101 S1');
      expect(trigger(/^Section/)).toHaveTextContent('(1)');

      applySpec('PT101');
      expect(trigger(/^Section/)).not.toHaveTextContent('(1)');
      expect(trigger(/^PrepTests/)).toHaveTextContent('(1)');
    });

    it('rejects an invalid spec without touching the filters', () => {
      setup();
      applySpec('PT101');
      applySpec('PT999');

      expect(screen.getByRole('alert')).toHaveTextContent('not in the bank');
      // The valid earlier commit survives; the bad one wrote nothing.
      expect(trigger(/^PrepTests/)).toHaveTextContent('(1)');
    });

    it('surfaces an unreadable token instead of silently ignoring it', () => {
      setup();
      applySpec('PT101 flaw');

      expect(screen.getByRole('alert')).toHaveTextContent('flaw');
    });
  });

  describe('exact references', () => {
    function addExact(text: string) {
      const input = screen.getByLabelText('Add exact questions');
      fireEvent.change(input, { target: { value: text } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }

    it('adds named questions to the selection', async () => {
      const { onStartDrill } = setup();
      addExact('PT101.S1.Q1, PT101.S2.Q3');

      fireEvent.click(await screen.findByRole('button', { name: 'Launch (2)' }));
      expect(onStartDrill.mock.calls[0][0]).toMatchObject({
        selectedQids: ['PT101-S1-Q1', 'PT101-S2-Q3'],
      });
    });

    it('leaves the existing selection byte-identical when one reference is invalid', async () => {
      setup();
      addExact('PT101.S1.Q1');
      expect(await screen.findByRole('button', { name: 'Launch (1)' })).toBeInTheDocument();

      // One good, one nonexistent: the whole submission is a no-op.
      addExact('PT101.S1.Q2, PT101.S9.Q99');

      expect(screen.getByRole('alert')).toHaveTextContent('Nothing was added');
      expect(screen.getByRole('button', { name: 'Launch (1)' })).toBeInTheDocument();
    });

    it('rejects a facet-style token, which belongs in the spec bar', () => {
      setup();
      addExact('PT101');

      expect(screen.getByRole('alert')).toHaveTextContent('PT101.S2.Q1');
    });
  });
});
