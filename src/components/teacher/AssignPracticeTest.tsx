import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { setPracticeTestAssignment } from '@/lib/accessTierClient';

type Assigned = { pt: number; status: string };

/**
 * Assign one full PrepTest sitting. It opens that sitting and nothing else:
 * a student without the Practice tests switch sees exactly their assigned
 * PrepTests in the Testing Centre, and the sitting shows on Assigned work.
 */
export function AssignPracticeTest({ classId, who }: { classId: string; who: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pt, setPt] = useState('');
  const [busy, setBusy] = useState(false);
  const key = ['practice-test-assignments', classId];

  const { data: assigned = [] } = useQuery<Assigned[]>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_test_assignments' as never)
        .select('pt, status')
        .eq('student_id', classId)
        .neq('status', 'archived')
        .order('pt', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assigned[];
    },
  });

  const call = async (action: 'assign_practice_test' | 'unassign_practice_test', value: number) => {
    setBusy(true);
    try {
      await setPracticeTestAssignment(classId, value, action === 'assign_practice_test', user?.id);
      toast.success(
        action === 'assign_practice_test'
          ? `PrepTest ${value} assigned to ${who}`
          : `PrepTest ${value} taken off ${who}'s work`,
      );
      setPt('');
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (error) {
      console.error('practice test assignment failed', { action, classId, value, error });
      toast.error('That did not save');
    } finally {
      setBusy(false);
    }
  };

  const ptNumber = Number(pt);
  const valid = Number.isInteger(ptNumber) && ptNumber > 0;

  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
        Practice tests
      </div>
      <form
        className="flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void call('assign_practice_test', ptNumber);
        }}
      >
        <label className="sr-only" htmlFor={`assign-pt-${classId}`}>PrepTest number</label>
        <input
          id={`assign-pt-${classId}`}
          inputMode="numeric"
          placeholder="PT number"
          value={pt}
          onChange={(event) => setPt(event.target.value.replace(/[^0-9]/g, ''))}
          className="h-8 w-28 border border-black/15 bg-white/40 px-2 text-xs"
        />
        <button
          type="submit"
          disabled={!valid || busy}
          className="h-8 border border-black/15 px-2.5 text-xs font-semibold text-black/60 transition hover:bg-white/25 hover:text-black disabled:opacity-40"
        >
          Assign sitting
        </button>
      </form>
      {assigned.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {assigned.map((row) => (
            <li
              key={row.pt}
              className="inline-flex items-center gap-1 border border-black/15 px-2 py-0.5 text-[11px] text-black/60"
            >
              PT {row.pt}
              {row.status === 'completed' && <span className="text-emerald-700">done</span>}
              <button
                type="button"
                disabled={busy}
                onClick={() => call('unassign_practice_test', row.pt)}
                aria-label={`Unassign PrepTest ${row.pt}`}
                className="text-black/40 hover:text-black disabled:opacity-40"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs leading-relaxed text-black/45">
        Opens that one full sitting, even without the Practice tests switch.
      </p>
    </div>
  );
}
