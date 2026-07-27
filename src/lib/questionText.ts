/**
 * Text cleaning shared by every question renderer.
 *
 * These two helpers were duplicated verbatim in JournalQuestionPane and
 * OfficialQuestionPane. Lifted here so the Classroom pane is not a third copy.
 */

/** Strips authoring artifacts ({#123} markers, runs of whitespace) from bank text. */
export function stripDataArtifacts(text: string): string {
  return text
    .replace(/\s*\{#\d+\}\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
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
