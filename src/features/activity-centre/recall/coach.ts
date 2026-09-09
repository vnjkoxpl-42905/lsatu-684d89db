/**
 * The first-run walkthrough for a Read, Recall, Colour section.
 *
 * A student's first section is the only one she does not already know the
 * shape of, and the briefing page she read a minute ago is gone by the time
 * the first stimulus is on screen. So for the first three stimuli only, a
 * quiet card sits beside the paper and says what to do now and what happens
 * next. After that it goes, and it never comes back.
 *
 * Two hard rules, both about not getting in the way:
 *
 * - **It is never in the loop.** It takes no key, blocks nothing, judges
 *   nothing and gates nothing. Space still does the same thing it always did,
 *   at the same moment. The card is text next to the drill, not a step in it.
 * - **It ends by itself.** Three stimuli, then it is gone whether or not she
 *   dismissed it, and the "seen" flag is written the first time a section
 *   starts, so a second section is bare even if the first was abandoned.
 */

/** How many stimuli the walkthrough covers before it retires itself. */
export const COACHED_STIMULI = 3;

const KEY = "rrc.section.walkthrough.seen";

function storageKey(studentId: string): string {
  return `${KEY}.${studentId}`;
}

/** Has this student already been walked through a section? */
export function hasSeenWalkthrough(studentId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(studentId)) === "1";
  } catch {
    // A browser refusing storage should not force the walkthrough on every
    // run for ever; treating it as seen is the less annoying failure.
    return true;
  }
}

/** Remember that it has been shown. Called once, when the first run starts. */
export function markWalkthroughSeen(studentId: string): void {
  try {
    window.localStorage.setItem(storageKey(studentId), "1");
  } catch {
    /* storage refused; nothing to do */
  }
}

export interface CoachNote {
  /** 1-based, of `COACHED_STIMULI`. */
  step: number;
  of: number;
  title: string;
  body: string;
  /** What happens the moment she presses Space. */
  next: string;
}

const WORKING: { title: string; body: string; next: string }[] = [
  {
    title: "Read it, out loud in pieces",
    body: "Take the stimulus a piece at a time. After each piece, say it back in your own words, then say what that piece is doing in the argument — the colour. Evidence, conclusion, someone else's view, a concession. Keep talking; nothing here is being marked as you go.",
    next: "Space hides the text and asks you to recall the whole thing.",
  },
  {
    title: "Same again, and do not vet yourself",
    body: "Second one. Say the wrong word rather than pausing to find the right one — the drill is training you to keep reading and talking at once, so a rough colour said out loud beats a perfect one thought silently.",
    next: "Space hides the text for the recall.",
  },
  {
    title: "Last one with help",
    body: "You have the rhythm now: read a piece, say it back, colour it. From the next stimulus on, this card is gone and it is just you, the paper and the clock.",
    next: "Space hides the text for the recall.",
  },
];

const RECALLING: { title: string; body: string; next: string }[] = [
  {
    title: "Now say it back from memory",
    body: "The text is gone on purpose. Recap the whole argument out loud — what was claimed, what it rested on, where it turned. It does not need to be word perfect; it needs to be the argument.",
    next: "Space brings up the next stimulus.",
  },
  {
    title: "Recall it whole",
    body: "Again from memory, whole argument. If you lose a piece, say so out loud and carry on — a gap you name is worth more than a silence.",
    next: "Space brings up the next stimulus.",
  },
  {
    title: "Recall it, then you are on your own",
    body: "Say the argument back one more time. After this the card retires and you run the section on your own, one take to the end. You can pause if you have to, and you cannot go back.",
    next: "Space brings up the next stimulus.",
  },
];

/**
 * The note for where she is, or null once the walkthrough is over.
 *
 * `item` is 0-based, matching the cursor.
 */
export function coachNote(item: number, phase: "working" | "recalling"): CoachNote | null {
  if (item < 0 || item >= COACHED_STIMULI) return null;
  const source = phase === "working" ? WORKING : RECALLING;
  const note = source[item];
  if (!note) return null;
  return { step: item + 1, of: COACHED_STIMULI, ...note };
}
