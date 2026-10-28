import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isPrimaryAdmin } from '@/lib/adminUsers';

/**
 * Access + role mutations for one student, shared by the dossier's Overview tab.
 *
 * Two defects in the DeskPeopleSurface original are fixed here:
 *
 * 1. It trusted the optimistic write and never refetched, so the row drifted
 *    from the server whenever the Edge Function normalized a value (or a
 *    second admin changed it). We refetch the roster on success and let the
 *    server's answer win.
 * 2. Its rollback restored the WHOLE user object captured before the call, so
 *    a failed role change also reverted any unrelated field that had succeeded
 *    in between. Overrides here are per-field: a failure clears only the key
 *    it touched.
 */
export function useStudentAccess(studentId: string | null) {
  const qc = useQueryClient();
  // Optimistic overlay. Only holds keys with a write in flight; the roster
  // query stays the source of truth for everything else.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const clearField = useCallback((field: string) => {
    setPending((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setBusy((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const refetchRoster = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['hub-managed-users'] }),
      qc.invalidateQueries({ queryKey: ['teacher-student-profile', studentId] }),
    ]);
  }, [qc, studentId]);

  const toggleAccess = useCallback(
    async (field: string, value: boolean) => {
      if (!studentId) return;
      setPending((prev) => ({ ...prev, [field]: value }));
      setBusy((prev) => ({ ...prev, [field]: true }));
      try {
        const res = await supabase.functions.invoke('admin-manage-users', {
          method: 'POST',
          body: { class_id: studentId, field, value },
        });
        if (res.error) throw res.error;
        // Server is authority: drop the override and pull the real row.
        await refetchRoster();
        clearField(field);
      } catch {
        // Per-field rollback: this key only, nothing else the user changed.
        clearField(field);
        toast.error('Failed to update permission');
      }
    },
    [clearField, refetchRoster, studentId],
  );

  const setRole = useCallback(
    async (role: 'admin' | 'user', email: string | null) => {
      if (!studentId) return;
      if (role === 'user' && isPrimaryAdmin(email)) {
        toast.error('The primary admin account cannot be demoted.');
        return;
      }
      setBusy((prev) => ({ ...prev, role: true }));
      try {
        const res = await supabase.functions.invoke('admin-manage-users', {
          method: 'POST',
          body: { action: 'set_role', user_id: studentId, role },
        });
        if (res.error) throw res.error;
        await refetchRoster();
        clearField('role');
        toast.success(role === 'admin' ? 'Promoted to admin' : 'Demoted to user');
      } catch {
        clearField('role');
        toast.error('Role change failed');
      }
    },
    [clearField, refetchRoster, studentId],
  );

  /** Read a flag through the optimistic overlay. */
  const readFlag = useCallback(
    (source: Record<string, unknown> | null | undefined, field: string): boolean => {
      if (field in pending) return pending[field];
      return Boolean(source?.[field]);
    },
    [pending],
  );

  return { toggleAccess, setRole, readFlag, isBusy: (field: string) => Boolean(busy[field]) };
}
