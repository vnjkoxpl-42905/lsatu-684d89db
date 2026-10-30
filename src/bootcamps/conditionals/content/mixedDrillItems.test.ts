import { expect, it } from 'vitest';
import { completeConditionItems, equivalenceItems, transferItems, confirmationItemsByError, obligationConfirmationItem } from './mixedDrillItems';
import { openingActivityItems } from './openingActivityItems';
import { mixedFamilyItems } from '../components/MixedFamilyPractice';

const baseline = [...completeConditionItems, ...equivalenceItems, ...transferItems];
const confirmations = Object.values(confirmationItemsByError).flat();

it('provides 24 baseline questions while keeping fresh confirmations separate and feedback complete', () => {
  expect(baseline.length + openingActivityItems.length + mixedFamilyItems.length).toBe(24);
  const all = [...baseline, ...confirmations];
  expect(new Set(all.map(item => item.id)).size).toBe(all.length);
  for (const item of all) {
    expect(item.correct).toBeGreaterThanOrEqual(0);
    expect(item.correct).toBeLessThan(item.options.length);
    expect(item.feedback).toHaveLength(item.options.length);
    expect(new Set(item.options).size).toBe(item.options.length);
    for (const explanation of item.feedback) expect(explanation.trim().length).toBeGreaterThan(40);
    expect(item.sentence + item.prompt + item.options.join(' ') + item.feedback.join(' ')).not.toMatch(/[—–]|contrapositive|unless/i);
  }
});

it('confirms each repaired skill on a distinct fresh case', () => {
  expect(Object.keys(confirmationItemsByError).sort()).toEqual(['direction', 'equivalence', 'qualification', 'requirement']);
  for (const [skill, items] of Object.entries(confirmationItemsByError)) {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.skill).toBe(skill);
      expect(item.stage).toBe('confirmation');
      expect(baseline.map(baselineItem => baselineItem.sentence)).not.toContain(item.sentence);
      expect(mixedFamilyItems.map(baselineItem => baselineItem.sentence)).not.toContain(item.sentence);
    }
  }
});

it('does not turn a satisfied permission requirement into granted permission or a required action into compliance', () => {
  const permission = transferItems.find(item => item.id === 'mixed-transfer-3')!;
  expect(permission.options[permission.correct]).toMatch(/permission remains open/i);
  expect(permission.feedback[permission.correct]).toMatch(/denied permission.*with permission/);
  const obligation = transferItems.find(item => item.id === 'mixed-transfer-4')!;
  expect(obligation.options[obligation.correct]).toMatch(/attendance instead of an obligation/i);
  expect(obligation.feedback[obligation.correct]).toMatch(/has not attended.*obligation/);
});

it('keeps the four reviewed envelope comparisons and identifies the if version as the reverse', () => {
  const same = equivalenceItems.map(item => item.options[item.correct] === 'Same rule');
  expect(same).toEqual([true, false, true, true]);
  expect(equivalenceItems[1].sentence).toMatch(/tray if it is stamped/);
  expect(equivalenceItems[3].sentence).toMatch(/tray only if it is stamped/);
});


it('diagnoses the chosen error rather than tagging every answer with the exercise skill', () => {
  for (const item of [...baseline, ...confirmations]) {
    expect(item.errorByOption).toHaveLength(item.options.length);
    expect(item.errorByOption?.[item.correct]).toBeNull();
    item.errorByOption?.forEach((error, index) => {
      if (index !== item.correct) expect(error).not.toBeNull();
    });
  }
  const swimmer = completeConditionItems[0];
  expect(swimmer.options[0]).toBe('Every swimmer');
  expect(swimmer.errorByOption?.[0]).toBe('qualification');
  expect(swimmer.options[2]).toBe('Anyone who receives a wristband');
  expect(swimmer.errorByOption?.[2]).toBe('direction');
  const trainee = transferItems.find(item => item.id === 'mixed-transfer-2')!;
  expect(trainee.errorByOption).toEqual(['qualification', 'direction', null]);
});


it('offers a fresh obligation confirmation that still leaves actual compliance open', () => {
  expect(obligationConfirmationItem.id).not.toBe('mixed-transfer-4');
  expect(obligationConfirmationItem.options[obligationConfirmationItem.correct]).toMatch(/required to bring/);
  expect(obligationConfirmationItem.feedback[obligationConfirmationItem.correct]).toMatch(/actually brought it remains open/);
  expect(obligationConfirmationItem.errorByOption?.[obligationConfirmationItem.correct]).toBeNull();
  expect(baseline.map(item => item.sentence)).not.toContain(obligationConfirmationItem.sentence);
});
