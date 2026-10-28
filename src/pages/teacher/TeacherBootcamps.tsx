import { newAssignmentDelivery } from '@/lib/assignmentDelivery';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Flame, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import { AssignmentDateField } from '@/components/teacher/AssignmentDateField';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import {
  createClassroomItem,
  updateClassroomItem,
  archiveClassroomItem,
  resolveItemRoute,
} from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useAuth } from '@/contexts/AuthContext';
import { BOOTCAMPS, type BootcampDef } from '@/lib/bootcamps';

const DEFAULT_DURATION_DAYS: Record<string, number> = {
  'principle-flaw': 14,
  'intro-to-lr': 14,
  'causation-station': 7,
  abstraction: 5,
};

function defaultEnd(bootcampId: string, start: Date): Date {
  const days = DEFAULT_DURATION_DAYS[bootcampId] ?? 7;
  return addDays(start, days - 1);
}

export default function TeacherBootcamps() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const { data: items = [] } = useStudentClassroomItems(studentId);
  const [busy, setBusy] = useState<string | null>(null);
  const [draftDates, setDraftDates] = useState<Record<string, { start?: Date; end?: Date }>>({});

  const setStudentId = (id: string) =>
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });

  const findItem = (bootcampId: string) =>
    items.find(
      (i) =>
        i.type === 'bootcamp_module' &&
        (i.metadata_json as { bootcamp_id?: string } | null)?.bootcamp_id === bootcampId &&
        i.status !== 'archived',
    );

  // Hydrate draft dates from existing assigned items
  useEffect(() => {
    setDraftDates((prev) => {
      const next = { ...prev };
      for (const b of BOOTCAMPS) {
        const it = findItem(b.id);
        if (it && !next[b.id]) {
          next[b.id] = {
            start: it.unlock_at ? new Date(it.unlock_at) : undefined,
            end: it.due_at ? new Date(it.due_at) : undefined,
          };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, studentId]);

  const getDates = (bootcampId: string) => {
    const d = draftDates[bootcampId];
    return { start: d?.start, end: d?.end };
  };

  const setDates = (bootcampId: string, patch: { start?: Date; end?: Date }) =>
    setDraftDates((prev) => ({ ...prev, [bootcampId]: { ...prev[bootcampId], ...patch } }));

  const toggle = async (b: BootcampDef, next: boolean) => {
    if (!studentId || !user) return;
    setBusy(b.id);
    try {
      if (next) {
        const today = new Date();
        const start = draftDates[b.id]?.start ?? today;
        const end = draftDates[b.id]?.end ?? defaultEnd(b.id, start);
        setDates(b.id, { start, end });

        const delivery = newAssignmentDelivery();

        const item = await createClassroomItem({


          ...delivery,
          studentId,
          createdBy: user.id,
          type: 'bootcamp_module',
          title: b.title,
          description: b.description,
          sourceTable: 'bootcamps',
          sourceId: b.route,
          visibleToStudent: true,
          status: 'assigned',
          unlockAt: start.toISOString(),
          dueAt: end.toISOString(),
          metadata: { bootcamp_id: b.id },
        });
        const notify = await notifyStudentOfClassroomItem({
          notificationGroupId: delivery.notificationGroupId!,
          unlockAt: item.unlock_at,
          adminUserId: user.id,
          studentId,
          title: b.title,
          description: `${b.description} · ${format(start, 'MMM d')} – ${format(end, 'MMM d')}`,
          route: resolveItemRoute(item) ?? b.route,
        });
        if (notify.bell_ok && notify.email_ok && notify.inbox_ok) toast.success(summarizeNotifyResult(notify));
        else toast.warning(summarizeNotifyResult(notify), { action: notify.retryBell ? { label: 'Retry notification', onClick: () => void notify.retryBell!().then(() => toast.success('Bell notification delivered')).catch(() => toast.error('Notification failed. Try again.')) } : undefined });
      } else {
        const it = findItem(b.id);
        if (it) await archiveClassroomItem(it.id);
        toast.success('Bootcamp archived');
      }
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const updateDates = async (b: BootcampDef, start?: Date, end?: Date) => {
    const it = findItem(b.id);
    if (!it || !start || !end) return;
    setBusy(b.id);
    try {
      await updateClassroomItem(it.id, {
        unlock_at: start.toISOString(),
        due_at: end.toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      toast.success('Dates updated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-y-auto max-h-[40vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <Flame className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>

      <section className="p-4 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Bootcamps</h2>
          <p className="text-sm text-zinc-400">
            Toggle a bootcamp on, pick a start and end date, and the student will see it in
            their Bootcamps page and Schedule for the entire range.
          </p>
        </div>

        {!studentId ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            Select a student.
          </div>
        ) : (
          <ul className="space-y-2">
            {BOOTCAMPS.map((b) => {
              const item = findItem(b.id);
              const assigned = !!item;
              const { start, end } = getDates(b.id);
              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-100">{b.title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{b.description}</div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <AssignmentDateField
                      label="Start"
                      value={start}
                      disabled={busy === b.id}
                      onChange={(d) => {
                        const newEnd = end && end >= d ? end : defaultEnd(b.id, d);
                        setDates(b.id, { start: d, end: newEnd });
                        if (assigned) updateDates(b, d, newEnd);
                      }}
                    />
                    <AssignmentDateField
                      label="End"
                      value={end}
                      minDate={start}
                      disabled={busy === b.id}
                      onChange={(d) => {
                        setDates(b.id, { end: d });
                        if (assigned) updateDates(b, start, d);
                      }}
                    />
                    {busy === b.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                    ) : (
                      <Switch
                        checked={assigned}
                        onCheckedChange={(v) => toggle(b, v)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
