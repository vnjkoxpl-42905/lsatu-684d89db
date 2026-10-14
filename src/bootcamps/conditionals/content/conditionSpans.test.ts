import { expect, it } from 'vitest';
import { checkConditionSpans, locateWording, roleOfSpan, spanEntries, spanText } from './conditionSpans';
import { getSourceWorksheetDrill, sourceWorksheetDrills } from './sourceWorksheetDrills';
import { OPENING_COURSE_PATH } from '../openingCoursePath';

// Revisits reuse another set's items under a task that adds the highlight step, so they count too.
const allSets = [...sourceWorksheetDrills, ...OPENING_COURSE_PATH.map(step => getSourceWorksheetDrill(step.id)).filter(set => set !== undefined)];
const withConditions = allSets.filter(set => ['identify', 'forward', 'roles', 'contrapositive'].includes(set!.taskKind));

it('covers every rule that has a conditions step', () => {
  const known = new Set(spanEntries().map(([statement]) => statement));
  const missing = withConditions.flatMap(set => set!.items).filter(item => !known.has(item.statement)).map(item => item.id);
  expect(missing).toEqual([]);
});

it('finds each authored wording inside its rule, and the two conditions never overlap', () => {
  for (const [statement, [sufficient, necessary]] of spanEntries()) {
    const found = [sufficient, necessary].map(entry => entry.split('|').map(text => locateWording(statement, text.trim())));
    for (const group of found) for (const place of group) expect(place, statement).not.toBeNull();
    const [s, n] = found.map(group => group[0]!);
    expect(s[1] < n[0] || n[1] < s[0], statement).toBe(true);
    expect(roleOfSpan(statement, s), statement).toBe('sufficient');
    expect(roleOfSpan(statement, n), statement).toBe('necessary');
  }
});

it('accepts either order, a dropped article, and rejects a span that swallows the indicator', () => {
  const rule = 'A warranty is valid if the product is registered within 30 days.';
  expect(checkConditionSpans(rule, [[0, 3], [5, 11]]).correct).toBe(true);
  expect(checkConditionSpans(rule, [[1, 3], [4, 11]]).correct).toBe(false);
  expect(checkConditionSpans(rule, [[5, 11], [1, 3]]).correct).toBe(true);
  expect(checkConditionSpans(rule, [[0, 3], [4, 11]]).correct).toBe(false);
  expect(checkConditionSpans(rule, [[0, 3]]).correct).toBe(false);
  expect(spanText(rule, [5, 11])).toBe('the product is registered within 30 days');
});

// Every rule in a drill with a highlight step, with the indicator words keyed for it.
const rules = new Map(withConditions.flatMap(set => set!.items).map(item => [item.statement, item.indicators.map(i => i.text.toLowerCase())]));

it('rejects a highlight that runs into an indicator next to the condition', () => {
  const norm = (word: string) => word.replace(/[^\p{L}\p{N}'’-]/gu, '').toLowerCase();
  let checked = 0;
  for (const [statement, indicators] of rules) {
    const tokens = statement.split(/\s+/);
    const indicatorWords = new Set(indicators.flatMap(text => text.split(' ')));
    for (const entry of spanEntries().find(([s]) => s === statement)![1]) {
      const [from, to] = locateWording(statement, entry.split('|')[0].trim())!;
      if (from > 0 && indicatorWords.has(norm(tokens[from - 1]))) { expect(roleOfSpan(statement, [from - 1, to]), statement).toBeNull(); checked += 1; }
      if (to < tokens.length - 1 && indicatorWords.has(norm(tokens[to + 1]))) { expect(roleOfSpan(statement, [from, to + 1]), statement).toBeNull(); checked += 1; }
    }
  }
  expect(checked).toBeGreaterThan(60);
});

it('rejects a highlight that drops the end of a condition, and a single word that is only part of one', () => {
  expect(checkConditionSpans('A warranty is valid if the product is registered within 30 days.', [[0, 3], [5, 8]]).correct).toBe(false);
  expect(checkConditionSpans('Every participant who finishes the marathon receives a medal.', [[1, 1], [6, 8]]).correct).toBe(false);
  expect(checkConditionSpans('Every participant who finishes the marathon receives a medal.', [[1, 5], [6, 8]]).correct).toBe(true);
  expect(checkConditionSpans('Passengers are allowed to board only when documents are verified by both authorities.', [[0, 4], [7, 10]]).correct).toBe(false);
  expect(checkConditionSpans('Passengers are allowed to board only when documents are verified by both authorities.', [[0, 4], [7, 12]]).correct).toBe(true);
});

it('keeps must out of the highlight, but accepts a modal like will or can at the edge', () => {
  const rule = 'Passengers must present a ticket to be allowed to board the train.';
  expect(roleOfSpan(rule, [1, 4])).toBeNull();
  expect(roleOfSpan(rule, [2, 4])).toBe('necessary');
  expect(roleOfSpan('You will run quickly if there is a bear behind you.', [1, 3])).toBe('necessary');
  expect(roleOfSpan('You will run quickly if there is a bear behind you.', [2, 3])).toBe('necessary');
  expect(roleOfSpan('Anyone studying physics will encounter complex mathematical concepts.', [0, 2])).toBeNull();
  expect(roleOfSpan('The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.', [4, 7])).toBe('sufficient');
  expect(roleOfSpan('The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.', [9, 17])).toBe('necessary');
});

it('covers the rewritten rules in Drill 7 and Drill 5', () => {
  for (const rule of ["Where there's smoke, there's fire.", 'A good soup requires salt.', 'You will become a magician if you eat a carrot.', 'The only key to unlocking the shed is the blue key.']) {
    expect(rules.has(rule), rule).toBe(true);
  }
  expect(checkConditionSpans("Where there's smoke, there's fire.", [[1, 2], [3, 4]]).correct).toBe(true);
  expect(checkConditionSpans('A good soup requires salt.', [[0, 2], [4, 4]]).correct).toBe(true);
  expect(checkConditionSpans('A good soup requires salt.', [[0, 2], [3, 4]]).correct).toBe(false);
});

it('keeps timing in every accepted wording of a condition that carries it', () => {
  const virus = 'The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.';
  expect(roleOfSpan(virus, [12, 17])).toBeNull();
  expect(roleOfSpan(virus, [8, 17])).toBe('necessary');
  const teamwork = 'All successful projects require effective teamwork to have taken place.';
  expect(roleOfSpan(teamwork, [4, 5])).toBeNull();
  expect(roleOfSpan(teamwork, [4, 9])).toBe('necessary');
});

it('keeps modal meaning and complete restrictions in the highlight', () => {
  const checks: [string, string, boolean][] = [
    ['Every lawyer can read.', 'read', false],
    ['Every lawyer can read.', 'can read', true],
    ['Any computer can do addition.', 'do addition', false],
    ['Security checks are always conducted before entry.', 'conducted', false],
    ['Critical software patches are always applied before servers restart.', 'applied', false],
    ['The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.', 'produce antibodies to fight the virus', false],
    ['The body of anyone infected by virus X will, after a week, produce antibodies to fight the virus.', 'after a week, produce antibodies to fight the virus', true],
  ];
  for (const [statement, wording, correct] of checks) expect(roleOfSpan(statement, locateWording(statement, wording)!)).toBe(correct ? 'necessary' : null);
});

it('keeps permission and the complete subject in Revisit Drill 5', () => {
  const permission = 'Only those with a degree in architecture can apply for this position.';
  expect(roleOfSpan(permission, locateWording(permission, 'apply for this position')!)).toBeNull();
  expect(roleOfSpan(permission, locateWording(permission, 'can apply for this position')!)).toBe('sufficient');
  const identity = 'Only those submissions whose applicant identity has been confirmed by the registrar are reviewed.';
  expect(roleOfSpan(identity, locateWording(identity, 'applicant identity has been confirmed by the registrar')!)).toBeNull();
});
