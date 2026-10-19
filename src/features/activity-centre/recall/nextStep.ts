import { missKind, MISS_LABEL, type MissKind } from "./misses";
import type { SectionGradeSummary, SectionStimulusGrade } from "../api/types";

/**
 * One sentence saying what to do tomorrow.
 *
 * The Report Card reports and does not advise. The audit asked the plain
 * question "would she know what to do next?" and the answer was no: every
 * number on the card is a description of what happened, and a student who
 * reads it learns that she held 94% and nothing about what to change.
 *
 * Everything this needs was already stored and shown as an observation. The
 * habits row says "3 with no reaction of your own"; it does not say that the
 * reaction is the half of the drill that makes the memory stick. That gap
 * between the count and the instruction is all this closes.
 *
 * ## The rules it obeys
 *
 * **Derived only from stored fields.** Nothing here infers, estimates or
 * encourages. If the run does not say something clearly, this says nothing.
 *
 * **Exactly one, or none.** Two pieces of advice are a list, and a list is what
 * a student ignores. The order below is a real ranking rather than a fallback
 * chain: the method beats the content, because a run done the wrong way cannot
 * be fixed by remembering harder.
 *
 * **Never a generic encouragement.** "Keep going" is the failure mode this is
 * written against. A run with nothing to say about it gets nothing.
 */

/**
 * How much of a run a fault has to touch before it is the thing to work on.
 *
 * A third. Below that it is one bad stimulus, which the row for that stimulus
 * already says, and hoisting it to the top of the card overstates it.
 */
const SHARE = 1 / 3;

/**
 * How many Details of one kind she has to have dropped before the pattern is a
 * pattern, and how much of her dropping it has to account for.
 *
 * A single run is a small sample. Three misses of one kind, holding a third of
 * everything she dropped, is the least that separates a habit from an accident.
 */
const KIND_FLOOR = 3;

export function nextStep(
  section: SectionGradeSummary,
  stimuli: SectionStimulusGrade[],
): string | null {
  const graded = stimuli.length;
  if (graded === 0) return null;
  const enough = (n: number) => n / graded >= SHARE;

  /*
   * The Read first, because it is the criterion the method is built around.
   *
   * Coverage answers "did you hold it" and The Read answers "did you understand
   * it". A student who says every detail back and never says what the argument
   * was doing has done a memory exercise, and this drill is not one.
   */
  const noRead = section.no_read_count ?? 0;
  if (noRead > 0 && enough(noRead)) {
    return `You gave no Read at all on ${noRead} of them. Before you move on from a stimulus, say in one line what the argument was doing. That is the part that shows up in your score.`;
  }

  /*
   * Then the three ways of running it that make the number meaningless. Order
   * among them is by how far each one is from the drill: saying it back word
   * for word is not recall at all, a list is recall without understanding, and
   * no reaction is understanding without anything to hold it.
   */
  if (section.reciting_count > 0 && enough(section.reciting_count)) {
    return `On ${section.reciting_count} of them you said it back close to word for word. Cover the text and put it in your own words, even clumsy ones. Your own words are what the memory holds onto.`;
  }
  if (section.listing_count > 0 && enough(section.listing_count)) {
    return `On ${section.listing_count} of them you told it as a list of facts. Say what the argument was trying to do with those facts, so the order comes back with them.`;
  }
  if (section.uncoloured_count > 0 && enough(section.uncoloured_count)) {
    return `On ${section.uncoloured_count} of them you added no reaction of your own. Say one thing you think about the claim as you go, even a doubt. It is what makes it stick.`;
  }

  /*
   * Then what she drops, when there is enough of one kind to call it a pattern.
   *
   * Counted rather than shared, because one card cannot compute the share: it
   * stores the Details she missed and not the ones she carried. A raw count
   * would name "Plain facts" on every card ever printed, since plain facts
   * outnumber everything else about eight to one, so the residual bucket is
   * excluded and the leader has to hold a third of her misses on its own.
   */
  const dropped = new Map<MissKind, number>();
  for (const s of stimuli) {
    for (const text of s.missed) dropped.set(missKind(text), (dropped.get(missKind(text)) ?? 0) + 1);
  }
  const total = [...dropped.values()].reduce((a, b) => a + b, 0);
  const [kind, count] = [...dropped.entries()]
    .filter(([k]) => k !== "claim")
    .sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  if (kind && count >= KIND_FLOOR && count / total >= SHARE) {
    return `${MISS_LABEL[kind]} is what went missing most: ${count} of the ${total} details you dropped. Say those out loud on purpose as you read the chunk.`;
  }

  // Nothing this run said clearly enough to act on. Better than a sentence she
  // would learn to skip.
  return null;
}
