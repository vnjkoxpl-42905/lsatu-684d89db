import { supabase } from '@/integrations/supabase/client';
import { loadStudentAssignments, loadStudentTAAssignments } from '@/hooks/useStudentAssignments';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { listAssignmentsForStudent as listGuidedAssignments } from '@/lib/guidedDrills';
import { listStudentAssignments as listActivityAssignments } from '@/features/activity-centre/api/activitiesClient';
import { loadActivityWorkEvidence, loadAssignmentWorkEvidence } from '@/lib/studentWorkEvidence';
import type { StudentSubjectScope } from '@/lib/studentSubjectScope';

export type ScopedWorkSource<T> =
  | { state: 'ready'; data: T }
  | { state: 'failed'; error: unknown };

async function readSource<T>(read: () => Promise<T>): Promise<ScopedWorkSource<T>> {
  try {
    return { state: 'ready', data: await read() };
  } catch (error) {
    return { state: 'failed', error };
  }
}

interface ScopeVerifier {
  authenticatedActorId(): Promise<string | null>;
  hasAdminRole(actorId: string): Promise<boolean>;
}

const serverVerifier: ScopeVerifier = {
  async authenticatedActorId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  },
  async hasAdminRole(actorId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', actorId)
      .eq('role', 'admin')
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },
};

/**
 * A client guard for stale scope objects. Every following table read still
 * relies on its own RLS policy. This guard never signs in as the student.
 */
export async function assertActiveStudentScope(
  scope: StudentSubjectScope,
  verifier: ScopeVerifier = serverVerifier,
): Promise<void> {
  const activeActor = await verifier.authenticatedActorId();
  if (!activeActor || activeActor !== scope.actorId) throw new Error('The signed-in account changed. Reload this student view.');
  if (scope.mode === 'self') {
    if (scope.studentId !== activeActor) throw new Error('Invalid self scope.');
    return;
  }
  if (scope.studentId === activeActor) throw new Error('A selected-student scope must name another account.');
  if (!(await verifier.hasAdminRole(activeActor))) throw new Error('Admin access is required for this student view.');
}

/** Each source query carries an explicit student filter, even for admins. */
export async function loadScopedStudentWorkSources(scope: StudentSubjectScope) {
  await assertActiveStudentScope(scope);
  const studentId = scope.studentId;
  const [hw, ta, guided, activities, itemsResult, assignmentEvidence] = await Promise.all([
    loadStudentAssignments(studentId),
    loadStudentTAAssignments(studentId),
    listGuidedAssignments(studentId),
    listActivityAssignments(studentId),
    supabase.from('classroom_items').select('*').eq('student_id', studentId).eq('visible_to_student', true),
    loadAssignmentWorkEvidence(studentId),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  const activityEvidence = await loadActivityWorkEvidence(studentId, activities.map((item) => item.id));
  await assertActiveStudentScope(scope);
  return {
    actorId: scope.actorId,
    studentId,
    hw,
    ta,
    guided,
    activities,
    items: (itemsResult.data ?? []) as ClassroomItem[],
    guidedEvidence: assignmentEvidence.guided,
    homeworkEvidence: assignmentEvidence.homework,
    activityEvidence,
  };
}

/**
 * Owned guided and Activity instances for the teacher's selected-student Work
 * view. Independent results keep one failed source from hiding the other.
 * The caller still uses the same row projection as student My Work.
 */
export async function loadScopedOwnedAssignmentSources(scope: StudentSubjectScope) {
  await assertActiveStudentScope(scope);
  const studentId = scope.studentId;
  const [guided, activities, items, assignmentEvidence] = await Promise.all([
    readSource(() => listGuidedAssignments(studentId)),
    readSource(() => listActivityAssignments(studentId)),
    readSource(async () => {
      const { data, error } = await supabase
        .from('classroom_items')
        .select('*')
        .eq('student_id', studentId);
      if (error) throw error;
      return (data ?? []) as ClassroomItem[];
    }),
    readSource(() => loadAssignmentWorkEvidence(studentId)),
  ]);
  const activityEvidence = activities.state === 'ready'
    ? await readSource(() => loadActivityWorkEvidence(studentId, activities.data.map((item) => item.id)))
    : null;
  await assertActiveStudentScope(scope);
  return { actorId: scope.actorId, studentId, guided, activities, items, assignmentEvidence, activityEvidence };
}
