import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RcTimedReader, type RcTimedReaderProps } from './RcTimedReader';
import type { RcSessionItem } from '@/features/rc/lib/rcSession';
import type { RcPassage } from '@/features/rc/lib/rcTypes';

const passage = {
  passageId: 7, preptest: 140, section: 1, setNumber: 1, title: 'Risk Communication', topic: null, format: null,
  frameworks: [], difficulty: null,
  text: 'First paragraph about risk.\n\nSecond paragraph about trust.',
  summaries: {},
  questions: [{
    questionId: 501, position: 1, questionType: 'Main Point', questionTypeFamily: 'Big Picture', difficulty: null,
    prompt: 'Which one of the following best states the main point?', correctAnswer: 'A', hasWrittenExplanation: true,
    explanationBlocks: [{ type: 'text', text: 'Secret explanation' }], totalResponses: null, features: [],
    choices: [{ letter: 'A', text: 'Choice alpha' }, { letter: 'B', text: 'Choice bravo' }, { letter: 'C', text: 'Choice charlie' },
      { letter: 'D', text: 'Choice delta' }, { letter: 'E', text: 'Choice echo' }],
  }],
} as unknown as RcPassage;
const item: RcSessionItem = { passage, question: passage.questions[0], number: 1, passageIndex: 0 };

const props = (over: Partial<RcTimedReaderProps> = {}): RcTimedReaderProps => ({
  item, answer: { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [] }, blocked: false,
  fontScale: 1, find: '', marker: 'none', color: 'yellow', onColorChange: vi.fn(), passageOnly: false, marks: [],
  onMarksChange: vi.fn(), scrollTop: 0, onScrollTop: vi.fn(), onSelect: vi.fn(), onToggleElimination: vi.fn(), onToggleFlag: vi.fn(),
  ...over,
});

describe('RcTimedReader', () => {
  it('shows the passage beside the question and choices, with no answer or explanation', () => {
    render(<RcTimedReader {...props()} />);
    expect(screen.getByText(/First paragraph about risk/)).toBeInTheDocument();
    expect(screen.getByText(/Which one of the following best states the main point/)).toBeInTheDocument();
    expect(screen.getByText(/Choice alpha/)).toBeInTheDocument();
    expect(screen.queryByText(/Secret explanation/)).toBeNull();
  });

  it('reports a choice pick, and does nothing while the section is blocked', () => {
    const onSelect = vi.fn();
    const view = render(<RcTimedReader {...props({ onSelect })} />);
    fireEvent.click(screen.getByText(/Choice bravo/));
    expect(onSelect).toHaveBeenCalledWith('B');
    onSelect.mockClear();
    view.rerender(<RcTimedReader {...props({ onSelect, blocked: true })} />);
    fireEvent.click(screen.getByText(/Choice bravo/));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('prevents erasing passage annotations while blocked', () => {
    const onMarksChange = vi.fn();
    const configuration = props({ marker: 'erase', onMarksChange, marks: [{ target: 'passage', start: 0, end: 5, color: 'yellow', kind: 'highlight' }] });
    const view = render(<RcTimedReader {...configuration} />);
    const mark = view.container.querySelector('mark');
    expect(mark).not.toBeNull();
    fireEvent.mouseUp(mark!);
    expect(onMarksChange).toHaveBeenCalledWith([]);
    onMarksChange.mockClear();
    view.rerender(<RcTimedReader {...configuration} blocked />);
    fireEvent.mouseUp(view.container.querySelector('mark')!);
    expect(onMarksChange).not.toHaveBeenCalled();
  });

  it('hides the question column in passage-only mode', () => {
    render(<RcTimedReader {...props({ passageOnly: true })} />);
    expect(screen.getByText(/First paragraph about risk/)).toBeInTheDocument();
    expect(screen.queryByText(/Choice alpha/)).toBeNull();
  });
});
