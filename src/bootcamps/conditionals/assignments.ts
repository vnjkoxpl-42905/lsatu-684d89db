import { conditionalUnits, findConditionalUnit } from './content';
import { DIFFICULTIES, type ConditionalDifficulty } from './content/types';
import { getCurriculumDifficulty, getCurriculumUnits } from './curriculumPath';
import { CONDITIONAL_AREAS, DEFAULT_CONDITIONAL_TARGET, conditionalAssignmentDisplayCopy, resolveConditionalAssignment, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { classroomItemMatchesBootcamp } from '@/lib/bootcamps';

export interface ConditionalAssignmentRow {
  id: string; student_id: string; type: string; title: string; description?: string | null;
  source_id: string | null; metadata_json: Record<string, unknown> | null;
  status: string; visible_to_student: boolean; unlock_at: string | null;
}
export interface ResolvedConditionalAssignment {
  id: string; title: string; description?: string; route: string; target: ConditionalAssignmentTarget;
  unitIds: string[]; mode: 'learn' | 'practice'; difficulty?: ConditionalDifficulty;
}
function parseTarget(value: unknown): ConditionalAssignmentTarget | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const target = value as ConditionalAssignmentTarget;
  if (!['course', 'stage', 'area', 'skill', 'general'].includes(target.scope) ||
    !['learn', 'practice'].includes(target.mode) || !DIFFICULTIES.includes(target.difficulty) ||
    (target.curriculumVersion !== undefined && target.curriculumVersion !== 2)) return null;
  if ((target.scope === 'skill' || target.scope === 'stage') && !findConditionalUnit(target.unitId)) return null;
  if (target.scope === 'area' && !CONDITIONAL_AREAS.some(area => area.id === target.area)) return null;
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
export async function resolveConditionalAssignments(rows: ConditionalAssignmentRow[], userId: string, now = Date.now()): Promise<ResolvedConditionalAssignment[]> {
  const result: ResolvedConditionalAssignment[] = [];
  for (const row of rows) {
    if (row.student_id !== userId || row.type !== 'bootcamp_module' || !row.visible_to_student ||
      !['assigned', 'in_progress', 'completed'].includes(row.status) || !classroomItemMatchesBootcamp(row, 'conditionals')) continue;
    if (row.unlock_at && (!Number.isFinite(Date.parse(row.unlock_at)) || Date.parse(row.unlock_at) > now)) continue;
    const metadata = row.metadata_json;
    const target = metadata && Object.prototype.hasOwnProperty.call(metadata, 'conditional_target')
      ? parseTarget(metadata.conditional_target) : legacyTarget(row.source_id);
    if (!target) continue;
    const resolved = await resolveConditionalAssignment(target);
    result.push({ id: row.id, ...conditionalAssignmentDisplayCopy(resolved.target, resolved, row), route: resolved.route, target: resolved.target,
      unitIds: conditionalAssignmentUnitIds(resolved.target), mode: resolved.target.mode,
      ...(target.scope !== 'course' && target.scope !== 'stage' ? { difficulty: resolved.target.difficulty } : {}) });
  }
  return result;
}
/** URL parameters never grant work. Call this against a target read from the student's assignment row. */
export function conditionalAssignmentAllowsAction(assignment: ResolvedConditionalAssignment, request: {
  unitId: string; action: 'lesson' | 'guided' | 'practice'; difficulty?: ConditionalDifficulty;
}): boolean {
  if (!assignment.unitIds.includes(request.unitId)) return false;
  if (request.action !== 'practice') return assignment.mode === 'learn';
  return request.difficulty === (assignment.difficulty ?? getCurriculumDifficulty(request.unitId));
}
export async function conditionalTeacherPreview(): Promise<ResolvedConditionalAssignment> {
  const resolved = await resolveConditionalAssignment();
  return { id: 'teacher-preview', title: resolved.title, route: resolved.route, target: resolved.target,
    unitIds: conditionalAssignmentUnitIds(resolved.target), mode: 'learn' };
}
