import { describe, expect, it } from 'vitest';
import { buildItems, initialState, pagerEntries, rcSessionReducer } from './rcSession';
import type { RcPassage } from './rcTypes';

function passage(passageId: number, preptest: number, section: number, setNumber: number, positions: number[]): RcPassage {
  return { passageId, preptest, section, setNumber, title: 'Passage title', topic: null, format: null, frameworks: [], difficulty: null, text: 'Passage',
    summaries: { standard: null, brief: null, anotherWay: null },
    questions: positions.map((position) => ({ questionId: passageId * 100 + position, position, questionType: null, questionTypeFamily: null, difficulty: null,
      prompt: 'Question', correctAnswer: 'A' as const, hasWrittenExplanation: false, explanationBlocks: [], totalResponses: null, features: [], choices: [] })) };
}

describe('RC source identity in mixed drills', () => {
  it('preserves official numbering when passages are drawn from different tests and reordered', () => {
    const passages = [passage(10, 140, 4, 3, [17, 18]), passage(20, 111, 2, 1, [5, 6])];
    const items = buildItems(passages);
    expect(items.map((item) => [item.number, item.question.position])).toEqual([[1, 17], [2, 18], [3, 5], [4, 6]]);
    const state = initialState(passages);
    const entries = pagerEntries(state);
    expect(entries.filter((entry) => entry.kind === 'divider')).toHaveLength(1);
    expect(entries.filter((entry) => entry.kind === 'question').map((entry) => [entry.label, entry.sourceLabel])).toEqual([
      ['1', 'PT 140 · Section 4 · Passage 3 · Question 17'], ['2', 'PT 140 · Section 4 · Passage 3 · Question 18'],
      ['3', 'PT 111 · Section 2 · Passage 1 · Question 5'], ['4', 'PT 111 · Section 2 · Passage 1 · Question 6'],
    ]);
    const destination = rcSessionReducer(state, { type: 'goto', index: 2 });
    expect(destination.items[destination.currentIndex].question.position).toBe(5);
    expect(destination.answers.size).toBe(0);
    expect(destination.revealed.size).toBe(0);
    expect(destination.recorded.size).toBe(0);
    expect(buildItems([...passages].reverse()).map((item) => item.question.position)).toEqual([5, 6, 17, 18]);
  });
});
