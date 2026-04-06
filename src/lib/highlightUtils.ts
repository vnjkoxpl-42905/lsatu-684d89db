export type HighlightColor = 'yellow' | 'pink' | 'orange' | 'underline';

export interface Highlight {
  id: string;
  start: number;
  end: number;
  text: string;
  color: HighlightColor;
  section: 'stimulus' | 'stem';
}

export function captureTextSelection(container: HTMLElement): { start: number; end: number; text: string } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const selectedText = selection.toString();
  if (!selectedText) return null;

  // ── Accurate offset mapping via data-para-start annotations ──────────────
  // HighlightedText annotates each <p> / dialogue-turn body with its raw-string
  // start offset. Within a single annotated segment there are no block boundaries,
  // so DOM text length == raw text length — no \n\n drift.
  const segments = Array.from(container.querySelectorAll<HTMLElement>('[data-para-start]'));

  if (segments.length > 0) {
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

    const startSeg = findSeg(range.startContainer);
    const endSeg   = findSeg(range.endContainer);

    if (startSeg && endSeg) {
      const rawStart = parseInt(startSeg.getAttribute('data-para-start') ?? '0')
        + withinOffset(startSeg, range.startContainer, range.startOffset);
      const rawEnd   = parseInt(endSeg.getAttribute('data-para-start') ?? '0')
        + withinOffset(endSeg, range.endContainer, range.endOffset);
      return { start: rawStart, end: rawEnd, text: selectedText };
    }
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

export function replaceOverlappingHighlights(
  existing: Highlight[], 
  newHighlight: Highlight
): Highlight[] {
  const result: Highlight[] = [];
  
  for (const h of existing) {
    // No overlap - keep as is
    if (h.end <= newHighlight.start || h.start >= newHighlight.end) {
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

function mergeAdjacentSameColor(highlights: Highlight[]): Highlight[] {
  if (highlights.length <= 1) return highlights;
  
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
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
