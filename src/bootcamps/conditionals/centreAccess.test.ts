import { describe, expect, it } from 'vitest';
import { conditionalLegacyPracticeUnits } from './centreAccess';
import { normalizeConditionalActivityConfig } from './activityRegistry';
import { conditionalUnits } from './content';

describe('the conditional bank player boundary', () => {
  const selected = normalizeConditionalActivityConfig({ activity: 'legacy-practice', unit: 'group-3' })!;
  const focused = { target: { scope: 'activity', activityId: 'legacy-practice', activitySettings: { unit: 'group-3', difficulty: 'beginner', mode: 'practice' } }, unitIds: [] };
  it('gives an exact skill activity only that skill, independently of its view', () => {
    expect(conditionalLegacyPracticeUnits(focused, selected)).toEqual(['group-3']);
    expect(conditionalLegacyPracticeUnits(focused, { ...selected, unit: 'group-4' })).toEqual([]);
    expect(conditionalLegacyPracticeUnits(focused, { ...selected, unit: undefined })).toEqual([]);
  });
  it('does not authorize an unrelated or missing grant', () => {
    expect(conditionalLegacyPracticeUnits(undefined, selected)).toEqual([]);
    expect(conditionalLegacyPracticeUnits({ target: { scope: 'skill', difficulty: 'beginner' }, unitIds: ['group-4'] }, selected)).toEqual([]);
  });
  it('keeps quantifier questions out of the imported conditional bank', () => {
    const config = normalizeConditionalActivityConfig({ activity: 'legacy-practice' })!;
    expect(conditionalLegacyPracticeUnits({ target: { scope: 'course' }, unitIds: [] }, config)).toEqual(conditionalUnits.filter(unit => unit.phase === 'conditional').map(unit => unit.id));
  });
});
