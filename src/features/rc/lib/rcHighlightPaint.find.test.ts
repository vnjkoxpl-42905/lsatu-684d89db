import { describe, expect, it } from 'vitest';
import { findMatches } from './rcHighlightPaint';

const box = (text: string) => {
  const el = document.createElement('div');
  el.textContent = text;
  return el;
};

describe('findMatches', () => {
  it('finds plain matches case-insensitively with the original offsets', () => {
    expect(findMatches(box('The Court held that the court erred'), 'court')).toEqual([
      { start: 4, end: 9 },
      { start: 24, end: 29 },
    ]);
  });

  it('finds a word that has a soft hyphen inside it and maps back to original offsets', () => {
    const text = 'They co\u00adoperate fully';
    const [match] = findMatches(box(text), 'cooperate');
    expect(match).toEqual({ start: 5, end: 15 });
    expect(text.slice(match.start, match.end)).toBe('co\u00adoperate');
  });

  it('ignores soft hyphens typed into the query as well', () => {
    expect(findMatches(box('cooperate'), 'co\u00adoperate')).toEqual([{ start: 0, end: 9 }]);
  });

  it('needs at least two visible characters', () => {
    expect(findMatches(box('a b c'), 'a')).toEqual([]);
    expect(findMatches(box('x'), '\u00ad\u00ad')).toEqual([]);
  });
});
