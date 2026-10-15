/**
 * The blind-review state machine had no coverage at all, which is how a review
 * surface shipped showing the student the answer it says it is hiding.
 *
 * These pin the part that decides what a resumed or reviewed session knows
 * about the student's own work. The rule under test everywhere below: the
 * FIRST attempt is the student's answer. A re-answer given during review is
 * history, never the thing the player treats as theirs — otherwise the second
 * visit to review compares them against themselves and calls it first-vs-second.
 */
import { describe, it, expect } from 'vitest';
import { buildItems } from './rcSession';
import { hydrateFromAttempts } from './rcHydration';
import type { RcAttempt, RcLetter, RcPassage, RcQuestion } from './rcTypes';

function question(questionId: number, correctAnswer: RcLetter = 'A'): RcQuestion {
  return {
    questionId,
    position: questionId,
    questionType: 'Main Point',
    questionTypeFamily: 'Big Picture',
    difficulty: 3,
    prompt: `Question ${questionId}`,
    correctAnswer,
    hasWrittenExplanation: true,
    explanationBlocks: [],
    totalResponses: 100,
    features: [],
    choices: [],
  };
}

function passage(passageId: number, questionIds: number[]): RcPassage {
  return {
    passageId,
    preptest: 139,
    section: 3,
    setNumber: passageId,
    title: `Passage ${passageId}`,
    topic: null,
    format: null,
    frameworks: [],
    difficulty: 3,
    text: 'Body.',
    summaries: { standard: null, brief: null, anotherWay: null },
    questions: questionIds.map((id) => question(id)),
  };
}

function attempt(over: Partial<RcAttempt> & { questionId: number }): RcAttempt {
  return {
    sessionId: 's1',
    passageId: 1,
    selected: 'A',
    isCorrect: true,
    timeMs: 1000,
    flagged: false,
    eliminations: [],
    isFirstAttempt: true,
    ...over,
  };
}

/** Two passages, two questions each: 101/102 in passage 1, 201/202 in passage 2. */
const ITEMS = buildItems([passage(1, [101, 102]), passage(2, [201, 202])]);

describe('hydrateFromAttempts', () => {
  const draft = { questionId: 101, selected: 'B', attemptId: '33333333-3333-4333-8333-333333333333', flagged: true, eliminations: ['C'] };
  const draftItems = ITEMS.map((item) => ({ ...item, question: { ...item.question,
    choices: ['A', 'B', 'C'].map((letter) => ({ letter: letter as RcLetter, text: letter, correct: letter === 'A', tag: null, percent: null, responseCount: null, explanation: null })),
  } }));

  it.each(['per_passage', 'per_question', 'end_of_set'] as const)('restores validated %s drafts without recording or revealing them', (revealMode) => {
    const h = hydrateFromAttempts({ items: draftItems, attempts: [], revealMode, reviewOnly: false, draftAnswers: [draft, { ...draft, questionId: 102 }] });
    expect([...h.answers]).toEqual([[101, 'B'], [102, 'B']]);
    expect(h.flagged.has(101)).toBe(true);
    expect(h.eliminations.get(101)).toEqual(['C']);
    expect(h.recorded.size).toBe(0);
    expect(h.revealed.size).toBe(0);
    expect(h.reviewedPassages.size).toBe(0);
    expect(h.submitted).toBe(false);
  });

  it('keeps recorded answers and skips authoritative over account drafts', () => {
    const h = hydrateFromAttempts({ items: draftItems,
      attempts: [attempt({ questionId: 101, selected: 'A' }), attempt({ questionId: 102, selected: null })],
      revealMode: 'per_question', reviewOnly: false, draftAnswers: [draft, { ...draft, questionId: 102 }],
    });
    expect(h.answers.get(101)).toBe('A');
    expect(h.answers.has(102)).toBe(false);
    expect(h.flagged.size).toBe(0);
    expect(h.eliminations.size).toBe(0);
  });

  it('ignores malformed, out-of-session, and unavailable-choice drafts, and all drafts in review', () => {
    const invalid = [null, { ...draft, questionId: -1 }, { ...draft, selected: 'Z' }, { ...draft, attemptId: 'bad' },
      { ...draft, flagged: 'yes' }, { ...draft, eliminations: ['Z'] }, { ...draft, questionId: 999 }, { ...draft, selected: 'E' }];
    const input = { items: draftItems, attempts: [], revealMode: 'per_passage' as const, reviewOnly: false };
    expect(hydrateFromAttempts({ ...input, draftAnswers: invalid }).answers.size).toBe(0);
    expect(hydrateFromAttempts({ ...input, draftAnswers: { answers: [draft] } }).answers.size).toBe(0);
    expect(hydrateFromAttempts({ ...input, reviewOnly: true, draftAnswers: [draft] }).answers.size).toBe(0);
  });

  it('takes the answer from the first attempt, not the latest one', () => {
    // The exact shape that was breaking: the student answered B, reviewed the
    // session once and re-answered D. getSessionAttempts returns both, oldest
    // first, so a plain loop leaves D standing as "their" answer.
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [
        attempt({ questionId: 101, selected: 'B', isFirstAttempt: true }),
        attempt({ questionId: 101, selected: 'D', isFirstAttempt: false }),
      ],
      revealMode: 'per_question',
      reviewOnly: true,
    });

    expect(h.answers.get(101)).toBe('B');
  });

  it('keeps later attempts as history and never as the current answer', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [
        attempt({ questionId: 101, selected: 'B', isFirstAttempt: true }),
        attempt({ questionId: 101, selected: 'D', isFirstAttempt: false }),
        attempt({ questionId: 101, selected: 'E', isFirstAttempt: false }),
      ],
      revealMode: 'per_question',
      reviewOnly: true,
    });

    expect(h.answers.get(101)).toBe('B');
    expect(h.reviewAttempts.get(101)?.map((a) => a.selected)).toEqual(['D', 'E']);
  });

  it('restores the cross-outs the student actually made, from the first attempt', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [
        attempt({ questionId: 101, selected: 'B', eliminations: ['C', 'E'] }),
        attempt({ questionId: 101, selected: 'D', isFirstAttempt: false, eliminations: [] }),
      ],
      revealMode: 'per_question',
      reviewOnly: true,
    });

    // Not [] — the re-attempt's empty set must not erase the first attempt's work.
    expect(h.eliminations.get(101)).toEqual(['C', 'E']);
  });

  it('marks a question recorded on its first attempt only', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [attempt({ questionId: 101 }), attempt({ questionId: 102 })],
      revealMode: 'end_of_set',
      reviewOnly: false,
    });

    expect([...h.recorded].sort()).toEqual([101, 102]);
    expect(h.recorded.has(201)).toBe(false);
  });

  it('records a skipped question without giving it an answer', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [attempt({ questionId: 101, selected: null, isCorrect: null })],
      revealMode: 'per_question',
      reviewOnly: false,
    });

    expect(h.recorded.has(101)).toBe(true);
    expect(h.answers.has(101)).toBe(false);
  });

  describe('reveal state, which resume used to drop entirely', () => {
    it('restores per-question reveals so Confirm cannot write a second row', () => {
      const h = hydrateFromAttempts({
        items: ITEMS,
        attempts: [attempt({ questionId: 101 })],
        revealMode: 'per_question',
        reviewOnly: false,
      });

      expect(h.revealed.has(101)).toBe(true);
      expect(h.revealed.has(102)).toBe(false);
    });

    it('restores a per-passage review only once the whole passage is answered', () => {
      const partial = hydrateFromAttempts({
        items: ITEMS,
        attempts: [attempt({ questionId: 101 })],
        revealMode: 'per_passage',
        reviewOnly: false,
      });
      expect(partial.reviewedPassages.has(1)).toBe(false);

      const whole = hydrateFromAttempts({
        items: ITEMS,
        attempts: [attempt({ questionId: 101 }), attempt({ questionId: 102 })],
        revealMode: 'per_passage',
        reviewOnly: false,
      });
      expect(whole.reviewedPassages.has(1)).toBe(true);
      expect(whole.reviewedPassages.has(2)).toBe(false);
    });

    it('reveals nothing per-question in a mode that reveals per passage', () => {
      const h = hydrateFromAttempts({
        items: ITEMS,
        attempts: [attempt({ questionId: 101 })],
        revealMode: 'per_passage',
        reviewOnly: false,
      });

      expect(h.revealed.size).toBe(0);
    });

    it('reveals nothing at all in end_of_set until the session is submitted', () => {
      const h = hydrateFromAttempts({
        items: ITEMS,
        attempts: [attempt({ questionId: 101 }), attempt({ questionId: 102 })],
        revealMode: 'end_of_set',
        reviewOnly: false,
      });

      expect(h.revealed.size).toBe(0);
      expect(h.reviewedPassages.size).toBe(0);
      expect(h.submitted).toBe(false);
    });
  });

  it('a review deep link opens every question at once', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [attempt({ questionId: 101 })],
      revealMode: 'end_of_set',
      reviewOnly: true,
    });

    expect(h.submitted).toBe(true);
  });

  it('takes the flag from the stored attempt', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [
        attempt({ questionId: 101, flagged: true }),
        attempt({ questionId: 102, flagged: false }),
      ],
      revealMode: 'per_question',
      reviewOnly: false,
    });

    expect(h.flagged.has(101)).toBe(true);
    expect(h.flagged.has(102)).toBe(false);
  });

  it('points a resumed drill at the first question with no answer', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [attempt({ questionId: 101 }), attempt({ questionId: 102 })],
      revealMode: 'end_of_set',
      reviewOnly: false,
    });

    // 101 and 102 are indexes 0 and 1, so the next unanswered is 201 at index 2.
    expect(h.firstUnansweredIndex).toBe(2);
  });

  it('reports no unanswered question once every one is answered', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: ITEMS.map((i) => attempt({ questionId: i.question.questionId })),
      revealMode: 'end_of_set',
      reviewOnly: false,
    });

    expect(h.firstUnansweredIndex).toBe(-1);
  });

  it('ignores attempts for questions that are not in this session', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [attempt({ questionId: 999 })],
      revealMode: 'per_question',
      reviewOnly: false,
    });

    expect(h.answers.size).toBe(0);
    expect(h.recorded.size).toBe(0);
    expect(h.revealed.size).toBe(0);
  });

  it('survives a session with no attempts at all', () => {
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [],
      revealMode: 'per_question',
      reviewOnly: false,
    });

    expect(h.answers.size).toBe(0);
    expect(h.firstUnansweredIndex).toBe(0);
  });

  it('treats a stray duplicate first row as one first attempt, keeping the earliest', () => {
    // The write path is read-then-insert with no database invariant, so two
    // rapid submissions can both be stored as first attempts. Until that has a
    // unique index behind it, the read side must not let the later one win.
    const h = hydrateFromAttempts({
      items: ITEMS,
      attempts: [
        attempt({ questionId: 101, selected: 'B', isFirstAttempt: true }),
        attempt({ questionId: 101, selected: 'C', isFirstAttempt: true }),
      ],
      revealMode: 'per_question',
      reviewOnly: true,
    });

    expect(h.answers.get(101)).toBe('B');
  });
});
