import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play, Send } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CardCarousel } from '@/components/ui/card-carousel';
import { AssignmentDateField } from '@/components/teacher/AssignmentDateField';
import {
  createClassroomItem,
  resolveItemRoute,
} from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useAuth } from '@/contexts/AuthContext';
import { BOOTCAMPS, type BootcampDef } from '@/lib/bootcamps';
import { useHubStudents } from '@/hooks/useHubStudents';

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

  const [assignBootcamp, setAssignBootcamp] = useState<BootcampDef | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignStart, setAssignStart] = useState<Date | undefined>(undefined);
  const [assignEnd, setAssignEnd] = useState<Date | undefined>(undefined);
  const [assigning, setAssigning] = useState(false);

  const openAssign = (b: BootcampDef) => {
    const start = new Date();
    setAssignBootcamp(b);
    setAssignStart(start);
    setAssignEnd(defaultEnd(b.id, start));
    setSelected(new Set());
  };

  const closeAssign = () => {
    setAssignBootcamp(null);
    setSelected(new Set());
    setAssignStart(undefined);
    setAssignEnd(undefined);
  };

  const handleAssign = async () => {
    if (!assignBootcamp || !user || selected.size === 0) return;
    const b = assignBootcamp;
    const start = assignStart ?? new Date();
    const end = assignEnd ?? defaultEnd(b.id, start);
    setAssigning(true);
    try {
      const notifyResults = await Promise.all(
        [...selected].map(async (studentId) => {
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
          return notifyStudentOfClassroomItem({
            adminUserId: user.id,
            studentId,
            title: b.title,
            description: `${b.description} · ${format(start, 'MMM d')} – ${format(end, 'MMM d')}`,
            route: resolveItemRoute(item) ?? b.route,
          });
        }),
      );
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      qc.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

      const allOk = notifyResults.every((r) => r.inbox_ok && r.bell_ok && r.email_ok);
      if (allOk) {
        toast.success(`Assigned "${b.title}" to ${selected.size} student${selected.size === 1 ? '' : 's'}`);
      } else {
        const failed = notifyResults.find((r) => !r.inbox_ok || !r.bell_ok || !r.email_ok);
        toast.warning(failed ? summarizeNotifyResult(failed) : 'Assigned with notification issues');
      }
      closeAssign();
    } catch (e) {
      toast.error(`Assign failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <section className="flex h-full w-full flex-col">
      <header className="shrink-0 border-b border-black/10 px-6 py-4">
        <h2 className="text-base font-semibold text-black">Bootcamps</h2>
        <p className="mt-0.5 text-xs text-black/55">
          Open a bootcamp to preview it, or assign it to one or more students with a start and end date.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <CardCarousel
          items={BOOTCAMPS}
          getKey={(b) => b.id}
          slidesPerPage={3}
          slideClassName="h-auto"
          renderItem={(b) => (
            <article className="flex h-full flex-col gap-3 border border-black/12 bg-white/35 p-4 transition hover:border-black/30 hover:bg-white/55">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-black">{b.title}</h3>
                <p className="mt-0.5 text-xs text-black/55">{b.description}</p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={b.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/25"
                >
                  <Play className="h-3 w-3" /> Open
                </a>
                <button
                  type="button"
                  onClick={() => openAssign(b)}
                  className="ml-auto inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/30"
                >
                  <Send className="h-3 w-3" /> Assign
                </button>
              </div>
            </article>
          )}
        />
      </div>

      {/* Assign sheet */}
      <Sheet open={!!assignBootcamp} onOpenChange={(o) => !o && closeAssign()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign: {assignBootcamp?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <AssignmentDateField
                label="Start"
                value={assignStart}
                disabled={assigning}
                onChange={(d) => {
                  setAssignStart(d);
                  setAssignEnd((prev) =>
                    prev && prev >= d ? prev : defaultEnd(assignBootcamp?.id ?? '', d),
                  );
                }}
              />
              <AssignmentDateField
                label="End"
                value={assignEnd}
                minDate={assignStart}
                disabled={assigning}
                onChange={(d) => setAssignEnd(d)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Students ({selected.size} selected)
              </label>
              <div className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded border p-2">
                {students.map((s) => (
                  <label
                    key={s.class_id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                  >
                    <Checkbox
                      checked={selected.has(s.class_id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selected);
                        if (checked) next.add(s.class_id);
                        else next.delete(s.class_id);
                        setSelected(next);
                      }}
                    />
                    <span className="text-sm">{s.display_name || s.email || s.class_id.slice(0, 8)}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={selected.size === 0 || assigning}
              onClick={handleAssign}
              className="inline-flex w-full items-center justify-center gap-2 bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Assign to {selected.size} student{selected.size === 1 ? '' : 's'}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export default DeskLibraryBootcampsSurface;
