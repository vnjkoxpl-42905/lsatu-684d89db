import { describe, expect, it } from 'vitest';
import { COURSE_STEP_REGISTRY } from './openingCoursePath';
import { applyConditionalRequirements, eligibleConditionalSteps, PRE_SPLIT_REQUIRED_STEP_IDS, resolveConditionalRequirements, snapshotConditionalRequirements } from './courseRequirements';
import type { ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';

const full: ConditionalAssignmentTarget = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: 'full-conditionals-v3' };
const skill = (unitId: string): ConditionalAssignmentTarget => ({ ...full, scope: 'skill', unitId });

describe('assignment-specific required steps', () => {
  it('freezes the 70-step pre-split local generation without adding the new lesson', () => {
    expect(PRE_SPLIT_REQUIRED_STEP_IDS).toHaveLength(70);
    expect(resolveConditionalRequirements(full)).toMatchObject({ source: 'pre-split-default', requiredStepIds: [...PRE_SPLIT_REQUIRED_STEP_IDS] });
    expect(resolveConditionalRequirements(full).requiredStepIds).not.toContain('and-or-negate-conditions');
    expect(snapshotConditionalRequirements(full).requiredStepIds).toContain('and-or-negate-conditions');
  });
  it.each([full, skill('de-morgan'), { ...full, scope: 'area' as const, area: 'complex' as const }])('keeps old requirements and new authoring distinct for $scope', target => {
    const eligible = eligibleConditionalSteps(target);
    const before = JSON.stringify(COURSE_STEP_REGISTRY);
    const older = applyConditionalRequirements(eligible, resolveConditionalRequirements(target));
    const current = applyConditionalRequirements(eligible, resolveConditionalRequirements(target, snapshotConditionalRequirements(target)));
    const oldNewLesson = older.find(step => step.id === 'and-or-negate-conditions');
    if (oldNewLesson) {
      expect(oldNewLesson.requiredForEditionCompletion).toBe(false);
      expect(current.find(step => step.id === oldNewLesson.id)?.requiredForEditionCompletion).toBe(true);
    }
    expect(JSON.stringify(COURSE_STEP_REGISTRY)).toBe(before);
    expect(older.every(step => step !== COURSE_STEP_REGISTRY.find(original => original.id === step.id))).toBe(true);
  });
  it('does not grant de-morgan work to AND/OR-only or legacy assignments', () => {
    expect(eligibleConditionalSteps(skill('and-or')).some(step => step.id === 'and-or-negate-conditions')).toBe(false);
    expect(eligibleConditionalSteps({ scope: 'course', mode: 'learn', difficulty: 'beginner' }).some(step => step.id === 'and-or-negate-conditions')).toBe(false);
    expect(() => resolveConditionalRequirements(skill('and-or'), snapshotConditionalRequirements(full))).toThrow(/teacher/);
  });
  it.each([null, {}, { version: 2 }, { ...snapshotConditionalRequirements(full), revision: 'unknown' },
    { ...snapshotConditionalRequirements(full), requiredStepIds: ['meaning', 'meaning'] },
    { ...snapshotConditionalRequirements(full), requiredStepIds: ['unknown'] },
    { ...snapshotConditionalRequirements(full), requiredStepIds: [] }])('rejects malformed stored requirements %#', snapshot => {
    expect(() => resolveConditionalRequirements(full, snapshot)).toThrow(/teacher/);
  });
  it('copies stored membership instead of sharing the mutable metadata array', () => {
    const snapshot = snapshotConditionalRequirements(full);
    const resolved = resolveConditionalRequirements(full, snapshot);
    resolved.requiredStepIds.pop();
    expect(snapshot.requiredStepIds).toHaveLength(71);
  });
});
