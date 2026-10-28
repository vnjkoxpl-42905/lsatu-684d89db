import { afterEach, describe, expect, it } from 'vitest';
import {
  captureSelectionAcross,
  captureTextSelection,
  choiceSection,
  eraseRange,
  replaceOverlappingHighlights,
  type Highlight,
} from './highlightUtils';

const h = (
  id: string,
  start: number,
  end: number,
  section: Highlight['section'],
  color: Highlight['color'] = 'yellow',
  text = 'x'.repeat(end - start),
): Highlight => ({ id, start, end, text, color, section });

describe('replaceOverlappingHighlights', () => {
  it('cuts away only the same section it overlaps', () => {
    const existing = [h('stim', 0, 150, 'stimulus'), h('stem', 0, 40, 'stem')];
    const result = replaceOverlappingHighlights(existing, h('new', 10, 30, 'stem', 'pink'));
    // The stem one is split around the new mark; the stimulus one, which
    // shares the same numbers in a different string, is untouched.
    expect(result.find((x) => x.id === 'stim')).toEqual(existing[0]);
    expect(result.filter((x) => x.section === 'stem').map((x) => [x.start, x.end, x.color])).toEqual([
      [0, 10, 'yellow'],
      [10, 30, 'pink'],
      [30, 40, 'yellow'],
    ]);
  });

  it('a stimulus mark never deletes a stem mark at the same offsets', () => {
    // This was the bug: highlight the stem, then highlight the opening of the
    // stimulus, and the stem mark vanished.
    const result = replaceOverlappingHighlights([h('stem', 0, 40, 'stem')], h('stim', 0, 150, 'stimulus'));
    expect(result.map((x) => x.id).sort()).toEqual(['stem', 'stim']);
  });

  it('keeps each choice in its own lane', () => {
    const result = replaceOverlappingHighlights(
      [h('a', 0, 10, choiceSection('A'))],
      h('b', 0, 10, choiceSection('B')),
    );
    expect(result).toHaveLength(2);
  });

  it('merges adjacent same-colour marks within a section only', () => {
    const result = replaceOverlappingHighlights(
      [h('a1', 0, 5, choiceSection('A'), 'yellow', 'aaaaa'), h('s1', 5, 9, 'stem', 'yellow', 'ssss')],
      h('a2', 5, 9, choiceSection('A'), 'yellow', 'bbbb'),
    );
    const a = result.filter((x) => x.section === choiceSection('A'));
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ start: 0, end: 9, text: 'aaaaabbbb' });
    expect(result.find((x) => x.section === 'stem')).toMatchObject({ start: 5, end: 9 });
  });
});

describe('eraseRange', () => {
  it('removes the swept part and leaves the rest, in that section only', () => {
    const existing = [h('a', 0, 20, choiceSection('A')), h('b', 0, 20, choiceSection('B'))];
    const result = eraseRange(existing, choiceSection('A'), 5, 10);
    expect(result.filter((x) => x.section === choiceSection('A')).map((x) => [x.start, x.end])).toEqual([
      [0, 5],
      [10, 20],
    ]);
    expect(result.find((x) => x.id === 'b')).toEqual(existing[1]);
  });
});

describe('captureTextSelection', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
  });

  function mount(html: string): HTMLElement {
    document.body.innerHTML = html;
    return document.body.firstElementChild as HTMLElement;
  }

  function select(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  it('maps a selection inside an annotated paragraph to raw offsets', () => {
    const el = mount('<div><p data-para-start="0">Which one of the following</p></div>');
    const text = el.querySelector('p')!.firstChild!;
    select(text, 6, text, 9);
    expect(captureTextSelection(el)).toEqual({ start: 6, end: 9, text: 'one' });
  });

  it('snaps a start on the question number to the start of the stem', () => {
    // The "26." lives beside the stem, outside the container. A drag that
    // starts on it used to fall back to a DOM count and shift the mark.
    document.body.innerHTML =
      '<div class="row"><span class="num">26.</span><div class="stem"><p data-para-start="0">Which one of the following</p></div></div>';
    const num = document.querySelector('.num')!.firstChild!;
    const stem = document.querySelector('.stem') as HTMLElement;
    const text = stem.querySelector('p')!.firstChild!;
    select(num, 0, text, 9);
    expect(captureTextSelection(stem)).toMatchObject({ start: 0, end: 9 });
  });

  it('clips a selection that runs past the container to its end', () => {
    document.body.innerHTML =
      '<div><div class="a"><p data-para-start="0">alpha beta</p></div><div class="b"><p data-para-start="0">gamma delta</p></div></div>';
    const a = document.querySelector('.a') as HTMLElement;
    const b = document.querySelector('.b') as HTMLElement;
    const aText = a.querySelector('p')!.firstChild!;
    const bText = b.querySelector('p')!.firstChild!;
    select(aText, 6, bText, 5);
    expect(captureTextSelection(a)).toMatchObject({ start: 6, end: 10 });
    expect(captureTextSelection(b)).toMatchObject({ start: 0, end: 5 });
  });

  it('returns null for a container the selection never touched', () => {
    document.body.innerHTML =
      '<div><div class="a"><p data-para-start="0">alpha</p></div><div class="b"><p data-para-start="0">beta</p></div></div>';
    const a = document.querySelector('.a') as HTMLElement;
    const b = document.querySelector('.b') as HTMLElement;
    const aText = a.querySelector('p')!.firstChild!;
    select(aText, 0, aText, 3);
    expect(captureTextSelection(b)).toBeNull();
  });
});

describe('captureSelectionAcross', () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    document.body.innerHTML = '';
  });

  it('gives every touched region its own slice of the source text', () => {
    document.body.innerHTML =
      '<div><div class="stem"><p data-para-start="0">Which one</p></div><div class="a"><p data-para-start="0">Almost all</p></div></div>';
    const stem = document.querySelector('.stem') as HTMLElement;
    const a = document.querySelector('.a') as HTMLElement;
    const range = document.createRange();
    range.setStart(stem.querySelector('p')!.firstChild!, 6);
    range.setEnd(a.querySelector('p')!.firstChild!, 6);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const captured = captureSelectionAcross([
      { section: 'stem', container: stem, source: 'Which one' },
      { section: choiceSection('A'), container: a, source: 'Almost all' },
    ]);
    expect(captured).toEqual([
      { section: 'stem', start: 6, end: 9, text: 'one' },
      { section: choiceSection('A'), start: 0, end: 6, text: 'Almost' },
    ]);
  });
});
