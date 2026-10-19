/**
 * Splits an RC passage body into recall units.
 *
 * A unit is one paragraph of passage text. Comparative passages also carry an
 * italic source note and `Passage A` / `Passage B` headings. Those are labels
 * attached to the paragraph that follows them, never recall units of their own.
 */

export type SubPassage = "A" | "B";

export interface RecallParagraph {
  /** 0-based position among the passage's recall units. */
  index: number;
  text: string;
  /** Source note and heading blocks that sit directly above this paragraph. */
  labels: string[];
  /** Which sub-passage the paragraph belongs to. Null in a standard passage. */
  sub: SubPassage | null;
}

export interface SegmentedPassage {
  comparative: boolean;
  paragraphs: RecallParagraph[];
}

/** Presentation only: canonical indexes remain unchanged for saved recall keys. */
export function paragraphDisplayLabel(passage: SegmentedPassage, index: number): string | null {
  const paragraph = passage.paragraphs[index];
  if (!paragraph) return null;
  const group = passage.paragraphs.filter((item) => item.sub === paragraph.sub);
  return `${paragraph.sub ? `Passage ${paragraph.sub} · ` : ""}Paragraph ${group.indexOf(paragraph) + 1} of ${group.length}`;
}

const HEADING = /^\W*Passage\s+([AB])\W*$/i;
const ITALIC_NOTE = /^\*[^*][\s\S]*\*$/;

export class PassageSegmentError extends Error {}

export function segmentPassage(text: string): SegmentedPassage {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const paragraphs: RecallParagraph[] = [];
  let pending: string[] = [];
  let sub: SubPassage | null = null;
  let comparative = false;
  for (const block of blocks) {
    const heading = HEADING.exec(block);
    if (heading) {
      comparative = true;
      sub = heading[1].toUpperCase() as SubPassage;
      pending.push(block.replace(/\*/g, "").trim());
      continue;
    }
    // An italic one-line note ahead of the first paragraph is a source label.
    if (!paragraphs.length && !pending.length && ITALIC_NOTE.test(block) && /Passage\s+[AB]/i.test(block)) {
      comparative = true;
      pending.push(block.replace(/^\*|\*$/g, "").trim());
      continue;
    }
    paragraphs.push({ index: paragraphs.length, text: block, labels: pending, sub });
    pending = [];
  }
  if (!paragraphs.length) throw new PassageSegmentError("This passage has no text to recall.");
  // Trailing labels with no paragraph would be dropped silently; attach to the last one.
  if (pending.length) paragraphs[paragraphs.length - 1].labels.push(...pending);
  return { comparative, paragraphs };
}

/** True when text can be segmented into at least one recall unit. */
export function isSegmentable(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  try { return segmentPassage(text).paragraphs.length > 0; } catch { return false; }
}
