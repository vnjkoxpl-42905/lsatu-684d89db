import { describe, expect, it } from 'vitest';
import { conditionalActivityAllowed, conditionalActivityKey, conditionalActivitySearch, conditionalActivitySelection, normalizeConditionalActivityConfig, parseConditionalActivitySearch, REPHRASE_ADVANCED_ITEMS, REPHRASE_BASIC_GROUP_ORDERS } from './activityRegistry';
import rephrase from '@/features/activity-centre/content/conditional-rephrase.json';
import { conditionalProtectedGrantRoute, conditionalTargetKey, DEFAULT_CONDITIONAL_TARGET, resolveConditionalAssignment, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { conditionalAssignmentUnitIds, protectedConditionalTarget, readConditionalAssignments } from './assignments';
import { snapshotConditionalRequirements } from './courseRequirements';

const config = normalizeConditionalActivityConfig({ activity: 'diagram', groups: ['g3'], stage: 'contrapositive' })!;
const target: ConditionalAssignmentTarget = { scope: 'activity', mode: 'practice', difficulty: 'beginner', curriculumVersion: 3, courseEdition: FULL_CONDITIONAL_EDITION, activityId: 'diagram', activitySettings: { groups: ['g3'], stage: 'contrapositive' } };
const row = () => ({ id: 'owned', student_id: 'student', type: 'bootcamp_module', source_table: 'bootcamps', source_id: conditionalProtectedGrantRoute(target, 'owned'), title: 'Diagram practice', status: 'assigned', visible_to_student: true, unlock_at: null, metadata_json: { bootcamp_id: 'conditionals', conditional_target: target, conditional_target_key: conditionalTargetKey(target) } });
describe('conditional activity contract', () => {
  it('round trips canonical supported settings and rejects duplicate or unsupported filters', () => {
    expect(parseConditionalActivitySearch(conditionalActivitySearch(config))).toEqual(config);
    expect(parseConditionalActivitySearch(new URLSearchParams('activity=diagram&groups=g1&groups=g3'))).toBeNull();
    expect(normalizeConditionalActivityConfig({ activity: 'unless', groups: ['g1'] })).toBeNull();
    expect(normalizeConditionalActivityConfig({ activity: 'guided', set: 'not-a-conditional-set' })).toBeNull();
    expect(normalizeConditionalActivityConfig({ activity: 'rephrase', groups: ['g3'] })).toBeNull();
    expect(conditionalActivityKey(config)).not.toBe(conditionalActivityKey({ ...config, stage: 'translate' }));
  });
  it('selects original bank identities without copying questions', () => {
    expect(conditionalActivitySelection({ activity: 'missing-links', level: 'all' }).selectedQuestionIds).toHaveLength(22);
    expect(conditionalActivitySelection({ activity: 'linking', level: 'all' }).selectedQuestionIds).toHaveLength(8);
    expect(conditionalActivitySelection({ activity: 'must-be-true', level: 'all' }).selectedQuestionIds).toHaveLength(10);
    expect(conditionalActivitySelection({ activity: 'rephrase', groups: ['g3'], timing: 'untimed' }).selectedItemOrders).toContain(18);
  });
  it('accounts for every Rephrase item and separates advanced shared topics from basic group filters', () => {
    const basic = Object.values(REPHRASE_BASIC_GROUP_ORDERS).flat();
    const advanced = REPHRASE_ADVANCED_ITEMS.map(item => item.order);
    const allOrders = [...basic, ...advanced].sort((a, b) => a - b);
    expect(allOrders).toEqual(rephrase.items.map(item => item.order));
    expect(new Set(allOrders).size).toBe(62);
    expect(conditionalActivitySelection({ activity: 'rephrase', groups: ['g1'], timing: 'untimed' }).selectedItemOrders).toEqual(REPHRASE_BASIC_GROUP_ORDERS.g1);
    expect(conditionalActivitySelection({ activity: 'rephrase', groups: ['g2'], timing: 'untimed' }).selectedItemOrders).toEqual(REPHRASE_BASIC_GROUP_ORDERS.g2);
    expect(REPHRASE_BASIC_GROUP_ORDERS.g1).toEqual(expect.arrayContaining([38, 40]));
    expect(REPHRASE_BASIC_GROUP_ORDERS.g2).toEqual(expect.arrayContaining([49, 50, 51, 55, 60, 61]));
    expect(REPHRASE_BASIC_GROUP_ORDERS.g3).toEqual(expect.arrayContaining([52, 53, 54, 59]));
    expect(REPHRASE_BASIC_GROUP_ORDERS.g1).not.toContain(57);
    expect(conditionalActivityAllowed({ target: { scope: 'area' }, unitIds: ['group-1', 'group-2', 'group-3', 'group-4'] }, { activity: 'rephrase' })).toBe(false);
    expect(conditionalActivityAllowed({ target: { scope: 'area' }, unitIds: ['group-1'] }, { activity: 'rephrase', groups: ['g1'], timing: 'untimed' })).toBe(true);
    expect(REPHRASE_ADVANCED_ITEMS.find(item => item.order === 57)).toMatchObject({ topic: 'compound condition', groups: ['g1'] });
    expect(conditionalActivitySelection({ activity: 'rephrase', groups: ['g1'], timing: 'untimed' }).selectionLabel).toContain('advanced and mixed items are excluded');
    const full = conditionalActivitySelection({ activity: 'rephrase' });
    expect(full.selectedItemOrders).toBeUndefined();
    expect(full.selectionLabel).toContain('All 62 sentences, including compound conditions');
  });
  it('keeps activity targets separate from numbered lessons and requirements', async () => {
    expect(conditionalAssignmentUnitIds(target)).toEqual([]);
    expect(() => snapshotConditionalRequirements(target)).toThrow();
    const parsed = await readConditionalAssignments([row()], 'student');
    expect(parsed.assignments).toHaveLength(1);
    expect(parsed.assignments[0].requirements).toBeUndefined();
    expect((await readConditionalAssignments([row()], 'foreign')).assignments).toHaveLength(0);
    expect((await resolveConditionalAssignment(target)).target).toEqual(target);
    expect(conditionalTargetKey(DEFAULT_CONDITIONAL_TARGET)).toBe('course');
  });
  it('requires fetched route and metadata to agree on every setting', () => {
    expect(protectedConditionalTarget(row())).toEqual(target);
    const forged = row();
    forged.metadata_json.conditional_target = { ...target, activitySettings: { groups: ['g4'], stage: 'contrapositive' } };
    expect(protectedConditionalTarget(forged)).toBeNull();
    const duplicate = row(); duplicate.source_id += '&activityId=unless';
    expect(protectedConditionalTarget(duplicate)).toBeNull();
  });
  it.each(['legacy', 'v3'])('full %s course includes guided collections', edition => {
    expect(conditionalActivityAllowed({ target: { scope: 'course', ...(edition === 'v3' ? { courseEdition: FULL_CONDITIONAL_EDITION } : {}) }, unitIds: [] }, { activity: 'guided' })).toBe(true);
  });
  it('limits focused and lesson grants to their own configured work', () => {
    expect(conditionalActivityAllowed({ target, unitIds: [] }, config)).toBe(true);
    expect(conditionalActivityAllowed({ target, unitIds: [] }, { ...config, groups: ['g4'] })).toBe(false);
    expect(conditionalActivityAllowed({ target: { scope: 'skill' }, unitIds: ['group-3'] }, config)).toBe(true);
    expect(conditionalActivityAllowed({ target: { scope: 'skill' }, unitIds: ['group-3'] }, { activity: 'guided' })).toBe(false);
    expect(conditionalActivityAllowed({ target: { scope: 'general', difficulty: 'beginner' }, unitIds: ['group-3'] }, { activity: 'unless' })).toBe(false);
    expect(conditionalActivityAllowed({ target: { scope: 'skill', difficulty: 'beginner' }, unitIds: ['group-3'] }, { activity: 'legacy-practice', mode: 'practice', difficulty: 'beginner' })).toBe(false);
  });
});
