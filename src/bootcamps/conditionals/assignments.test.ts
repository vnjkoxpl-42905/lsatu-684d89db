import { conditionalAssignmentUnitIds } from './assignments';
import { describe, expect, it } from 'vitest';
import { conditionalAssignmentAllowsAction, resolveConditionalAssignments, type ConditionalAssignmentRow } from './assignments';
import { DEFAULT_CONDITIONAL_TARGET } from '@/lib/conditionalBootcampAssignment';

const row = (patch: Partial<ConditionalAssignmentRow> = {}): ConditionalAssignmentRow => ({
  id: 'work-1', student_id: 'student', type: 'bootcamp_module', title: 'Assigned work',
  source_id: '/bootcamp/conditionals', metadata_json: { bootcamp_id: 'conditionals', conditional_target: DEFAULT_CONDITIONAL_TARGET },
  status: 'assigned', visible_to_student: true, unlock_at: null, ...patch,
});
const targetRow = (target: unknown) => row({ metadata_json: { bootcamp_id: 'conditionals', conditional_target: target } });
describe('trusted conditional assignments', () => {
  it('updates exact former generated display copy while preserving teacher wording and assigned level', async () => {
    const target = { scope: 'skill', mode: 'practice', difficulty: 'advanced', unitId: 'group-2' } as const;
    const generated = await import('@/lib/conditionalBootcampAssignment').then(module => module.resolveConditionalAssignment(target));
    const label = generated.title.slice(0, -': practice'.length);
    const original = targetRow(target);
    original.title = `${label}: Level 3 practice`;
    original.description = 'Assigned level 3 practice with explanations and optional hints.';
    const [normalized] = await resolveConditionalAssignments([original], 'student');
    expect(normalized.title).toBe(generated.title);
    expect(normalized.description).toBe(generated.description);
    expect(normalized.difficulty).toBe('advanced');
    expect(original.title).toContain('Level 3');
    const [custom] = await resolveConditionalAssignments([{ ...original, title: 'Only if: careful translation', description: 'Use your notes beside this set.' }], 'student');
    expect(custom.title).toBe('Only if: careful translation');
    expect(custom.description).toBe('Use your notes beside this set.');
  });
  it('resolves course and later starting stage without a course-wide level', async () => {
    const [course] = await resolveConditionalAssignments([row()], 'student');
    expect(course.unitIds).toHaveLength(30);
    expect(course.difficulty).toBeUndefined();
    const [stage] = await resolveConditionalAssignments([targetRow({ scope: 'stage', mode: 'learn', difficulty: 'advanced', unitId: 'group-3' })], 'student');
    expect(stage.unitIds[0]).toBe('group-3');
    expect(stage.unitIds).not.toContain('orientation');
    expect(stage.difficulty).toBeUndefined();
    expect(conditionalAssignmentAllowsAction(stage, { unitId: 'direct-linking', action: 'practice', difficulty: 'medium' })).toBe(true);
    expect(conditionalAssignmentAllowsAction(stage, { unitId: 'direct-linking', action: 'practice', difficulty: 'advanced' })).toBe(false);
  });
  it('limits area and skill learning to assigned units and activity level', async () => {
    const [area] = await resolveConditionalAssignments([targetRow({ scope: 'area', mode: 'learn', difficulty: 'medium', area: 'quantifiers' })], 'student');
    expect(area.unitIds).toHaveLength(4);
    expect(area.unitIds).not.toContain('group-3');
    const [skill] = await resolveConditionalAssignments([targetRow({ scope: 'skill', mode: 'learn', difficulty: 'advanced', unitId: 'group-3' })], 'student');
    expect(skill.unitIds).toEqual(['group-3']);
    expect(conditionalAssignmentAllowsAction(skill, { unitId: 'group-3', action: 'guided' })).toBe(true);
    expect(conditionalAssignmentAllowsAction(skill, { unitId: 'group-3', action: 'practice', difficulty: 'advanced' })).toBe(true);
    expect(conditionalAssignmentAllowsAction(skill, { unitId: 'group-3', action: 'practice', difficulty: 'beginner' })).toBe(false);
    expect(conditionalAssignmentAllowsAction(skill, { unitId: 'group-4', action: 'lesson' })).toBe(false);
  });
  it('practice grants do not grant notes or guided activities', async () => {
    const [practice] = await resolveConditionalAssignments([targetRow({ scope: 'general', mode: 'practice', difficulty: 'medium' })], 'student');
    expect(practice.unitIds).toHaveLength(26);
    expect(conditionalAssignmentAllowsAction(practice, { unitId: 'group-1', action: 'lesson' })).toBe(false);
    expect(conditionalAssignmentAllowsAction(practice, { unitId: 'group-1', action: 'guided' })).toBe(false);
    expect(conditionalAssignmentAllowsAction(practice, { unitId: 'group-1', action: 'practice', difficulty: 'medium' })).toBe(true);
  });
  it('rejects other students, hidden, draft, archived, and future or invalid unlocks', async () => {
    const rows = [row({ student_id: 'other' }), row({ visible_to_student: false }), row({ status: 'draft' }),
      row({ status: 'archived' }), row({ unlock_at: '2030-01-01T00:00:00Z' }), row({ unlock_at: 'invalid' })];
    expect(await resolveConditionalAssignments(rows, 'student', Date.parse('2026-10-01'))).toEqual([]);
    expect(await resolveConditionalAssignments([row({ status: 'completed', unlock_at: '2026-01-01' })], 'student', Date.parse('2026-10-01'))).toHaveLength(1);
  });
  it('invalid authoritative metadata never falls back to a broad source route', async () => {
    expect(await resolveConditionalAssignments([targetRow({ scope: 'skill', mode: 'learn', difficulty: 'medium', unitId: 'missing' }), targetRow(null)], 'student')).toEqual([]);
  });
  it('supports valid legacy links but rejects unsupported or malformed scopes', async () => {
    const legacy = (source_id: string) => row({ source_id, metadata_json: { bootcamp_id: 'conditionals' } });
    const [skill] = await resolveConditionalAssignments([legacy('/bootcamp/conditionals/practice?level=advanced&unit=group-3')], 'student');
    expect(skill.unitIds).toEqual(['group-3']);
    expect(skill.mode).toBe('practice');
    expect(await resolveConditionalAssignments([legacy('/bootcamp/conditionals?start=missing'), legacy('/bootcamp/conditionals?foo=unknown'), legacy('/bootcamp/conditionals/reference')], 'student')).toEqual([]);
    expect(await resolveConditionalAssignments([legacy('/bootcamp/conditionals')], 'student')).toHaveLength(1);
  });
  it('does not let tampered source queries expand an authoritative assignment', async () => {
    const own = targetRow({ scope: 'skill', mode: 'practice', difficulty: 'medium', unitId: 'group-3' });
    own.source_id = '/bootcamp/conditionals?start=orientation';
    const [assigned] = await resolveConditionalAssignments([own], 'student');
    expect(assigned.unitIds).toEqual(['group-3']);
    expect(conditionalAssignmentAllowsAction(assigned, { unitId: 'orientation', action: 'practice', difficulty: 'medium' })).toBe(false);
  });
});

it('preserves original stage assignment membership when teaching order changes', () => {
  const group = conditionalAssignmentUnitIds({ scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'group-1' });
  const contraposition = conditionalAssignmentUnitIds({ scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'contraposition' });
  expect(group).not.toContain('contraposition');
  expect(group).toContain('group-2');
  expect(contraposition).toContain('group-1');
  expect(contraposition).toContain('group-2');
});

it('resolves new stage grants in the current teaching order without losing later prerequisites', async () => {
  const target = { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'group-1', curriculumVersion: 2 } as const;
  const [stage] = await resolveConditionalAssignments([targetRow(target)], 'student');
  expect(stage.target.curriculumVersion).toBe(2);
  expect(stage.unitIds.slice(0, 3)).toEqual(['group-1', 'group-2', 'rules-facts']);
  expect(stage.unitIds).toContain('contraposition');
  expect(stage.unitIds.indexOf('contraposition')).toBeLessThan(stage.unitIds.indexOf('group-3'));
  expect(stage.unitIds).not.toContain('sufficient-necessary');
});

it('keeps unmarked metadata and legacy starting links on their original membership', async () => {
  const target = { scope: 'stage', mode: 'learn', difficulty: 'beginner', unitId: 'group-1' } as const;
  const [metadataStage, linkedStage] = await resolveConditionalAssignments([
    targetRow(target),
    row({ source_id: '/bootcamp/conditionals?start=group-1', metadata_json: { bootcamp_id: 'conditionals' } }),
  ], 'student');
  expect(metadataStage.unitIds).toEqual(linkedStage.unitIds);
  expect(metadataStage.unitIds).not.toContain('contraposition');
  expect(metadataStage.unitIds).not.toContain('rules-facts');
  expect(metadataStage.target.curriculumVersion).toBeUndefined();
});
