import { conditionalUnits, findConditionalUnit } from './content';
import { DIFFICULTIES, type ConditionalDifficulty } from './content/types';
import { getCurriculumDifficulty, getCurriculumUnits } from './curriculumPath';
import { CONDITIONAL_AREAS, DEFAULT_CONDITIONAL_TARGET, conditionalAssignmentDisplayCopy, resolveConditionalAssignment, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { classroomItemMatchesBootcamp } from '@/lib/bootcamps';
import { FULL_CONDITIONAL_EDITION, validConditionalEditionTarget } from '@/lib/conditionalCourseEdition';
import { conditionalTargetKey } from '@/lib/conditionalBootcampAssignment';
import { LEGACY_OPENING_COURSE_PATH, LEGACY_OPENING_COURSE_STEPS, type OpeningCourseStep } from './openingCoursePath';

export interface ConditionalAssignmentRow {
  id: string; student_id: string; type: string; title: string; description?: string | null;
  source_id: string | null; source_table?: string | null; metadata_json: Record<string, unknown> | null;
  status: string; visible_to_student: boolean; unlock_at: string | null;
}
export interface ResolvedConditionalAssignment {
  id: string; title: string; description?: string; route: string; target: ConditionalAssignmentTarget;
  unitIds: string[]; mode: 'learn' | 'practice'; difficulty?: ConditionalDifficulty;
}
export function parseTarget(value: unknown): ConditionalAssignmentTarget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const target = value as ConditionalAssignmentTarget;
  if (!['course', 'stage', 'area', 'skill', 'general'].includes(target.scope) ||
    !['learn', 'practice'].includes(target.mode) || !DIFFICULTIES.includes(target.difficulty) ||
    !validConditionalEditionTarget(target)) return null;
  if ((target.scope === 'skill' || target.scope === 'stage') && !findConditionalUnit(target.unitId)) return null;
  if (target.scope === 'area' && !CONDITIONAL_AREAS.some(area => area.id === target.area)) return null;
  return target;
}
/** Only call on a row fetched from the database. Browser search parameters never reach this parser. */
export function protectedConditionalTarget(row: Pick<ConditionalAssignmentRow, 'id' | 'source_id' | 'source_table' | 'metadata_json'>): ConditionalAssignmentTarget | null {
  if (row.source_table !== 'bootcamps' || !row.source_id?.startsWith('/bootcamp/conditionals?')) return null;
  const url = new URL(row.source_id, 'https://local.invalid');
  if (url.origin !== 'https://local.invalid' || url.pathname !== '/bootcamp/conditionals' || url.searchParams.get('assignment') !== row.id) return null;
  const p = url.searchParams;
  const allowed = new Set(['curriculumVersion', 'edition', 'scope', 'mode', 'difficulty', 'unitId', 'area', 'assignment']);
  if ([...p.keys()].some(key => !allowed.has(key) || p.getAll(key).length !== 1) || p.get('curriculumVersion') !== '3') return null;
  const target = parseTarget({ scope: p.get('scope'), mode: p.get('mode'), difficulty: p.get('difficulty'), curriculumVersion: 3, courseEdition: p.get('edition'), ...(p.has('unitId') ? { unitId: p.get('unitId') } : {}), ...(p.has('area') ? { area: p.get('area') } : {}) });
  const metadataTarget = parseTarget(row.metadata_json?.conditional_target);
  if (!target || !metadataTarget || target.courseEdition !== FULL_CONDITIONAL_EDITION || row.metadata_json?.bootcamp_id !== 'conditionals') return null;
  if (target.scope === 'course' && (target.difficulty !== 'beginner' || p.has('unitId') || p.has('area')) || target.scope === 'skill' && p.has('area') || target.scope === 'area' && p.has('unitId')) return null;
  if (conditionalTargetKey(target) !== conditionalTargetKey(metadataTarget) || target.difficulty !== metadataTarget.difficulty || target.scope !== metadataTarget.scope) return null;
  if (row.metadata_json?.conditional_target_key !== conditionalTargetKey(target)) return null;
  return target;
}
function legacyTarget(source: string | null): ConditionalAssignmentTarget | null {
  if (!source || !source.startsWith('/bootcamp/conditionals')) return null;
  const url = new URL(source, 'https://local.invalid');
  const base = '/bootcamp/conditionals';
  if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) return null;
  const level = url.searchParams.get('level') ?? 'beginner';
  if (!DIFFICULTIES.includes(level as ConditionalDifficulty)) return null;
  const difficulty = level as ConditionalDifficulty;
  const start = url.searchParams.get('start');
  if (start) return parseTarget({ scope: 'stage', mode: 'learn', difficulty, unitId: start });
  const pathUnit = url.pathname.match(/^\/bootcamp\/conditionals\/(?:lessons|activities)\/([^/]+)$/)?.[1];
  const unitId = pathUnit ?? url.searchParams.get('unit');
  const area = url.searchParams.get('area');
  const mode = url.pathname === `${base}/practice` ? 'practice' : 'learn';
  if (unitId) return parseTarget({ scope: 'skill', mode, difficulty, unitId });
  if (area) return parseTarget({ scope: 'area', mode, difficulty, area });
  if (url.pathname === `${base}/practice`) return parseTarget({ scope: 'general', mode: 'practice', difficulty });
  return url.pathname === base && !url.search ? { ...DEFAULT_CONDITIONAL_TARGET } : null;
}
export function conditionalAssignmentUnitIds(target: ConditionalAssignmentTarget): string[] {
  if (target.scope === 'course') return getCurriculumUnits(conditionalUnits).map(unit => unit.id);
  if (target.scope === 'stage') {
    if (target.curriculumVersion === 2) return getCurriculumUnits(conditionalUnits, target.unitId).map(unit => unit.id);
    // Existing stage grants refer to the original membership, not a mutable display order.
    const originalOpening = ['orientation', 'rules-facts', 'sufficient-necessary', 'truth-validity', 'negation', 'contraposition', 'group-1', 'group-2'];
    const originalIds = [...originalOpening, ...conditionalUnits.map(unit => unit.id).filter(id => !originalOpening.includes(id))];
    const start = originalIds.indexOf(target.unitId);
    return originalIds.slice(Math.max(0, start));
  }
  return conditionalUnits.filter(unit => target.scope === 'skill' ? unit.id === target.unitId
    : target.scope === 'area' ? unit.area === target.area : unit.phase === 'conditional').map(unit => unit.id);
}
export interface UnavailableConditionalAssignment { id: string; title: string; reason: 'teacher-update' }
export async function readConditionalAssignments(rows: ConditionalAssignmentRow[], userId: string, now = Date.now()): Promise<{ assignments: ResolvedConditionalAssignment[]; unavailableAssignments: UnavailableConditionalAssignment[] }> {
  const result: ResolvedConditionalAssignment[] = [];
  const unavailableAssignments: UnavailableConditionalAssignment[] = [];
  for (const row of rows) {
    if (row.student_id !== userId || row.type !== 'bootcamp_module' || !row.visible_to_student ||
      !['assigned', 'in_progress', 'completed'].includes(row.status) || !classroomItemMatchesBootcamp(row, 'conditionals')) continue;
    if (row.unlock_at && (!Number.isFinite(Date.parse(row.unlock_at)) || Date.parse(row.unlock_at) > now)) continue;
    const metadata = row.metadata_json;
    const authored = metadata?.conditional_target as ConditionalAssignmentTarget | undefined;
    const isExpanded = authored?.courseEdition !== undefined || authored?.curriculumVersion === 3 || /[?&](?:edition=|curriculumVersion=3(?:&|$))/.test(row.source_id ?? '');
    const target = isExpanded ? protectedConditionalTarget(row) : metadata && Object.prototype.hasOwnProperty.call(metadata, 'conditional_target')
      ? parseTarget(metadata.conditional_target) : legacyTarget(row.source_id);
    if (!target) {
      if (isExpanded) unavailableAssignments.push({ id: row.id, title: row.title, reason: 'teacher-update' });
      continue;
    }
    const resolved = await resolveConditionalAssignment(target);
    result.push({ id: row.id, ...conditionalAssignmentDisplayCopy(resolved.target, resolved, row), route: resolved.route, target: resolved.target,
      unitIds: conditionalAssignmentUnitIds(resolved.target), mode: resolved.target.mode,
      ...(target.scope !== 'course' && target.scope !== 'stage' ? { difficulty: resolved.target.difficulty } : {}) });
  }
  return { assignments: result, unavailableAssignments };
}
/** Compatibility entry point returns grants only; rejected rows never become legacy targets. */
export async function resolveConditionalAssignments(rows: ConditionalAssignmentRow[], userId: string, now = Date.now()): Promise<ResolvedConditionalAssignment[]> {
  return (await readConditionalAssignments(rows, userId, now)).assignments;
}
/** One permission path for numbered work. Aliases are alternatives; cumulative topics are all required. */
export function registryStepAllowed(assignment: ResolvedConditionalAssignment, step: OpeningCourseStep, requestedDifficulty?: ConditionalDifficulty): boolean {
  if (!validConditionalEditionTarget(assignment.target)) return false;
  const expanded = assignment.target.courseEdition === FULL_CONDITIONAL_EDITION;
  const membership = (step as OpeningCourseStep & { editions?: string[] }).editions;
  if (expanded ? !membership?.includes(FULL_CONDITIONAL_EDITION) : ![...LEGACY_OPENING_COURSE_PATH, ...LEGACY_OPENING_COURSE_STEPS].some(entry => entry.id === step.id)) return false;
  const record = step as OpeningCourseStep & { accessAnyOfUnitIDs?: string[]; requiredAllOfUnitIDs?: string[]; allowedAction?: 'learn' | 'guided' };
  const alternatives = record.accessAnyOfUnitIDs ?? [step.unitId, ...(step.alsoAvailableIn ?? [])];
  if (!alternatives.length || !alternatives.some(id => assignment.unitIds.includes(id)) || !(record.requiredAllOfUnitIDs ?? []).every(id => assignment.unitIds.includes(id))) return false;
  const action = record.allowedAction === 'learn' || step.type === 'note' ? 'lesson' : 'guided';
  if (assignment.mode !== 'learn') return false;
  if (expanded && requestedDifficulty && assignment.difficulty && requestedDifficulty !== assignment.difficulty) return false;
  return alternatives.some(unitId => conditionalAssignmentAllowsAction(assignment, { unitId, action, difficulty: requestedDifficulty ?? assignment.difficulty ?? getCurriculumDifficulty(unitId) }));
}
/** URL parameters never grant work. Call this against a target read from the student's assignment row. */
export function conditionalAssignmentAllowsAction(assignment: ResolvedConditionalAssignment, request: {
  unitId: string; action: 'lesson' | 'guided' | 'practice'; difficulty?: ConditionalDifficulty;
}): boolean {
  if (!assignment.unitIds.includes(request.unitId)) return false;
  if (request.action !== 'practice') return assignment.mode === 'learn';
  return request.difficulty === (assignment.difficulty ?? getCurriculumDifficulty(request.unitId));
}
export async function conditionalTeacherPreview(edition?: typeof FULL_CONDITIONAL_EDITION): Promise<ResolvedConditionalAssignment> {
  const resolved = await resolveConditionalAssignment(edition ? { ...DEFAULT_CONDITIONAL_TARGET, curriculumVersion: 3, courseEdition: edition } : undefined);
  return { id: 'teacher-preview', title: resolved.title, route: resolved.route, target: resolved.target,
    unitIds: conditionalAssignmentUnitIds(resolved.target), mode: 'learn' };
}
