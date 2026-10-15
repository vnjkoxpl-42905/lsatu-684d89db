/**
 * What a resumed or reviewed session knows about the student's own work.
 *
 * One rule runs through all of it: **the first attempt is the student's
 * answer.** A re-answer given during review is history and nothing else.
 *
 * The player used to loop every row `getSessionAttempts` returned — all
 * attempts, oldest first — and `set` each one into the same map, so the last
 * row won. The second time a student opened a session in review, the answer
 * labelled as theirs was the re-answer they gave during the first review, and
 * the blind re-attempt exercise compared them against themselves.
 *
 * `RcResults` already reads attempts this way (`if (a.isFirstAttempt)`), so
 * this is the codebase's own model, applied in the one place that was missing
 * it rather than a new one invented here.
 *
 * Pure, and deliberately so: the player's hydration is an async effect racing a
 * session change, which is a bad place to also be deciding semantics.
 */
import type { RcSessionItem } from './rcSession';
import type { RcAttempt, RcLetter, RcRevealMode } from './rcTypes';
import { readRcDraftAnswers } from './rcTypes';

export interface RcHydrationInput {
  /** The session's questions, already flattened by `buildItems`. */
  items: RcSessionItem[];
  /** Every stored attempt for the session, oldest first. */
  attempts: RcAttempt[];
  revealMode: RcRevealMode;
  /** A `?review=1` deep link shows every question's feedback at once. */
  reviewOnly: boolean;
  /** Caller supplies these only for an active, ordinary drill. */
  draftAnswers?: unknown;
}

export interface RcHydration {
  answers: Map<number, RcLetter>;
  eliminations: Map<number, RcLetter[]>;
  flagged: Set<number>;
  recorded: Set<number>;
  revealed: Set<number>;
  reviewedPassages: Set<number>;
  submitted: boolean;
  /**
   * Later attempts, oldest first, keyed by question. History only: this never
   * seeds `reattemptPicks`, because every review visit asks for a fresh blind
   * answer. Kept so the record can be shown, not so it can be reused.
   */
  reviewAttempts: Map<number, RcAttempt[]>;
  /** Index of the first question with no answer, or -1 when all are answered. */
  firstUnansweredIndex: number;
}

export function hydrateFromAttempts({
  items,
  attempts,
  revealMode,
  reviewOnly,
  draftAnswers,
}: RcHydrationInput): RcHydration {
  const inSession = new Set(items.map((i) => i.question.questionId));

  const firstAttempts = new Map<number, RcAttempt>();
  const reviewAttempts = new Map<number, RcAttempt[]>();

  for (const a of attempts) {
    // An attempt for a question this session does not contain is not ours.
    if (!inSession.has(a.questionId)) continue;

    if (a.isFirstAttempt) {
      // The write path is read-then-insert with no database invariant, so two
      // rapid submissions can both be stored as first attempts. Rows arrive
      // oldest first, so keeping the one already seen keeps the earliest.
      if (!firstAttempts.has(a.questionId)) firstAttempts.set(a.questionId, a);
      continue;
    }

    const prior = reviewAttempts.get(a.questionId);
    if (prior) prior.push(a);
    else reviewAttempts.set(a.questionId, [a]);
  }

  const answers = new Map<number, RcLetter>();
  const eliminations = new Map<number, RcLetter[]>();
  const flagged = new Set<number>();
  const recorded = new Set<number>();

  for (const [questionId, a] of firstAttempts) {
    recorded.add(questionId);
    // A skipped question is recorded without an answer. `has` is what the rest
    // of the machine tests, so writing null here would make it look answered.
    if (a.selected) answers.set(questionId, a.selected);
    if (a.eliminations?.length) eliminations.set(questionId, [...a.eliminations]);
    if (a.flagged) flagged.add(questionId);
  }

  if (!reviewOnly) {
    for (const draft of readRcDraftAnswers(draftAnswers)) {
      const item = items.find((entry) => entry.question.questionId === draft.questionId);
      if (!item || recorded.has(draft.questionId)
        || !item.question.choices.some((choice) => choice.letter === draft.selected)) continue;
      answers.set(draft.questionId, draft.selected);
      eliminations.set(draft.questionId, [...draft.eliminations]);
      if (draft.flagged) flagged.add(draft.questionId);
    }
  }

  return {
    answers,
    eliminations,
    flagged,
    recorded,
    ...revealState(items, recorded, revealMode),
    submitted: reviewOnly,
    reviewAttempts,
    firstUnansweredIndex: items.findIndex((i) => !answers.has(i.question.questionId)),
  };
}

/**
 * Which reveals survive a resume, per mode.
 *
 * Resume used to restore none of this, so a question the student had already
 * confirmed came back unrevealed with its answer still selected — which left
 * the Confirm pill enabled and inserted a second attempt row when they pressed
 * it. `end_of_set` genuinely reveals nothing until submit, so it stays empty.
 */
function revealState(
  items: RcSessionItem[],
  recorded: Set<number>,
  mode: RcRevealMode,
): { revealed: Set<number>; reviewedPassages: Set<number> } {
  if (mode === 'per_question') {
    return { revealed: new Set(recorded), reviewedPassages: new Set() };
  }

  if (mode === 'per_passage') {
    const byPassage = new Map<number, RcSessionItem[]>();
    for (const i of items) {
      const bucket = byPassage.get(i.passage.passageId);
      if (bucket) bucket.push(i);
      else byPassage.set(i.passage.passageId, [i]);
    }
    const reviewedPassages = new Set<number>();
    for (const [passageId, passageItems] of byPassage) {
      // A passage is in review only once every one of its questions is in.
      // Half a passage is still being worked.
      if (passageItems.every((i) => recorded.has(i.question.questionId))) {
        reviewedPassages.add(passageId);
      }
    }
    return { revealed: new Set(), reviewedPassages };
  }

  return { revealed: new Set(), reviewedPassages: new Set() };
}
