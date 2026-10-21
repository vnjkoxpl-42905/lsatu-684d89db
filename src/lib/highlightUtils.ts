export type HighlightColor = 'yellow' | 'pink' | 'orange' | 'underline';

/** What the toolbar's marker buttons can be set to. */
export type HighlightMode = HighlightColor | 'none' | 'erase';

/**
 * Where a highlight lives. Each section is its own raw string with its own
 * 0-based offsets: the stimulus, the stem, and every answer choice by letter.
 * Offsets from one section never mean anything in another, which is why every
 * overlap test below is scoped to the section first.
 */
export type HighlightSection = 'stimulus' | 'stem' | `choice:${string}`;

export function choiceSection(key: string): HighlightSection {
  return `choice:${key}`;
}

export interface Highlight {
  id: string;
  start: number;
  end: number;
  text: string;
  color: HighlightColor;
  section: HighlightSection;
}

/**
 * A highlightable block on screen: the element that holds one section's text
 * and the raw string it was rendered from. The source string is what offsets
 * are measured against, so `text` on a stored highlight is always a slice of
 * it rather than whatever the DOM happened to serialise.
 */
export interface HighlightRegion {
  section: HighlightSection;
  container: HTMLElement;
  source: string;
}

export interface CapturedSelection {
  section: HighlightSection;
  start: number;
  end: number;
  text: string;
}

/**
 * Clamp the live selection to `container`. Returns null when the selection is
 * collapsed or does not touch the container at all. A selection that starts
 * before the container (on the question number, in the previous block) or
 * runs past its end is cut at the container's edges rather than rejected,
 * so a drag that overshoots still highlights the part it covered.
 */
function selectionWithin(container: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const raw = selection.getRangeAt(0);
  const startInside = container.contains(raw.startContainer);
  const endInside = container.contains(raw.endContainer);
  if (!startInside && !endInside) {
    // Either the whole container sits inside the selection or none of it does.
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
  return range;
}

export function captureTextSelection(container: HTMLElement): { start: number; end: number; text: string } | null {
  const range = selectionWithin(container);
  if (!range) return null;

  const selectedText = range.toString();
  if (!selectedText.trim()) return null;

  // ── Accurate offset mapping via data-para-start annotations ──────────────
  // HighlightedText annotates each <p> / dialogue-turn body with its raw-string
  // start offset. Within a single annotated segment there are no block boundaries,
  // so DOM text length == raw text length — no \n\n drift.
  const segments = Array.from(container.querySelectorAll<HTMLElement>('[data-para-start]'));

  if (segments.length > 0) {
    const segStart = (seg: HTMLElement) => parseInt(seg.getAttribute('data-para-start') ?? '0');

    // Returns the character offset from the start of `seg` to `node:nodeOffset`
    const withinOffset = (seg: HTMLElement, node: Node, nodeOffset: number): number => {
      const r = document.createRange();
      r.setStart(seg, 0);
      r.setEnd(node, nodeOffset);
      return r.toString().length;
    };

    // Find the annotated segment that contains a given DOM node
    const findSeg = (node: Node): HTMLElement | null => {
      for (const seg of segments) {
        if (seg === node || seg.contains(node)) return seg;
      }
      return null;
    };

    // A boundary that landed outside every segment (on the question number,
    // in padding, at the clamped container edge) snaps to the nearest segment
    // edge inside the selection instead of falling back to a DOM-length count
    // that would shift the whole highlight by the stray characters.
    const segmentRange = (seg: HTMLElement) => {
      const r = document.createRange();
      r.selectNodeContents(seg);
      return r;
    };
    const firstSegmentAfterStart = (): HTMLElement | null =>
      segments.find((seg) => range.compareBoundaryPoints(Range.START_TO_START, segmentRange(seg)) <= 0) ?? null;
    const lastSegmentBeforeEnd = (): HTMLElement | null => {
      for (let i = segments.length - 1; i >= 0; i--) {
        if (range.compareBoundaryPoints(Range.END_TO_END, segmentRange(segments[i])) >= 0) return segments[i];
      }
      return null;
    };

    const startSeg = findSeg(range.startContainer);
    const endSeg = findSeg(range.endContainer);

    let rawStart: number | null = null;
    let rawEnd: number | null = null;
    if (startSeg) {
      rawStart = segStart(startSeg) + withinOffset(startSeg, range.startContainer, range.startOffset);
    } else {
      const seg = firstSegmentAfterStart();
      if (seg) rawStart = segStart(seg);
    }
    if (endSeg) {
      rawEnd = segStart(endSeg) + withinOffset(endSeg, range.endContainer, range.endOffset);
    } else {
      const seg = lastSegmentBeforeEnd();
      if (seg) rawEnd = segStart(seg) + (seg.textContent?.length ?? 0);
    }

    if (rawStart !== null && rawEnd !== null && rawEnd > rawStart) {
      return { start: rawStart, end: rawEnd, text: selectedText };
    }
    if (rawStart !== null && rawEnd !== null) return null;
  }

  // ── Fallback for containers without data-para-start ──────────────────────
  const containerRange = document.createRange();
  containerRange.selectNodeContents(container);
  const beforeRange = containerRange.cloneRange();
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const start = beforeRange.toString().length;
  const end   = start + selectedText.length;
  return { start, end, text: selectedText };
}

/**
 * One drag can cross the stem and two answer choices. Every region it touches
 * gets its own capture, each clipped to that region's text, so the student
 * gets exactly what she swept rather than only the block the mouse came up in.
 * Whitespace-only slivers (the gap between blocks) are dropped.
 */
export function captureSelectionAcross(regions: HighlightRegion[]): CapturedSelection[] {
  const captured: CapturedSelection[] = [];
  for (const region of regions) {
    const hit = captureTextSelection(region.container);
    if (!hit) continue;
    const start = Math.max(0, Math.min(hit.start, region.source.length));
    const end = Math.max(start, Math.min(hit.end, region.source.length));
    const text = region.source.slice(start, end);
    if (!text.trim()) continue;
    captured.push({ section: region.section, start, end, text });
  }
  return captured;
}

/**
 * Add a highlight, cutting away whatever it overlaps in the same section
 * ("last action wins"). Highlights in other sections are untouched: the
 * stem's offset 0 and the stimulus's offset 0 are different characters.
 */
export function replaceOverlappingHighlights(
  existing: Highlight[],
  newHighlight: Highlight
): Highlight[] {
  const result: Highlight[] = [];

  for (const h of existing) {
    // Different section, or no overlap - keep as is
    if (h.section !== newHighlight.section || h.end <= newHighlight.start || h.start >= newHighlight.end) {
      result.push(h);
      continue;
    }

    // Has overlap - split and keep non-overlapping portions
    // Keep the part before the new highlight
    if (h.start < newHighlight.start) {
      const beforeText = h.text.slice(0, newHighlight.start - h.start);
      result.push({
        ...h,
        id: `${h.id}-before`,
        end: newHighlight.start,
        text: beforeText
      });
    }

    // Keep the part after the new highlight
    if (h.end > newHighlight.end) {
      const offset = newHighlight.end - h.start;
      const afterText = h.text.slice(offset);
      result.push({
        ...h,
        id: `${h.id}-after`,
        start: newHighlight.end,
        text: afterText
      });
    }
  }

  // Add the new highlight
  result.push(newHighlight);

  // Merge adjacent highlights of the same color
  return mergeAdjacentSameColor(result);
}

/**
 * Remove [start, end) from every highlight in `section`, keeping the parts
 * either side. This is the eraser's drag; the eraser's click removes a whole
 * highlight by id and does not come through here.
 */
export function eraseRange(
  existing: Highlight[],
  section: HighlightSection,
  start: number,
  end: number,
): Highlight[] {
  const result: Highlight[] = [];
  for (const h of existing) {
    if (h.section !== section || h.end <= start || h.start >= end) {
      result.push(h);
      continue;
    }
    if (h.start < start) {
      result.push({ ...h, id: `${h.id}-before`, end: start, text: h.text.slice(0, start - h.start) });
    }
    if (h.end > end) {
      result.push({ ...h, id: `${h.id}-after`, start: end, text: h.text.slice(end - h.start) });
    }
  }
  return result;
}

function mergeAdjacentSameColor(highlights: Highlight[]): Highlight[] {
  if (highlights.length <= 1) return highlights;

  const sorted = [...highlights].sort((a, b) =>
    a.section === b.section ? a.start - b.start : a.section < b.section ? -1 : 1,
  );
  const merged: Highlight[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If adjacent and same color, merge
    if (next.start === current.end && next.color === current.color && next.section === current.section) {
      current = {
        ...current,
        end: next.end,
        text: current.text + next.text,
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}

export function mergeOverlappingHighlights(highlights: Highlight[]): Highlight[] {
  if (highlights.length <= 1) return highlights;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const merged: Highlight[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If overlapping or adjacent, merge and prefer the latest color
    if (next.start <= current.end) {
      current = {
        ...next, // Use next highlight's properties (newer)
        start: Math.min(current.start, next.start),
        end: Math.max(current.end, next.end),
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}
