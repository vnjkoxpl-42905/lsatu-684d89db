import { describe, expect, it } from 'vitest';
import baseline from './fullCourseGradingBaseline.json';
import { fullCoursePractice } from './fullCourseItems';
import { atom, and, or, not, checkResponse, evaluate, implies, validateItem } from './fullCourseLogic';
import type { FullCourseBuildItem, Formula } from './fullCourseTypes';

const a = atom('first'), b = atom('second'), c = atom('third');
const adjudicated: [string, string, Formula, Formula][] = [
  ['exception-language', 'hw-g3-badge-20261027', b, a],
  ['exception-language', 'hw-g3-carbon-20261027', a, b],
  ['exception-language', 'hw-g3-paragraph-20261027', not(a), and(b, c)],
  ['exception-language', 'hw-g3-repair-20261027', not(a), b],
  ['exclusion-language', 'hw-g4-late-entry-20261027', a, not(b)],
  ['exclusion-language', 'hw-g4-revisions-20261027', a, not(b)],
  ['exclusion-language', 'hw-g4-paragraph-20261027', a, not(b)],
  ['negative-translation', 'hw-mixed-calibration-20261027', b, a],
  ['negative-translation', 'hw-mixed-team-20261027', a, and(b, c)],
  ['negative-translation', 'hw-mixed-career-or-20261027', or(a, b), c],
];
function itemIn(set: string, id: string): FullCourseBuildItem {
  const item = fullCoursePractice[set].find(candidate => candidate.id === id);
  expect(item?.kind).toBe('build-rule');
  return item as FullCourseBuildItem;
}

describe('selected homework is independently adjudicated before grading', () => {
  it.each(adjudicated)('%s: %s accepts both equivalent orientations, rejecting its converse', (set, id, left, right) => {
    const item = itemIn(set, id);
    expect(validateItem(item)).toEqual([]);
    expect(checkResponse(item, { kind: 'build-rule', left, right }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'build-rule', left: not(right), right: not(left) }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'build-rule', left: right, right: left }).correct).toBe(false);
    expect(item.sourceRefs).toHaveLength(2);
    expect(item.sourceRefs?.[0]).toContain(`homework-adjudication.md#${id}`);
  });

  it.each([
    ['exception-language', 'hw-g3-badge-20261027', { first: true, second: false }, { first: false, second: true }],
    ['exception-language', 'hw-g3-carbon-20261027', { first: false, second: true }, { first: true, second: false }],
    ['exception-language', 'hw-g3-paragraph-20261027', { first: true, second: false, third: false }, { first: false, second: true, third: false }],
    ['exception-language', 'hw-g3-repair-20261027', { first: false, second: true }, { first: false, second: false }],
    ['exclusion-language', 'hw-g4-late-entry-20261027', { first: false, second: false }, { first: true, second: true }],
    ['exclusion-language', 'hw-g4-revisions-20261027', { first: false, second: false }, { first: true, second: true }],
    ['exclusion-language', 'hw-g4-paragraph-20261027', { first: false, second: false }, { first: true, second: true }],
    ['negative-translation', 'hw-mixed-calibration-20261027', { first: true, second: false }, { first: false, second: true }],
    ['negative-translation', 'hw-mixed-team-20261027', { first: false, second: true, third: true }, { first: true, second: true, third: false }],
    ['negative-translation', 'hw-mixed-career-or-20261027', { first: false, second: false, third: false }, { first: true, second: false, third: false }],
  ] as [string, string, Record<string, boolean>, Record<string, boolean>][])('%s: %s preserves an allowed boundary and forbids the violating case', (set, id, allowed, forbidden) => {
    const item = itemIn(set, id);
    const meaning = implies(item.target.if, item.target.then);
    expect(evaluate(meaning, allowed)).toBe(true);
    expect(evaluate(meaning, forbidden)).toBe(false);
  });

  it('requires time management for either success, repairing the old AND key', () => {
    const item = itemIn('negative-translation', 'hw-mixed-career-or-20261027');
    const meaning = implies(item.target.if, item.target.then);
    for (const [career, personal, managed, allowed] of [
      [true, false, false, false], [false, true, false, false],
      [true, true, false, false], [false, false, false, true],
      [true, false, true, true], [false, true, true, true], [true, true, true, true],
    ]) expect(evaluate(meaning, { first: career, second: personal, third: managed })).toBe(allowed);
    expect(checkResponse(item, { kind: 'build-rule', left: and(a, b), right: c }).correct).toBe(false);
  });

  it('checks each missing team requirement and leaves victory uncertain when both hold', () => {
    const item = itemIn('negative-translation', 'hw-mixed-team-20261027');
    const meaning = implies(item.target.if, item.target.then);
    for (const [wins, together, trains, allowed] of [
      [true, true, false, false], [true, false, true, false],
      [true, true, true, true], [false, true, true, true],
      [false, false, false, true],
    ]) expect(evaluate(meaning, { first: wins, second: together, third: trains })).toBe(allowed);
    expect(checkResponse(item, { kind: 'build-rule', left: or(not(b), not(c)), right: not(a) }).correct).toBe(true);
    expect(checkResponse(item, { kind: 'build-rule', left: and(not(b), not(c)), right: not(a) }).correct).toBe(false);
  });

  it('does not promise both paragraph results merely because the presenter arrived on time', () => {
    const item = itemIn('exception-language', 'hw-g3-paragraph-20261027');
    const meaning = implies(item.target.if, item.target.then);
    expect(evaluate(meaning, { first: true, second: false, third: false })).toBe(true);
    expect(evaluate(meaning, { first: false, second: true, third: false })).toBe(false);
    expect(evaluate(meaning, { first: false, second: false, third: true })).toBe(false);
    expect(evaluate(meaning, { first: false, second: true, third: true })).toBe(true);
  });

  it('keeps every existing ID, grading meaning and order before appending homework', () => {
    for (const set of ['exception-language', 'exclusion-language', 'negative-translation']) {
      const previous = baseline.sets[`${set}-practice` as keyof typeof baseline.sets];
      expect(fullCoursePractice[set].slice(0, previous.length)).toEqual(previous);
      expect(fullCoursePractice[set].slice(previous.length).map(item => item.id)).toEqual(
        adjudicated.filter(([owner]) => owner === set).map(([, id]) => id),
      );
    }
  });
});
