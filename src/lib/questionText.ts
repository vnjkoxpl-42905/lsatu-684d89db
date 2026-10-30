/**
 * Text cleaning shared by every question renderer.
 *
 * These two helpers were duplicated verbatim in JournalQuestionPane and
 * OfficialQuestionPane. Lifted here so the Classroom pane is not a third copy.
 */

/**
 * A line that is a speaker turn: "Francis:", "Editorial board:", "Ana Ruiz:".
 * These carry meaning and must keep their own line even when the block around
 * them is being unwrapped.
 */
const SPEAKER_LINE = /^[A-Z][A-Za-z .'’-]{0,24}:\s/;

/**
 * Source lines longer than this are the author's own paragraphs. Shorter ones
 * are the printed test's column wrap, which we do not want to reproduce.
 * The bank's wrapped stimuli break at roughly 50 characters; real paragraphs in
 * the same bank run to several hundred.
 */
const WRAP_WIDTH = 75;

/**
 * Undoes the line wrapping the bank inherited from the printed test.
 *
 * Question panes render the stimulus with `whitespace-pre-wrap`, so every
 * newline in the bank becomes a real line break on screen. About a fifth of the
 * LR stimuli were captured with the PDF's own ~50-character wrap baked in, and
 * those rendered at the printed column's width no matter how wide our column
 * was — the stimulus sat in a narrow ragged strip with the rest of the pane
 * empty beside it.
 *
 * So: a run of short lines is reflowed into one paragraph, while blank-line
 * paragraph breaks, speaker turns, and blocks whose lines are too long to be a
 * column wrap are all left exactly as the author wrote them. A word split
 * across a wrap ("alternative-\nenergy") rejoins on its hyphen rather than
 * gaining a space.
 */
export function unwrapSourceLineBreaks(text: string): string {
  return text
    .split(/\n[ \t]*\n/)
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) return block;
      const widest = Math.max(...lines.map((l) => l.trim().length));
      if (widest > WRAP_WIDTH) return block;
      return lines.reduce((acc, line) => {
        const next = line.trim();
        if (SPEAKER_LINE.test(next)) return `${acc}\n${next}`;
        if (acc.endsWith('-')) return acc + next;
        return `${acc} ${next}`;
      });
    })
    .join('\n\n');
}

/** Strips authoring artifacts ({#123} markers, runs of whitespace) from bank text. */
export function stripDataArtifacts(text: string): string {
  return unwrapSourceLineBreaks(
    text
      .replace(/\s*\{#\d+\}\s*/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n[ \t]+/g, '\n'),
  ).trim();
}

/**
 * Removes a leading choice marker from an answer choice, so "(A) the text",
 * "[A] the text" and "A. the text" all render as "the text" under a separate
 * letter badge.
 */
export function cleanAnswerChoice(key: string, text: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return stripDataArtifacts(text)
    .replace(new RegExp(`^\\s*[-–—]?\\s*\\[${escapedKey}\\]\\s*`, 'i'), '')
    .replace(new RegExp(`^\\s*[-–—]?\\s*\\(${escapedKey}\\)\\s*`, 'i'), '')
    .replace(new RegExp(`^\\s*[-–—]?\\s*${escapedKey}[.)]\\s*`, 'i'), '')
    .trim();
}
