import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Play, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
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
import { useHubStudents } from '@/hooks/useHubStudents';
import { DeskStudentPicker } from './DeskStudentPicker';

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

export function DeskLibraryBootcampsSurface() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { rows: students } = useHubStudents();
  const [studentId, setStudentId] = useState<string | null>(null);
  const student = students.find((s) => s.class_id === studentId) ?? null;
  const { data: items = [] } = useStudentClassroomItems(studentId);
  const [busy, setBusy] = useState<string | null>(null);
  const [draftDates, setDraftDates] = useState<Record<string, { start?: Date; end?: Date }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openBootcamp, setOpenBootcamp] = useState<BootcampDef | null>(null);

  const findItem = (bootcampId: string) =>
    items.find(
      (i) =>
        i.type === 'bootcamp_module' &&
        (i.metadata_json as { bootcamp_id?: string } | null)?.bootcamp_id === bootcampId &&
        i.status !== 'archived',
    );

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

  const setDates = (id: string, patch: { start?: Date; end?: Date }) =>
    setDraftDates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const getDates = (id: string) => ({ start: draftDates[id]?.start, end: draftDates[id]?.end });

  const toggle = async (b: BootcampDef, next: boolean) => {
    if (!studentId || !user) return;
    setBusy(b.id);
    try {
      if (next) {
        const today = new Date();
        const start = draftDates[b.id]?.start ?? today;
        const end = draftDates[b.id]?.end ?? defaultEnd(b.id, start);
        setDates(b.id, { start, end });

        const item = await createClassroomItem({
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
          adminUserId: user.id,
          studentId,
          title: b.title,
          description: `${b.description} · ${format(start, 'MMM d')} – ${format(end, 'MMM d')}`,
          route: resolveItemRoute(item) ?? b.route,
        });
        toast.success(summarizeNotifyResult(notify));
      } else {
        const it = findItem(b.id);
        if (it) await archiveClassroomItem(it.id);
        toast.success('Bootcamp archived');
      }
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
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
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  if (openBootcamp) {
    return (
      <section className="flex h-full w-full flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-black/10 px-6 py-3">
          <button
            type="button"
            onClick={() => setOpenBootcamp(null)}
            className="inline-flex items-center gap-1.5 border border-black/15 bg-white/40 px-2.5 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
          >
            <ArrowLeft className="h-3 w-3" /> Back to bootcamps
          </button>
          <span className="truncate text-sm font-semibold text-black">{openBootcamp.title}</span>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <iframe
            title={openBootcamp.title}
            src={openBootcamp.route}
            className="h-full w-full border-0"
          />
        </div>
      </section>
    );
  }

  return (
    <div className="flex h-full w-full">
      <DeskStudentPicker selectedId={studentId} onSelect={setStudentId} />
      <section className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-black/10 px-6 py-4">
          <h2 className="text-base font-semibold text-black">Bootcamps</h2>
          <p className="mt-0.5 text-xs text-black/55">
            {student
              ? `Toggle a bootcamp on, pick a start and end, and it shows up in ${student.display_name?.trim() || "the student"}'s Bootcamps page and Schedule.`
              : 'Toggle a bootcamp on, pick a start and end, and the student sees it on their Bootcamps page and Schedule.'}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!studentId && (
            <p className="mb-4 text-xs text-black/45">
              Browse the bootcamps below. Pick a student on the left to assign one and set its dates.
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {BOOTCAMPS.map((b) => {
                const item = findItem(b.id);
                const assigned = !!item;
                const { start, end } = getDates(b.id);
                const expanded = expandedId === b.id;
                return (
                  <div key={b.id} className="flex h-full flex-col border border-black/12 bg-white/35">
                    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-black">
                          {b.title}
                          {assigned && (
                            <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              assigned
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-black/55">{b.description}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenBootcamp(b)}
                          className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/25"
                        >
                          <Play className="h-3 w-3" /> Open
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : b.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold transition',
                            expanded
                              ? 'border-amber-500/40 bg-amber-500/25 text-amber-900'
                              : 'border-amber-500/30 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25',
                          )}
                        >
                          <Send className="h-3 w-3" /> Assign
                        </button>
                      </div>
                    </div>
                    {expanded && !studentId && (
                      <div className="mt-auto border-t border-black/10 px-4 py-3 text-xs text-black/45">
                        Pick a student on the left to set dates and assign this bootcamp.
                      </div>
                    )}
                    {expanded && studentId && (
                      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-black/10 px-4 py-3">
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
                        <label className="flex items-center gap-2 text-xs text-black/65">
                          {busy === b.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-black/50" />
                          ) : (
                            <Switch checked={assigned} onCheckedChange={(v) => toggle(b, v)} />
                          )}
                          {assigned ? 'Assigned' : 'Off'}
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DeskLibraryBootcampsSurface;
