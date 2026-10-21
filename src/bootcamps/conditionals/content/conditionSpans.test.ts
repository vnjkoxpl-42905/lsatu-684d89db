import { expect, it } from 'vitest';
import { checkConditionSpans, locateWording, roleOfSpan, spanEntries, spanText } from './conditionSpans';
import { sourceWorksheetDrills } from './sourceWorksheetDrills';

const withConditions = sourceWorksheetDrills.filter(set => ['identify', 'forward', 'roles', 'contrapositive'].includes(set.taskKind));

it('covers every rule that has a conditions step', () => {
  const known = new Set(spanEntries().map(([statement]) => statement));
  const missing = withConditions.flatMap(set => set.items).filter(item => !known.has(item.statement)).map(item => item.id);
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
