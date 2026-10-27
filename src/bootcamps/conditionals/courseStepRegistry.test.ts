import { describe, expect, it } from 'vitest';
import { conditionalUnits } from './content';
import { COURSE_STEP_REGISTRY, LEGACY_OPENING_COURSE_PATH, LEGACY_UNIT_DISPOSITIONS, courseStepsForEdition } from './openingCoursePath';
import { conditionalAssignmentUnitIds, registryStepAllowed, type ResolvedConditionalAssignment } from './assignments';
import { FULL_CONDITIONAL_EDITION as edition, V3_PRIMARY_UNITS, V3_ELIGIBLE_AREAS } from '@/lib/conditionalCourseEdition';
import type { ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
const assignment = (target: ConditionalAssignmentTarget): ResolvedConditionalAssignment => ({ id: 'work', title: 'work', route: '/', target, unitIds: conditionalAssignmentUnitIds(target), mode: target.mode, ...(target.scope === 'course' ? {} : { difficulty: target.difficulty }) });
const full = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: edition } as const;
describe('versioned numbered curriculum', () => {
  it('freezes the public sixteen and returns stable arrays', () => {
    expect(LEGACY_OPENING_COURSE_PATH).toHaveLength(16);
    expect(courseStepsForEdition()).toBe(courseStepsForEdition());
    expect(courseStepsForEdition(edition)).toBe(COURSE_STEP_REGISTRY);
    expect(new Set(COURSE_STEP_REGISTRY.map(s => s.id)).size).toBe(COURSE_STEP_REGISTRY.length);
    expect(COURSE_STEP_REGISTRY.filter(s => s.part === 2).map(s => s.id)).toEqual([
      'and-or-both-or-either', 'and-or-either-condition', 'and-or-meaning-practice',
      'and-or-either-side', 'and-or-placement-practice', 'and-or-negate-conditions',
      'and-or-whole-group-practice', 'and-or-negate-group', 'and-or-transfer-practice',
    ]);
    expect([...new Set(COURSE_STEP_REGISTRY.map(s => s.part))]).toEqual([1,2,3,4,5,6,7]);
  });
  it('places new 2.4 before negation practice and preserves 2.5 as a de-morgan-only lesson', () => {
    const negation = COURSE_STEP_REGISTRY.find(step => step.id === 'and-or-negate-conditions')!;
    const contraposition = COURSE_STEP_REGISTRY.find(step => step.id === 'and-or-negate-group')!;
    expect(negation).toMatchObject({ type: 'note', lessonNumber: '2.4', unitId: 'de-morgan', primaryUnitId: 'de-morgan', accessAnyOfUnitIDs: ['de-morgan'], allowedAction: 'learn' });
    expect(contraposition).toMatchObject({ type: 'note', lessonNumber: '2.5', unitId: 'de-morgan', primaryUnitId: 'de-morgan', accessAnyOfUnitIDs: ['de-morgan'], allowedAction: 'learn' });
    expect(registryStepAllowed(assignment({ ...full, scope: 'skill', unitId: 'de-morgan' }), negation)).toBe(true);
    expect(registryStepAllowed(assignment({ ...full, scope: 'skill', unitId: 'and-or' }), negation)).toBe(false);
    expect(LEGACY_OPENING_COURSE_PATH.some(step => step.id === negation.id)).toBe(false);
  });
  it('gives all thirty units exactly one disposition and every eligible target required work', () => {
    expect(Object.keys(LEGACY_UNIT_DISPOSITIONS).sort()).toEqual(conditionalUnits.map(u => u.id).sort());
    expect([...V3_PRIMARY_UNITS].sort()).toEqual(Object.entries(LEGACY_UNIT_DISPOSITIONS).filter(([, value]) => value.kind === 'primary').map(([id]) => id).sort());
    for (const id of V3_PRIMARY_UNITS) {
      const grant = assignment({ ...full, scope: 'skill', unitId: id });
      expect(COURSE_STEP_REGISTRY.some(s => s.requiredForEditionCompletion && registryStepAllowed(grant, s)), id).toBe(true);
      const accessible = COURSE_STEP_REGISTRY.filter(s => registryStepAllowed(grant, s));
      expect(accessible.every(s => s.accessAnyOfUnitIDs?.includes(id)), id).toBe(true);
      if (accessible.some(s => s.part! >= 3)) expect(accessible.some(s => s.type === 'drill' && s.primaryUnitId === id && s.requiredForEditionCompletion), id).toBe(true);
    }
    expect([...V3_ELIGIBLE_AREAS].sort()).toEqual([...new Set(conditionalUnits.filter(u => V3_PRIMARY_UNITS.includes(u.id as never)).map(u => u.area))].sort());
    for (const area of V3_ELIGIBLE_AREAS) {
      const grant = assignment({ ...full, scope: 'area', area });
      expect(COURSE_STEP_REGISTRY.some(s => s.requiredForEditionCompletion && registryStepAllowed(grant, s)), area).toBe(true);
    }
  });
  it('checks edition before aliases and all-of requirements before authorizing a cumulative step', () => {
    const old = assignment({ scope: 'course', mode: 'learn', difficulty: 'beginner' });
    const current = assignment(full);
    const step = COURSE_STEP_REGISTRY.find(s => s.part === 2)!;
    expect(registryStepAllowed(old, step)).toBe(false);
    expect(registryStepAllowed(current, step)).toBe(true);
    const only = assignment({ ...full, scope: 'skill', unitId: 'mbt' });
    const cumulative = { ...step, accessAnyOfUnitIDs: ['mbt'], requiredAllOfUnitIDs: ['mbt', 'and-or'] };
    expect(registryStepAllowed(only, cumulative)).toBe(false);
    expect(registryStepAllowed(current, cumulative)).toBe(true);
    expect(registryStepAllowed(current, { ...step, accessAnyOfUnitIDs: [] })).toBe(false);
    expect(registryStepAllowed({ ...current, mode: 'practice' }, step)).toBe(false);
    const alias = assignment({ ...full, scope: 'skill', unitId: 'group-1' });
    expect(registryStepAllowed(alias, COURSE_STEP_REGISTRY.find(s => s.id === 'sufficient')!)).toBe(true);
  });
});
