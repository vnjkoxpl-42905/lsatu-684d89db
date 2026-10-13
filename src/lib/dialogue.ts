// Shared speaker-label detection for dialogue-style stimuli.
//
// A "speaker label" is a short Title-Case name/title that introduces a turn,
// e.g. "Figorian Wildlife Commission:" or "Editorial:". Both the question loader
// (which inserts paragraph breaks between turns) and the renderer
// (HighlightedText, which bolds each turn) must agree on what counts as a label,
// so the heuristic lives here as a single source of truth.

/** Matches a candidate speaker label at the start of a string: `Word...:` + space. */
export const speakerLabelPattern = /^([A-Z][A-Za-z’' -]{1,80}):\s+/;

/** Lowercase connective words allowed inside an otherwise Title-Case label. */
const CONNECTIVES = new Set([
  'of', 'the', 'and', 'for', 'to', 'in', 'on', 'de', 'von', 'van', 'der', '&',
]);

const MAX_LABEL_WORDS = 6;

/**
 * True when `label` looks like a genuine speaker name/title rather than an
 * ordinary sentence clause that happens to end with a colon.
 *
 * Accepts "Figorian Wildlife Commission" (every word Title-Case).
 * Rejects "To protect wildlife we must regulate such development in Figoria"
 * (lowercase content words, and too long).
 */
export function looksLikeSpeakerLabel(label: string): boolean {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > MAX_LABEL_WORDS) return false;

  return words.every(
    (word) => /^[A-Z]/.test(word) || CONNECTIVES.has(word.toLowerCase()),
  );
}
