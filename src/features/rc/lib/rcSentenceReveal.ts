/** Hide sentence fragments without changing the source text or annotation offsets. */
const FRAGMENT = 'data-rc-sentence-fragment';
const BLOCK = 'data-rc-sentence-hidden';

export function rcSentenceRanges(text: string): Array<{ start: number; end: number }> {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locale: string, options: { granularity: string }) => { segment(value: string): Iterable<{ index: number; segment: string }> } }).Segmenter;
  const segments = Segmenter ? [...new Segmenter('en', { granularity: 'sentence' }).segment(text)]
    : [...text.matchAll(/[^.!?]+(?:[.!?]+(?:["'”’)]*)\s*|$)/g)].map(match => ({ index: match.index!, segment: match[0] }));
  return segments.filter(segment => segment.segment.trim()).map(segment => ({ start: segment.index, end: segment.index + segment.segment.length }));
}

export function applyRcSentenceLimit(root: HTMLElement, limit: number | undefined): number {
  for (const fragment of root.querySelectorAll(`[${FRAGMENT}]`)) fragment.replaceWith(...fragment.childNodes);
  for (const block of root.querySelectorAll<HTMLElement>(`[${BLOCK}]`)) { block.style.removeProperty('display'); block.removeAttribute(BLOCK); }
  root.normalize();
  const blocks = Array.from(root.firstElementChild?.children ?? []) as HTMLElement[];
  let total = 0;
  for (const block of blocks) {
    const text = block.textContent ?? '';
    if (/^Passage [AB]$/.test(text.trim())) {
      if (limit !== undefined && total >= limit) { block.style.display = 'none'; block.setAttribute(BLOCK, ''); }
      continue;
    }
    const ranges = rcSentenceRanges(text);
    const before = total; total += ranges.length;
    if (limit === undefined) continue;
    if (before >= limit) { block.style.display = 'none'; block.setAttribute(BLOCK, ''); }
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    let offset = 0;
    for (const node of nodes) {
      const start = offset; offset += node.length;
      const fragment = document.createDocumentFragment();
      let cursor = start;
      for (let index = 0; index < ranges.length; index++) {
        const range = ranges[index];
        const from = Math.max(start, range.start); const to = Math.min(offset, range.end);
        if (to <= from) continue;
        if (cursor < from) fragment.append(document.createTextNode(text.slice(cursor, from)));
        const span = document.createElement('span'); span.setAttribute(FRAGMENT, '');
        span.hidden = before + index >= limit;
        span.textContent = text.slice(from, to); fragment.append(span); cursor = to;
      }
      if (cursor < offset) fragment.append(document.createTextNode(text.slice(cursor, offset)));
      node.replaceWith(fragment);
    }
  }
  return total;
}
