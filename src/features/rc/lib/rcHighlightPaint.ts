/**
 * Painting highlights and find-text matches onto already-rendered markdown.
 *
 * Highlights are stored as character offsets, never as DOM nodes, so they
 * survive a reload and can be restored on any future encounter with a passage.
 * The offsets are measured against the *rendered* text of the container rather
 * than the raw markdown source: markdown syntax (the asterisks around
 * **Passage A**) never appears on screen, so an offset into the raw string does
 * not line up with anything the student can select. Rendering is deterministic
 * from the same source, so rendered offsets round-trip reliably.
 *
 * Painting walks text nodes and wraps the overlapping slice of each one, which
 * lets a highlight span element boundaries (a range crossing a bold run, say)
 * without needing the range to be well-formed for surroundContents.
 */

import { rcHighlightColor, type RcHighlight } from './rcTypes';

export const RC_HIGHLIGHT_ATTR = 'data-rc-highlight';
export const RC_FIND_ATTR = 'data-rc-find';

export interface RcTextRange {
  start: number;
  end: number;
  color?: string;
  /** 'highlight' or 'underline'; read by the caller's styleFor. */
  kind?: string;
}

/** Every text node under `root`, in document order. */
function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node as Text);
    node = walker.nextNode();
  }
  return nodes;
}

/**
 * The current selection expressed as offsets into `container`'s rendered text.
 * Returns null when there is no selection, it is collapsed, or it never
 * touches the container.
 *
 * A selection that starts before the container or runs past it is cut at the
 * container's edges rather than rejected: a drag that overshoots the end of a
 * choice into the row's padding, or sweeps from the stem into a choice, still
 * marks the part of this surface it covered. Lengths are measured with
 * Range.toString, which concatenates text nodes exactly as painting walks
 * them; Selection.toString adds a newline at every block edge and would push
 * a multi-paragraph mark past where the drag ended.
 */
export function captureRenderedSelection(
  container: HTMLElement,
): { start: number; end: number; text: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const raw = selection.getRangeAt(0);
  const startInside = container.contains(raw.startContainer);
  const endInside = container.contains(raw.endContainer);
  if (!startInside && !endInside) {
    const touches =
      typeof raw.intersectsNode === 'function'
        ? raw.intersectsNode(container)
        : raw.commonAncestorContainer.contains(container);
    if (!touches) return null;
  }

  const range = raw.cloneRange();
  if (!startInside) range.setStart(container, 0);
  if (!endInside) range.setEnd(container, container.childNodes.length);
  if (range.collapsed) return null;

  const text = range.toString();
  if (!text.trim()) return null;

  const before = document.createRange();
  before.selectNodeContents(container);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;

  return { start, end: start + text.length, text };
}

/** Removes marks previously painted with the given attribute, restoring the text. */
export function clearMarks(container: HTMLElement, attr: string): void {
  const marks = Array.from(container.querySelectorAll(`mark[${attr}]`));
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }
  container.normalize();
}

/**
 * Wraps each range in a <mark>. Ranges are in rendered-text coordinates.
 * Existing marks with the same attribute are cleared first, so this is
 * idempotent and safe to call on every render.
 */
export function paintRanges(
  container: HTMLElement,
  ranges: RcTextRange[],
  attr: string,
  styleFor?: (range: RcTextRange) => Partial<CSSStyleDeclaration>,
): void {
  clearMarks(container, attr);
  if (ranges.length === 0) return;

  for (const range of ranges) {
    if (range.end <= range.start) continue;
    // Re-walk per range: painting mutates the tree, so offsets must be
    // recomputed against the current DOM each time.
    let offset = 0;
    for (const node of textNodes(container)) {
      const length = node.data.length;
      const nodeStart = offset;
      const nodeEnd = offset + length;
      offset = nodeEnd;

      if (nodeEnd <= range.start || nodeStart >= range.end) continue;

      const from = Math.max(0, range.start - nodeStart);
      const to = Math.min(length, range.end - nodeStart);
      if (to <= from) continue;

      // Split the node so the middle piece is exactly the overlap.
      const middle = from > 0 ? node.splitText(from) : node;
      if (to - from < middle.data.length) middle.splitText(to - from);

      const mark = document.createElement('mark');
      mark.setAttribute(attr, range.color ?? 'true');
      const style = styleFor?.(range);
      if (style) Object.assign(mark.style, style);
      middle.parentNode?.insertBefore(mark, middle);
      mark.appendChild(middle);
    }
  }
}

/**
 * Paints a student's stored marks onto one surface: the passage, a stem, or a
 * choice. One styling for all of them, so a mark looks the same wherever it
 * sits. Callers pass only the marks that belong to this surface.
 */
export function paintRcAnnotations(container: HTMLElement, highlights: RcHighlight[]): void {
  paintRanges(
    container,
    highlights.map((h) => ({
      start: h.start,
      end: h.end,
      color: h.color,
      kind: h.kind ?? 'highlight',
    })),
    RC_HIGHLIGHT_ATTR,
    (r) =>
      r.kind === 'underline'
        ? {
            backgroundColor: 'transparent',
            textDecoration: 'underline',
            textDecorationColor: 'currentColor',
            textDecorationThickness: '2px',
            textUnderlineOffset: '3px',
          }
        : {
            backgroundColor: rcHighlightColor(r.color),
            // Multiply keeps the text readable through the wash, and matches
            // how the LR player renders its markers.
            mixBlendMode: 'multiply',
          },
  );
}

/**
 * Case-insensitive matches of `query` in the container's rendered text.
 *
 * Soft hyphens (U+00AD) are invisible but sit inside some stored words, so a
 * search for "cooperate" has to find "co­operate". Matching runs on a copy
 * with them removed, and every range is mapped back to offsets in the ORIGINAL
 * text, because saved highlights and the painter both count those offsets.
 */
export function findMatches(container: HTMLElement, query: string): RcTextRange[] {
  const needle = query.replace(/­/g, '').toLowerCase();
  if (query.trim().length < 2 || needle.length === 0) return [];
  const text = container.textContent ?? '';
  let haystack = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '­') continue;
    // Lowercasing can widen one character into several; keep one origin per unit.
    for (const unit of text[i].toLowerCase()) {
      haystack += unit;
      origin.push(i);
    }
  }
  const matches: RcTextRange[] = [];
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    matches.push({ start: origin[at], end: origin[at + needle.length - 1] + 1 });
    from = at + needle.length;
  }
  return matches;
}

/** Scrolls the nth painted find-match into view. */
export function scrollToMatch(container: HTMLElement, index: number): void {
  const marks = container.querySelectorAll(`mark[${RC_FIND_ATTR}]`);
  const target = marks[index] as HTMLElement | undefined;
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  marks.forEach((m, i) => m.classList.toggle('rc-find-active', i === index));
}
