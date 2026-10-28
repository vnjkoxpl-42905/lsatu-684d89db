import { describe, expect, it } from 'vitest';
import { conditionalProtectedGrantRoute, conditionalTargetKey, resolveConditionalAssignment } from './conditionalBootcampAssignment';
import { parseTarget, protectedConditionalTarget } from '@/bootcamps/conditionals/assignments';
import { FULL_CONDITIONAL_EDITION } from './conditionalCourseEdition';

const full = { scope: 'course', mode: 'learn', difficulty: 'beginner', curriculumVersion: 3, courseEdition: FULL_CONDITIONAL_EDITION } as const;
describe('explicit full conditional edition', () => {
  it('keeps historical keys byte-identical and gives the new course a distinct key', async () => {
    expect(conditionalTargetKey()).toBe('course');
    expect(conditionalTargetKey(full)).toBe('course:v3');
    expect((await resolveConditionalAssignment(full)).target).toEqual(full);
  });
  it('round trips supported scopes and refuses supplementary or mixed-edition grants', async () => {
    for (const target of [full, { ...full, scope: 'skill' as const, unitId: 'group-3', difficulty: 'advanced' as const }, { ...full, scope: 'area' as const, area: 'quantifiers' as const }]) {
      const normalized = (await resolveConditionalAssignment(target)).target;
      const row = { id: 'row', source_table: 'bootcamps', source_id: conditionalProtectedGrantRoute(normalized, 'row'), metadata_json: { bootcamp_id: 'conditionals', conditional_target: normalized, conditional_target_key: conditionalTargetKey(normalized) } };
      expect(protectedConditionalTarget(row)).toEqual(normalized);
      expect(protectedConditionalTarget({ ...row, id: 'different' })).toBeNull();
      expect(protectedConditionalTarget({ ...row, metadata_json: { ...row.metadata_json, conditional_target: { ...normalized, scope: 'course' } } })).toEqual(target.scope === 'course' ? normalized : null);
    }
    for (const patch of [{ scope: 'general' }, { scope: 'stage' }, { mode: 'practice' }, { curriculumVersion: 2 }, { curriculumVersion: undefined }, { courseEdition: 'unknown' }, { scope: 'skill', unitId: 'negation' }]) {
      const invalid = { ...full, ...patch } as never;
      expect(parseTarget(invalid)).toBeNull();
      expect(() => conditionalTargetKey(invalid)).toThrow();
      await expect(resolveConditionalAssignment(invalid)).rejects.toThrow();
    }
  });
  it('does not turn metadata-only edits or prefix tricks into a grant', () => {
    const row = { id: 'row', source_table: 'bootcamps', source_id: '/bootcamp/conditionals', metadata_json: { bootcamp_id: 'conditionals', conditional_target: full, conditional_target_key: 'course:v3' } };
    expect(protectedConditionalTarget(row)).toBeNull();
    expect(protectedConditionalTarget({ ...row, source_id: '/bootcamp/conditionals-attacker?assignment=row' })).toBeNull();
    expect(protectedConditionalTarget({ ...row, source_id: conditionalProtectedGrantRoute(full, 'row'), source_table: 'other' })).toBeNull();
  });
  it('is rejected by the preserved pre-v3 parser and cannot fall back to another old row', () => {
    // Frozen old-reader checks from main 6a167c85 assignments.ts, not the new parser.
    const oldAccepts = (target: { scope: string; mode: string; difficulty: string; curriculumVersion?: number }) => ['course', 'stage', 'area', 'skill', 'general'].includes(target.scope) && ['learn', 'practice'].includes(target.mode) && ['beginner', 'medium', 'advanced'].includes(target.difficulty) && (target.curriculumVersion === undefined || target.curriculumVersion === 2);
    expect(oldAccepts({ scope: 'course', mode: 'learn', difficulty: 'beginner' })).toBe(true);
    expect(oldAccepts(full)).toBe(false);
    const source = conditionalProtectedGrantRoute(full, 'new-row');
    const rows = [{ id: 'old-row', target: { scope: 'course', mode: 'learn', difficulty: 'beginner' } }, { id: 'new-row', target: full }].filter(row => oldAccepts(row.target));
    const params = new URL(source, 'https://local.invalid').searchParams;
    const active = params.has('assignment') ? rows.find(row => row.id === params.get('assignment')) : rows[0];
    expect(active).toBeUndefined();
  });
});
