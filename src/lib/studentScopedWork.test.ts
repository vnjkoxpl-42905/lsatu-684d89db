import { describe, expect, it, vi } from 'vitest';
import { assertActiveStudentScope } from './studentScopedWork';

describe('selected-student server guard', () => {
  it('rejects a stale actor before any student query', async () => {
    const hasAdminRole = vi.fn(async () => true);
    await expect(assertActiveStudentScope(
      { mode: 'selected_student', actorId: 'teacher-a', studentId: 'student-a' },
      { authenticatedActorId: async () => 'teacher-b', hasAdminRole },
    )).rejects.toThrow('signed-in account changed');
    expect(hasAdminRole).not.toHaveBeenCalled();
  });

  it('requires the server role lookup for a selected student', async () => {
    await expect(assertActiveStudentScope(
      { mode: 'selected_student', actorId: 'teacher', studentId: 'student' },
      { authenticatedActorId: async () => 'teacher', hasAdminRole: async () => false },
    )).rejects.toThrow('Admin access is required');
  });

  it('allows an admin-selected student without changing actor identity', async () => {
    const hasAdminRole = vi.fn(async () => true);
    await expect(assertActiveStudentScope(
      { mode: 'selected_student', actorId: 'teacher', studentId: 'student' },
      { authenticatedActorId: async () => 'teacher', hasAdminRole },
    )).resolves.toBeUndefined();
    expect(hasAdminRole).toHaveBeenCalledWith('teacher');
  });

  it('does not call an admin role lookup for self', async () => {
    const hasAdminRole = vi.fn(async () => false);
    await expect(assertActiveStudentScope(
      { mode: 'self', actorId: 'student', studentId: 'student' },
      { authenticatedActorId: async () => 'student', hasAdminRole },
    )).resolves.toBeUndefined();
    expect(hasAdminRole).not.toHaveBeenCalled();
  });
});
