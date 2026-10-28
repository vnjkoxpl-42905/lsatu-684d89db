import { normalizeConditionalActivityConfig } from '@/bootcamps/conditionals/activityRegistry';
/** Shared producer/reader contract. Historical targets deliberately omit these fields. */
export const FULL_CONDITIONAL_EDITION = 'full-conditionals-v3' as const;
export type ConditionalCourseEdition = typeof FULL_CONDITIONAL_EDITION;
export const V3_PRIMARY_UNITS = ['orientation', 'sufficient-necessary', 'group-1', 'group-2', 'and-or', 'de-morgan', 'group-3', 'group-4', 'mixed-translation', 'implicit-conditionals', 'biconditionals', 'whole-rule-negation', 'direct-linking', 'no-link', 'triggering', 'domain', 'quantifier-meaning', 'quantifier-negation', 'quantifier-linking', 'quantifier-invalid', 'mbt', 'sufficient-assumption', 'necessary-assumption', 'flaw', 'parallel', 'principle'] as const;
export const V3_ELIGIBLE_AREAS = ['understanding', 'translation', 'linking', 'inference', 'complex', 'application', 'quantifiers'] as const;
export function validConditionalEditionTarget(target: { curriculumVersion?: unknown; courseEdition?: unknown; scope?: unknown; mode?: unknown; unitId?: unknown; area?: unknown; difficulty?: unknown; activityId?: unknown; activitySettings?: unknown }) {
  if (target.scope === 'activity') return target.courseEdition === FULL_CONDITIONAL_EDITION && target.curriculumVersion === 3 && target.mode === 'practice' && target.difficulty === 'beginner' && !!normalizeConditionalActivityConfig({ activity: target.activityId, ...(target.activitySettings as object ?? {}) });
  if (target.courseEdition === undefined) return target.curriculumVersion === undefined || target.curriculumVersion === 2;
  if (target.courseEdition !== FULL_CONDITIONAL_EDITION || target.curriculumVersion !== 3 || target.mode !== 'learn' || !['beginner', 'medium', 'advanced'].includes(target.difficulty as string)) return false;
  return target.scope === 'course' || target.scope === 'skill' && V3_PRIMARY_UNITS.includes(target.unitId as never)
    || target.scope === 'area' && V3_ELIGIBLE_AREAS.includes(target.area as never);
}

/** Enable only after the deployed student reader and UUID insert/RLS are verified. */
export function conditionalFullCourseAssignmentsReleased() {
  return import.meta.env.VITE_CONDITIONAL_FULL_COURSE_ASSIGNMENTS_RELEASED === 'true';
}
