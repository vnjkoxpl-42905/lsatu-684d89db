import { describe, expect, it } from 'vitest';
import { applyRcSentenceLimit, rcSentenceRanges } from './rcSentenceReveal';

function fixture() {
  const root = document.createElement('div');
  root.innerHTML = '<div><p><strong>Passage A</strong></p><p>First <em>sentence.</em> Second sentence?</p><p><strong>Passage B</strong></p><p>Third sentence! Fourth.</p></div>';
  return root;
}
describe('sentence presentation', () => {
  it('reveals real sentences across formatting while retaining all source offsets', () => {
    const root = fixture(); const original = root.textContent;
    expect(applyRcSentenceLimit(root, 1)).toBe(4);
    expect(root.textContent).toBe(original);
    expect(root.querySelector('em')?.textContent).toBe('sentence.');
    const fragments = [...root.querySelectorAll<HTMLSpanElement>('[data-rc-sentence-fragment]')];
    expect(fragments.filter(span => !span.hidden).map(span => span.textContent).join('')).toBe('First sentence. ');
    expect(root.querySelectorAll('[data-rc-sentence-hidden]')).toHaveLength(2);
    expect(applyRcSentenceLimit(root, 2)).toBe(4);
    expect(root.textContent).toBe(original);
    expect([...root.querySelectorAll<HTMLSpanElement>('[data-rc-sentence-fragment]')].filter(span => !span.hidden).map(span => span.textContent).join('')).toBe('First sentence. Second sentence?');
  });
  it('restores the complete source and does not undo separate paragraph hiding', () => {
    const root = fixture(); const original = root.textContent;
    applyRcSentenceLimit(root, 1);
    const paragraph = root.querySelectorAll('p')[3]; paragraph.hidden = true;
    applyRcSentenceLimit(root, undefined);
    expect(root.textContent).toBe(original);
    expect(root.querySelector('[data-rc-sentence-fragment]')).toBeNull();
    expect(root.querySelector('[data-rc-sentence-hidden]')).toBeNull();
    expect(paragraph.hidden).toBe(true);
  });
  it('keeps a decimal inside its sentence and treats blank text as no sentence', () => {
    expect(rcSentenceRanges('It costs 1.5 units. Why?').map(range => 'It costs 1.5 units. Why?'.slice(range.start, range.end))).toEqual(['It costs 1.5 units. ', 'Why?']);
    expect(rcSentenceRanges('  ')).toEqual([]);
  });
});
