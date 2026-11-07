import { describe, expect, it } from 'vitest';
import type { TopicAccuracy } from '@/lib/firstAnswerDetails';
import { classifyTypes, MIN_TYPE_ANSWERS } from './strengthsWeaknesses';

const row = (topic: string, correct: number, denominator: number): TopicAccuracy => ({
  topic,
  correct,
  denominator,
  percent: null,
  evidenceAttemptIds: [],
});

describe('classifyTypes', () => {
  it('sorts strengths best first and weaknesses weakest first', () => {
    const out = classifyTypes([
      row('Flaw', 9, 10),
      row('Main Conclusion', 8, 10),
      row('Weaken', 2, 10),
      row('Paradox', 4, 10),
      row('Role', 6, 10),
    ]);
    expect(out.strengths.map((r) => r.topic)).toEqual(['Flaw', 'Main Conclusion']);
    expect(out.weaknesses.map((r) => r.topic)).toEqual(['Weaken', 'Paradox']);
    expect(out.steady.map((r) => r.topic)).toEqual(['Role']);
    expect(out.recommended?.topic).toBe('Weaken');
  });

  it('never ranks a type with fewer than the minimum answers', () => {
    const out = classifyTypes([row('Flaw', 1, 1), row('Weaken', 0, MIN_TYPE_ANSWERS - 1)]);
    expect(out.strengths).toEqual([]);
    expect(out.weaknesses).toEqual([]);
    expect(out.recommended).toBeNull();
    expect(out.building.map((r) => r.topic)).toEqual(['Weaken', 'Flaw']);
  });

  it('recommends nothing when there is no real weakness', () => {
    const out = classifyTypes([row('Flaw', 9, 10), row('Role', 7, 10)]);
    expect(out.recommended).toBeNull();
  });

  it('breaks a percent tie by the most misses, then name', () => {
    const out = classifyTypes([row('B type', 2, 10), row('A type', 1, 5), row('C type', 2, 10)]);
    expect(out.weaknesses.map((r) => r.topic)).toEqual(['B type', 'C type', 'A type']);
  });

  it('ignores Unclassified and counts every other first answer', () => {
    const out = classifyTypes([row('Unclassified', 0, 8), row('Flaw', 3, 4)]);
    expect(out.totalAnswers).toBe(4);
    expect(out.strengths.map((r) => r.topic)).toEqual(['Flaw']);
  });

  it('shows nothing ranked when a source is missing', () => {
    const out = classifyTypes([row('Flaw', 9, 10)], true);
    expect(out.withheld).toBe(true);
    expect(out.strengths).toEqual([]);
    expect(out.recommended).toBeNull();
  });
});
