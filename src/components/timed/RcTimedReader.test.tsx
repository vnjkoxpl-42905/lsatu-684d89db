import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RcTimedReader, type RcTimedReaderProps } from './RcTimedReader';
import type { RcSessionItem } from '@/features/rc/lib/rcSession';
import comparativeBank from '../../../public/data/rc/RC-PT123.json';
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

  it('reports zero Find matches and navigates matching occurrences', () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const view = render(<RcTimedReader {...props({ find: 'missing phrase' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('0/0 · No matches');
    expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled();
    view.rerender(<RcTimedReader {...props({ find: 'paragraph' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    expect(screen.getByRole('status')).toHaveTextContent('2/2');
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    expect(screen.getByRole('status')).toHaveTextContent('1/2');
  });

  it('uses actual source comparative headings without changing annotation text offsets', () => {
    const text = comparativeBank.passages.find(value => value.passageId === 168)!.text;
    const comparativeItem = { ...item, passage: { ...passage, text, format: 'Comparative' } };
    const view = render(<RcTimedReader {...props({ item: comparativeItem })} />);
    const textContainer = view.container.querySelector('.rc-passage-text')!;
    const originalText = textContainer.textContent;
    expect(screen.getByRole('button', { name: 'Passage B' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Passage B' }));
    expect(textContainer.textContent).toBe(originalText);
    const headings = [...textContainer.querySelectorAll('p')].filter(element => /^Passage [AB]$/.test(element.textContent ?? ''));
    expect(headings[0]).not.toBeVisible();
    expect(headings[1]).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Both' }));
    expect(headings[0]).toBeVisible();
    expect(textContainer.textContent).toBe(originalText);
  });

  it('keeps ambiguous comparative content in Both view', () => {
    const ambiguous = { ...item, passage: { ...passage, format: 'Comparative', text: '**Passage A**\n\nFirst text.\n\n**Passage A**\n\nRepeated heading.\n\n**Passage B**\n\nSecond text.' } };
    render(<RcTimedReader {...props({ item: ambiguous })} />);
    expect(screen.getByRole('button', { name: 'Passage A' })).toBeDisabled();
    expect(screen.getByText(/separate parts could not be verified/)).toBeInTheDocument();
  });

  it('uses a compact pane switch when the actual container is narrow', () => {
    vi.stubGlobal('ResizeObserver', class {
      constructor(private callback: (entries: unknown[]) => void) {}
      observe() { this.callback([{ contentRect: { width: 620 } }]); }
      disconnect() {}
    });
    try {
      const view = render(<RcTimedReader {...props()} />);
      expect(screen.getByRole('group', { name: 'Reader pane' })).toBeInTheDocument();
      expect(screen.queryByText(/Choice alpha/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Questions' }));
      expect(screen.getByText(/Choice alpha/)).toBeInTheDocument();
      expect(view.container.querySelector('.rc-timed-reader')).toHaveAttribute('data-pane-layout', 'single');
    } finally { vi.unstubAllGlobals(); }
  });

  it('hides the question column in passage-only mode', () => {
    render(<RcTimedReader {...props({ passageOnly: true })} />);
    expect(screen.getByText(/First paragraph about risk/)).toBeInTheDocument();
    expect(screen.queryByText(/Choice alpha/)).toBeNull();
  });
});
