import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Loader2, Play, Send, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, openRoute } from '@/lib/utils';
import {
  useAdminActivities,
  useAssignActivity,
  ActivityResults,
  listAssignmentsForStudent,
  type Activity,
} from '@/features/activity-centre';

interface StudentRow {
  user_id: string;
  display_name: string | null;
}

export function DeskLibraryActivitiesSurface() {
  const { activities, loading, error } = useAdminActivities();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('class_id, display_name')
        .order('display_name', { ascending: true });
      if (err) {
        console.error('[activity:students:list] failed', err);
        setStudents([]);
        return;
      }
      setStudents(
        (data || []).map((r: { class_id: string; display_name: string | null }) => ({
          user_id: r.class_id,
          display_name: r.display_name,
        })),
      );
    })();
  }, []);

  return (
    <section className="flex h-full w-full flex-col">
      <header className="shrink-0 border-b border-black/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <h2 className="text-base font-semibold text-black">Activities</h2>
        </div>
        <p className="mt-0.5 text-xs text-black/55">
          Coach-led skill exercises. Assign one to a student and they work it with immediate feedback.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading && <p className="text-xs text-black/45">Loading activities…</p>}
        {error && <p className="text-xs text-rose-700">Could not load activities: {error}</p>}
        {!loading && !error && activities.length === 0 && (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-black/45">
            No activities yet.
          </div>
        )}

        {activities.length > 0 && (
          <div className="space-y-2">
            {activities.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                students={students}
                open={openId === a.id}
                onToggle={() => setOpenId((cur) => (cur === a.id ? null : a.id))}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityCard({
  activity,
  students,
  open,
  onToggle,
}: {
  activity: Activity;
  students: StudentRow[];
  open: boolean;
  onToggle: () => void;
}) {
  const { user } = useAuth();
  const { assign, assigning } = useAssignActivity();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [tab, setTab] = useState<'assign' | 'results'>('assign');
  const [resultsKey, setResultsKey] = useState(0);

  const nameFor = (studentId: string) =>
    students.find((s) => s.user_id === studentId)?.display_name || 'Unnamed student';

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedIds = useMemo(() => [...selected], [selected]);

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    let ok = 0;
    let emailFailures = 0;
    for (const studentId of selectedIds) {
      const res = await assign(activity, studentId, { notify: true });
      if (res.ok) {
        ok += 1;
        if (res.emailOk === false) emailFailures += 1;
      } else {
        toast.error(res.error || 'Assign failed');
      }
    }
    if (ok > 0) {
      const base = `Assigned ${activity.title} to ${ok} student${ok === 1 ? '' : 's'}`;
      if (emailFailures > 0) {
        toast.warning(`${base}, but email failed for ${emailFailures}. Classroom + alert still landed.`);
      } else {
        toast.success(`${base} — notified by email, classroom, and alert.`);
      }
      setSelected(new Set());
      setResultsKey((k) => k + 1);
    }
  };

  const handleOpen = async () => {
    if (!user) return;
    setPreviewing(true);
    try {
      // Reuse an existing active self-assignment if one exists — a unique index
      // blocks a second non-completed (student, activity) row, so re-assigning
      // would fail. Otherwise create a fresh self-assignment.
      const existing = await listAssignmentsForStudent(user.id);
      const active = existing.find(
        (a) => a.activity_id === activity.id && a.status !== 'completed',
      );
      if (active) {
        openRoute(`/activities/${active.id}`);
        return;
      }
      const res = await assign(activity, user.id);
      if (res.ok && res.id) {
        openRoute(`/activities/${res.id}`);
      } else {
        toast.error(res.error || 'Could not open activity');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open activity');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="border border-black/12 bg-white/35">
      <div className="flex items-center gap-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-black">{activity.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-black/55">
            {activity.subtitle} · {activity.items.length} items · {activity.item_format}
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          disabled={previewing || assigning}
          className="inline-flex shrink-0 items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/25 disabled:opacity-50"
        >
          <Play className="h-3 w-3" />
          {previewing ? 'Opening…' : 'Open'}
        </button>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold transition',
            open
              ? 'border-amber-500/40 bg-amber-500/25 text-amber-900'
              : 'border-amber-500/30 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25',
          )}
        >
          <Send className="h-3 w-3" /> Assign
        </button>
      </div>

      {open && (
        <div className="border-t border-black/10 p-4">
          <div className="mb-3 flex gap-1 border border-black/12 bg-white/40 p-0.5 text-xs font-medium">
            <TabBtn active={tab === 'assign'} onClick={() => setTab('assign')}>
              <Users className="h-3.5 w-3.5" /> Assign
            </TabBtn>
            <TabBtn active={tab === 'results'} onClick={() => setTab('results')}>
              <BarChart3 className="h-3.5 w-3.5" /> Results
            </TabBtn>
          </div>

          {tab === 'assign' ? (
            <>
              {students.length === 0 ? (
                <p className="text-xs text-black/45">No students found.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {students.map((s) => (
                    <label
                      key={s.user_id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white/55"
                    >
                      <Checkbox checked={selected.has(s.user_id)} onCheckedChange={() => toggle(s.user_id)} />
                      <span className="text-sm text-black/80">{s.display_name || 'Unnamed student'}</span>
                    </label>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning || selectedIds.length === 0}
                className="mt-3 inline-flex items-center gap-2 bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {assigning ? 'Assigning…' : `Assign${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
              </button>
            </>
          ) : (
            <ActivityResults activityId={activity.id} nameFor={nameFor} reloadKey={resultsKey} />
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 transition',
        active ? 'bg-black text-white' : 'text-black/55 hover:text-black',
      )}
    >
      {children}
    </button>
  );
}

export default DeskLibraryActivitiesSurface;
