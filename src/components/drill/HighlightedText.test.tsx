import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightedText } from './HighlightedText';
import { replaceOverlappingHighlights, type Highlight } from '@/lib/highlightUtils';
import { addRcTimedMark } from '@/components/timed/rcTimedReaderStorage';

const text = 'that aid their own survival. However, this characteristic is actually quite common. Certain species of plankton';
const start = text.indexOf('this characteristic');
const end = text.indexOf(' Certain');
const mark = (id: string, from: number, to: number): Highlight => ({ id, start: from, end: to, text: text.slice(from, to), color: 'yellow', section: 'stimulus' });

// The PT107 plankton passage went garbled when a student dragged over one sentence several times.
const repeatedDrags = [[start, start + 40], [start + 10, end], [start + 20, start + 30], [start + 25, start + 41], [start + 30, start + 38], [start + 35, end]];

describe('HighlightedText with overlapping highlights', () => {
  it('draws every character once even when stored highlights overlap', () => {
    const { container } = render(<HighlightedText text={text} highlights={repeatedDrags.map(([a, b], i) => mark(`h${i}`, a, b))} />);
    expect(container.textContent).toBe(text);
  });

  it('covers the union of overlapping highlights', () => {
    const { container } = render(<HighlightedText text={text} highlights={repeatedDrags.map(([a, b], i) => mark(`h${i}`, a, b))} />);
    const marked = Array.from(container.querySelectorAll('.hl')).map(node => node.textContent).join('');
    expect(marked).toBe(text.slice(start, end));
  });

  it('survives a highlight swallowed whole by an earlier one and one past the end of the text', () => {
    const { container } = render(<HighlightedText text={text} highlights={[mark('a', start, end), mark('b', start + 5, start + 9), { ...mark('c', end, end + 500), end: end + 500 }]} />);
    expect(container.textContent).toBe(text);
  });
});

describe('the drill add rule used by the timed runner', () => {
  it('keeps repeated drags over one sentence as non-overlapping highlights', () => {
    const marks = repeatedDrags.reduce<Highlight[]>((all, [a, b], i) => replaceOverlappingHighlights(all, mark(`n${i}`, a, b)), []);
    for (let i = 1; i < marks.length; i++) expect(marks[i].start).toBeGreaterThanOrEqual(marks[i - 1].end);
    const { container } = render(<HighlightedText text={text} highlights={marks} />);
    expect(container.textContent).toBe(text);
  });
});

describe('addRcTimedMark', () => {
  it('replaces overlapping marks of the same kind and keeps the uncovered edges', () => {
    const first = addRcTimedMark([], { target: 'passage', start: 10, end: 40, color: 'yellow', kind: 'highlight' });
    const next = addRcTimedMark(first, { target: 'passage', start: 20, end: 30, color: 'pink', kind: 'highlight' });
    expect(next.map(({ start, end, color }) => [start, end, color]).sort()).toEqual([[10, 20, 'yellow'], [20, 30, 'pink'], [30, 40, 'yellow']]);
  });

  it('lets an underline sit on a highlight and leaves other targets alone', () => {
    const marks = addRcTimedMark([{ target: 'passage', start: 0, end: 10, color: 'yellow', kind: 'highlight' }, { target: 'q1:stem', start: 0, end: 10, color: 'yellow', kind: 'highlight' }],
      { target: 'passage', start: 0, end: 10, color: 'yellow', kind: 'underline' });
    expect(marks).toHaveLength(3);
  });
});
