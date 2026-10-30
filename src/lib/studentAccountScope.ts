import { supabase } from '@/integrations/supabase/client';
import { assertActiveStudentScope } from '@/lib/studentScopedWork';
import type { StudentSubjectScope } from '@/lib/studentSubjectScope';

export class StudentIdentityUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'StudentIdentityUnavailableError'; }
}
interface IdentityDependencies {
  assertScope(scope: StudentSubjectScope): Promise<void>;
  lookup(classId: string): Promise<{ data: unknown; error: unknown }>;
}
const defaults: IdentityDependencies = {
  assertScope: assertActiveStudentScope,
  lookup: classId => (supabase as unknown as { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> }).rpc('get_student_progress_user_id', { p_class_id: classId }),
};
/** Assignment scope keeps class identity. Account records require validated canonical auth identity. */
export async function resolveStudentAccountId(scope: StudentSubjectScope, deps: IdentityDependencies = defaults): Promise<string> {
  await deps.assertScope(scope);
  if (scope.mode === 'self') return scope.actorId;
  const result = await deps.lookup(scope.studentId);
  await deps.assertScope(scope);
  if (result.error) throw new StudentIdentityUnavailableError('This student’s account identity could not be confirmed. A missing or conflicting mapping must be resolved before showing account records.');
  if (result.data === null) throw new StudentIdentityUnavailableError('This student has no confirmed account identity. Account records are unavailable.');
  // The deployed RPC deliberately rejects class/auth aliases. Do not infer or
  // accept a different user UUID from a malformed or stale acknowledgement.
  if (typeof result.data !== 'string' || result.data !== scope.studentId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.data)) {
    throw new StudentIdentityUnavailableError('This student’s identity conflicts with the canonical account. Account records are unavailable.');
  }
  return result.data;
}
