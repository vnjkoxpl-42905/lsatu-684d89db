import { describe, expect, it } from 'vitest';
import { initialState, isRevealed, passageComplete, rcSessionReducer, totalBudgetSeconds } from './rcSession';
import type { RcPassage, RcRevealMode } from './rcTypes';

const passages: RcPassage[] = [10, 20].map((passageId, index) => ({
  passageId, preptest: index ? 111 : 140, section: index ? 2 : 4, setNumber: index + 1, title: 'Passage', topic: null, format: null,
  frameworks: [], difficulty: null, text: 'Reading', summaries: { standard: null, brief: null, anotherWay: null },
  questions: [1, 2].map((position) => ({ questionId: passageId + position, position, questionType: null, questionTypeFamily: null, difficulty: null,
    prompt: 'Question', correctAnswer: 'A' as const, hasWrittenExplanation: false, explanationBlocks: [], totalResponses: null, features: [], choices: [] })),
}));

describe('RC reveal boundaries across passages', () => {
  it.each<RcRevealMode>(['per_question', 'per_passage', 'end_of_set'])('keeps selected answers hidden until the %s boundary', (mode) => {
    let state = initialState(passages);
    for (const item of state.items) state = rcSessionReducer(state, { type: 'select', questionId: item.question.questionId, letter: 'A' });
    expect(state.items.map((item) => isRevealed(state, mode, item))).toEqual([false, false, false, false]);
    if (mode === 'per_question') state = rcSessionReducer(state, { type: 'reveal', questionId: 11 });
    if (mode === 'per_passage') state = rcSessionReducer(state, { type: 'reviewPassage', passageId: 10 });
    expect(state.items.map((item) => isRevealed(state, mode, item))).toEqual(
      mode === 'per_question' ? [true, false, false, false] : mode === 'per_passage' ? [true, true, false, false] : [false, false, false, false],
    );
    state = rcSessionReducer(state, { type: 'submit' });
    expect(state.items.every((item) => isRevealed(state, mode, item))).toBe(true);
  });

  it('does not treat a complete first passage as a complete second passage', () => {
    let state = initialState(passages);
    for (const questionId of [11, 12]) state = rcSessionReducer(state, { type: 'select', questionId, letter: 'A' });
    expect(passageComplete(state, 10)).toBe(true);
    expect(passageComplete(state, 20)).toBe(false);
    expect(passageComplete(state, 99)).toBe(false);
    expect(totalBudgetSeconds({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'per_passage_budget', secondsPerPassage: 100 } }, passages.length)).toBe(200);
    expect(totalBudgetSeconds({ source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } }, passages.length)).toBeNull();
  });
});
