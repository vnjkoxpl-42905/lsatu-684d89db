import { describe, expect, it } from 'vitest';
import { practiceOwnerId, resolveStudentSubjectScope, studentScopeQueryKey } from './studentSubjectScope';

describe('actor and selected student scope', () => {
  it('keeps ordinary practice on the actor account', () => {
    const result = resolveStudentSubjectScope({ actorId: 'teacher', selectedStudentId: 'student', roleLoading: false, isAdmin: true });
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') return;
    expect(result.scope).toEqual({ mode: 'selected_student', actorId: 'teacher', studentId: 'student' });
    expect(practiceOwnerId(result.scope)).toBe('teacher');
    expect(studentScopeQueryKey(result.scope)).toEqual(['student-work-scope', 'teacher', 'student']);
  });

  it('denies cross-student reads without an admin role', () => {
    expect(resolveStudentSubjectScope({ actorId: 'student-a', selectedStudentId: 'student-b', roleLoading: false, isAdmin: false }))
      .toEqual({ state: 'denied', reason: 'admin_required' });
  });

  it('waits for role resolution rather than granting a selected-student scope early', () => {
    expect(resolveStudentSubjectScope({ actorId: 'teacher', selectedStudentId: 'student', roleLoading: true, isAdmin: false }))
      .toEqual({ state: 'loading' });
  });

  it('lets the actor view their own records without an admin role', () => {
    expect(resolveStudentSubjectScope({ actorId: 'student', selectedStudentId: 'student', roleLoading: false, isAdmin: false }))
      .toEqual({ state: 'ready', scope: { mode: 'self', actorId: 'student', studentId: 'student' } });
  });
});
