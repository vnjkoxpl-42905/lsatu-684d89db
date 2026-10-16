import { describe, expect, it } from 'vitest';
import { conditionalAssignmentDisplayCopy, conditionalTargetKey, DEFAULT_CONDITIONAL_TARGET, resolveConditionalAssignment } from './conditionalBootcampAssignment';
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
  it('assigns a curriculum starting stage without a global activity level', async () => {
    const assigned = await resolveConditionalAssignment({ scope: 'stage', unitId: 'group-3', mode: 'practice', difficulty: 'advanced' });
    expect(assigned.route).toBe('/bootcamp/conditionals?start=group-3');
    expect(assigned.key).toBe('stage:group-3');
    expect(assigned.target).toEqual({ scope: 'stage', unitId: 'group-3', mode: 'learn', difficulty: 'beginner' });
    expect(conditionalTargetKey({ scope: 'stage', unitId: 'group-3', mode: 'learn', difficulty: 'medium' })).toBe(assigned.key);
    await expect(resolveConditionalAssignment({ scope: 'stage', unitId: 'missing', mode: 'learn', difficulty: 'beginner' })).rejects.toThrow('existing conditional starting stage');
  });
  it('routes a skill to learning or selected-level practice without changing the unit identity', async () => {
    const target = { scope: 'skill', unitId: 'group-3', mode: 'practice', difficulty: 'advanced' } as const;
    const assigned = await resolveConditionalAssignment(target);
    expect(assigned.route).toBe('/bootcamp/conditionals/practice?level=advanced&unit=group-3');
    expect(assigned.target).toEqual(target);
    expect(assigned.title).not.toMatch(/Level \d/);
    expect(assigned.description).not.toMatch(/level \d/i);
    expect((await resolveConditionalAssignment({ ...target, mode: 'learn' })).route).toContain('/lessons/group-3?level=advanced');
  });
  it('preserves the teaching-order version in new stage grants and distinguishes legacy duplicates', async () => {
    const target = { scope: 'stage', unitId: 'group-1', mode: 'learn', difficulty: 'beginner', curriculumVersion: 2 } as const;
    const assigned = await resolveConditionalAssignment(target);
    expect(assigned.target).toEqual(target);
    expect(assigned.key).toBe('stage:v2:group-1');
    expect(assigned.key).not.toBe(conditionalTargetKey({ ...target, curriculumVersion: undefined }));
    expect(assigned.route).toBe('/bootcamp/conditionals?start=group-1');
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
  it('recognizes exact former generated orientation titles while preserving teacher wording', async () => {
    const skill = { scope: 'skill', unitId: 'orientation', mode: 'learn', difficulty: 'beginner' } as const;
    const generated = await resolveConditionalAssignment(skill);
    const stored = { title: 'Find the Guarantee: Level 1 learning and practice', description: 'Teaching, guided activities and assigned level 1 practice.' };
    expect(conditionalAssignmentDisplayCopy(skill, generated, stored)).toEqual({ title: generated.title, description: generated.description });
    expect(stored.title).toBe('Find the Guarantee: Level 1 learning and practice');
    const custom = { title: 'Find the Guarantee again with Joshua', description: 'Review these examples before our next session.' };
    expect(conditionalAssignmentDisplayCopy(skill, generated, custom)).toEqual(custom);
    const stage = { scope: 'stage', unitId: 'orientation', mode: 'learn', difficulty: 'beginner', curriculumVersion: 2 } as const;
    const stageCopy = await resolveConditionalAssignment(stage);
    expect(conditionalAssignmentDisplayCopy(stage, stageCopy, { title: 'Conditional curriculum: start with Find the Guarantee' }).title).toBe(stageCopy.title);
    expect(conditionalAssignmentDisplayCopy(stage, stageCopy, { title: custom.title }).title).toBe(custom.title);
  });
  it('updates former generated opening titles across modes and stages without changing stored or custom copy', async () => {
    const titles = [
      ['sufficient-necessary', 'Enough to Guarantee, Required to Follow', 'What is enough? What is required?'],
      ['group-1', 'Group 1: Identify What Guarantees What', 'Group 1: what is enough?'],
      ['group-2', 'Group 2: Keep the Requirement on the Right', 'Group 2: what is required?'],
    ];
    for (const [unitId, formerTitle, currentTitle] of titles) {
      for (const mode of ['learn', 'practice'] as const) {
        for (const difficulty of ['beginner', 'medium', 'advanced'] as const) {
          const target = { scope: 'skill', unitId, mode, difficulty } as const;
          const generated = await resolveConditionalAssignment(target);
          const suffix = mode === 'learn' ? 'learning and practice' : 'practice';
          expect(generated.title).toBe(`${currentTitle}: ${suffix}`);
          const level = ['beginner', 'medium', 'advanced'].indexOf(difficulty) + 1;
          for (const title of [`${formerTitle}: ${suffix}`, `${formerTitle}: Level ${level} ${suffix}`]) {
            const stored = { title };
            expect(conditionalAssignmentDisplayCopy(target, generated, stored).title).toBe(generated.title);
            expect(stored.title).toBe(title);
          }
          const custom = { title: `${formerTitle}: review with Joshua`, description: 'Explain your answer before our next session.' };
          expect(conditionalAssignmentDisplayCopy(target, generated, custom)).toEqual(custom);
        }
      }
      const stage = { scope: 'stage', unitId, mode: 'learn', difficulty: 'beginner', curriculumVersion: 2 } as const;
      const generated = await resolveConditionalAssignment(stage);
      expect(generated.title).toBe(`Conditional curriculum: start with ${currentTitle}`);
      expect(conditionalAssignmentDisplayCopy(stage, generated, { title: `Conditional curriculum: start with ${formerTitle}` }).title).toBe(generated.title);
      const custom = { title: `Conditional curriculum: start with ${formerTitle} after our session` };
      expect(conditionalAssignmentDisplayCopy(stage, generated, custom).title).toBe(custom.title);
    }
  });
});
