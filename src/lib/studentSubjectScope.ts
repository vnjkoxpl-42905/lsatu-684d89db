/**
 * `actorId` is always the authenticated account making the request.
 * `studentId` is the subject of a record read. They differ only in an
 * authorized teacher/admin view; this is never a sign-in switch.
 */
export type StudentSubjectScope =
  | { mode: 'self'; actorId: string; studentId: string }
  | { mode: 'selected_student'; actorId: string; studentId: string };

export type StudentScopeResolution =
  | { state: 'ready'; scope: StudentSubjectScope }
  | { state: 'loading' }
  | { state: 'denied'; reason: 'signed_out' | 'admin_required' };

export function resolveStudentSubjectScope(input: {
  actorId: string | null | undefined;
  selectedStudentId?: string | null;
  roleLoading: boolean;
  isAdmin: boolean;
}): StudentScopeResolution {
  const { actorId, selectedStudentId, roleLoading, isAdmin } = input;
  if (!actorId) return { state: 'denied', reason: 'signed_out' };
  const studentId = selectedStudentId?.trim() || actorId;
  if (studentId === actorId) return { state: 'ready', scope: { mode: 'self', actorId, studentId: actorId } };
  if (roleLoading) return { state: 'loading' };
  if (!isAdmin) return { state: 'denied', reason: 'admin_required' };
  return { state: 'ready', scope: { mode: 'selected_student', actorId, studentId } };
}

/** Teacher practice, answers, History and scores always belong to the actor. */
export function practiceOwnerId(scope: StudentSubjectScope): string {
  return scope.actorId;
}

export function studentScopeQueryKey(scope: StudentSubjectScope): readonly [string, string, string] {
  return ['student-work-scope', scope.actorId, scope.studentId] as const;
}
