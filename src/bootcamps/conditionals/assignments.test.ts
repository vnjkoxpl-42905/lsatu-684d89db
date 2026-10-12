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
