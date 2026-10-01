import { describe, expect, it } from 'vitest';
import { conditionalTargetKey, DEFAULT_CONDITIONAL_TARGET, resolveConditionalAssignment } from './conditionalBootcampAssignment';
import { conditionalUnits } from '@/bootcamps/conditionals/content';
import { validateConditionalContent } from '@/bootcamps/conditionals/content/validate';
import { classroomItemMatchesBootcamp, findBootcampByRoute } from './bootcamps';

describe('conditional bootcamp contract', () => {
  it('has complete original teaching and fresh, identified practice at all levels', () => {
    expect(validateConditionalContent(conditionalUnits)).toEqual([]);
    expect(conditionalUnits.reduce((count, unit) => count + Object.values(unit.drills).flat().length, 0)).toBeGreaterThanOrEqual(270);
  });
  it('routes full-course assignment to the progressive path', async () => {
    expect(await resolveConditionalAssignment()).toMatchObject({ route: '/bootcamp/conditionals', key: 'course', target: DEFAULT_CONDITIONAL_TARGET });
  });
  it('routes a skill to learning or selected-level practice without changing the unit identity', async () => {
    const target = { scope: 'skill', unitId: 'group-3', mode: 'practice', difficulty: 'advanced' } as const;
    const assigned = await resolveConditionalAssignment(target);
    expect(assigned.route).toBe('/bootcamp/conditionals/practice?level=advanced&unit=group-3');
    expect(assigned.target).toEqual(target);
    expect((await resolveConditionalAssignment({ ...target, mode: 'learn' })).route).toContain('/lessons/group-3?level=advanced');
  });
  it('keeps general work conditional and permits independent quantifier area assignment', async () => {
    expect((await resolveConditionalAssignment({ scope: 'general', mode: 'learn', difficulty: 'medium' })).route).toContain('phase=conditional');
    expect((await resolveConditionalAssignment({ scope: 'area', area: 'quantifiers', mode: 'practice', difficulty: 'beginner' })).route).toContain('area=quantifiers');
  });
  it('does not consider different skill, mode or level assignments duplicates', () => {
    const target = { scope: 'skill', unitId: 'group-1', mode: 'practice', difficulty: 'medium' } as const;
    expect(new Set([conditionalTargetKey(), conditionalTargetKey(target), conditionalTargetKey({ ...target, unitId: 'group-2' }), conditionalTargetKey({ ...target, difficulty: 'advanced' }), conditionalTargetKey({ ...target, mode: 'learn' })]).size).toBe(5);
  });
  it('rejects unknown skills and areas before assigning any work', async () => {
    await expect(resolveConditionalAssignment({ scope: 'skill', mode: 'practice', unitId: 'missing', difficulty: 'beginner' })).rejects.toThrow('existing conditional skill');
    await expect(resolveConditionalAssignment({ scope: 'area', mode: 'practice', area: 'missing' as never, difficulty: 'beginner' })).rejects.toThrow('existing conditional area');
  });
  it('resolves the registry and gate for targeted assignment links', () => {
    expect(findBootcampByRoute('/bootcamp/conditionals/practice?unit=group-1&level=medium')?.id).toBe('conditionals');
    expect(classroomItemMatchesBootcamp({ source_id: '/bootcamp/conditionals/lessons/group-4?level=beginner', metadata_json: { bootcamp_id: 'conditionals' } }, 'conditionals')).toBe(true);
  });
});
