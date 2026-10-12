import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Play, Send } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AssignmentDateField } from '@/components/teacher/AssignmentDateField';
import BootcampGate from '@/components/hub/BootcampGate';
import { BootcampCardPreview } from '@/components/drill/BootcampCardPreview';
import { LibraryViews, type LibraryItem } from '@/components/teacher/desk/library/LibraryViews';
import type { LibraryView } from '@/hooks/useDeskLibraryView';
import { updateClassroomItem } from '@/lib/classroomItems';
import { assignWork, describeAssignResult } from '@/lib/assignWork';
import { localDayISO } from '@/lib/localDate';
import { useAuth } from '@/contexts/AuthContext';
import { BOOTCAMPS, isQuickDrill, type BootcampDef } from '@/lib/bootcamps';
import { BOOTCAMP_INLINE } from '@/lib/bootcampInline';
import { useHubStudents } from '@/hooks/useHubStudents';
import { ConditionalAssignmentFields } from '@/components/teacher/ConditionalAssignmentFields';
import { DEFAULT_CONDITIONAL_TARGET, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';

const DEFAULT_DURATION_DAYS: Record<string, number> = {
  'conditional-indicators-refresher': 1,
  'unless-drill': 7,
  'principle-flaw': 14,
  'intro-to-lr': 14,
  'causation-station': 7,
  abstraction: 5,
};

function defaultEnd(bootcampId: string, start: Date): Date {
  const days = DEFAULT_DURATION_DAYS[bootcampId] ?? 7;
  return addDays(start, days - 1);
}

function openButtonStyle(b: BootcampDef) {
  const background = b.theme.accentAlt
    ? `linear-gradient(90deg, ${b.theme.accent}, ${b.theme.accentAlt})`
    : b.theme.accent;

  return {
    background,
    borderColor: b.theme.accent,
    color: b.theme.accentInk,
  };
}

export function DeskLibraryBootcampsSurface({ view }: { view: LibraryView }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { rows: students } = useHubStudents();
  const [openBootcamp, setOpenBootcamp] = useState<BootcampDef | null>(null);

  const [assignBootcamp, setAssignBootcamp] = useState<BootcampDef | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignStart, setAssignStart] = useState<Date | undefined>(undefined);
  const [assignEnd, setAssignEnd] = useState<Date | undefined>(undefined);
  const [assigning, setAssigning] = useState(false);
  const [conditionalTarget, setConditionalTarget] = useState<ConditionalAssignmentTarget>(DEFAULT_CONDITIONAL_TARGET);

  const openAssign = (b: BootcampDef) => {
    setConditionalTarget(DEFAULT_CONDITIONAL_TARGET);
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
      const result = await assignWork({
        teacherId: user.id,
        studentIds: [...selected],
        item: { kind: 'bootcamp', topicId: b.id, ...(b.id === 'conditionals' ? { conditionalTarget } : {}) },
        scheduledForLocalDate: localDayISO(start),
      });

      // The end date is a bootcamp-only concept, so it is stamped on the
      // classroom items after the fact rather than widening assignWork.
      await Promise.all(
        result.ok
          .filter((r) => r.classroomItemId)
          .map((r) => updateClassroomItem(r.classroomItemId!, { due_at: end.toISOString() })),
      );

      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      qc.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

      const { level, message } = describeAssignResult(result, b.title);
      toast[level](message, {
        description: result.ok.length ? `${format(start, 'MMM d')} – ${format(end, 'MMM d')}` : undefined,
      });
      if (result.ok.length > 0) closeAssign();
    } catch (e) {
      toast.error(`Assign failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setAssigning(false);
    }
  };

  if (openBootcamp) {
    const cfg = BOOTCAMP_INLINE[openBootcamp.id];
    const Comp = cfg?.Comp;
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          {Comp && cfg ? (
            <Suspense fallback={<div className="px-6 py-8 text-sm text-black/45">Loading bootcamp…</div>}>
              <BootcampGate
                routePath={cfg.routePath}
                title={cfg.title}
                bootcampIdOverride={cfg.bootcampIdOverride}
              >
                <Comp />
              </BootcampGate>
            </Suspense>
          ) : (
            <div className="px-6 py-8 text-sm text-black/45">Preview unavailable for this bootcamp.</div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full w-full flex-col">
      <header className="shrink-0 border-b border-black/10 px-6 py-4">
        <h2 className="text-base font-semibold text-black">Bootcamps and Quick Drills</h2>
        <p className="mt-0.5 text-xs text-black/55">
          Open one to preview it, or assign it to one or more students with a start and end date.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {([
          ['Bootcamps', BOOTCAMPS.filter((b) => !isQuickDrill(b))],
          ['Quick Drills', BOOTCAMPS.filter(isQuickDrill)],
        ] as const).filter(([, list]) => list.length > 0).map(([heading, list]) => (
        <section key={heading} className="mb-8 last:mb-0">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-black/55">{heading}</h3>
        <LibraryViews
          view={view}
          items={list.map((b): LibraryItem => ({
            id: b.id,
            title: b.title,
            subtitle: b.description,
            renderPreview: ({ live }) => <BootcampCardPreview bootcamp={b} live={live} />,
            actions: (
              <>
                <button
                  type="button"
                  onClick={() => setOpenBootcamp(b)}
                  className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold shadow-sm transition hover:brightness-105"
                  style={openButtonStyle(b)}
                >
                  <Play className="h-3 w-3" /> Open
                </button>
                <button
                  type="button"
                  onClick={() => openAssign(b)}
                  className="ml-auto inline-flex items-center gap-1.5 border border-teacher-accent/40 bg-teacher-accent/15 px-2.5 py-1 text-xs font-semibold text-teacher-accent-strong transition hover:bg-teacher-accent/25"
                >
                  <Send className="h-3 w-3" /> Assign
                </button>
              </>
            ),
          }))}
        />
        </section>
        ))}
      </div>

      {/* Assign sheet */}
      <Sheet open={!!assignBootcamp} onOpenChange={(o) => !o && closeAssign()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign: {assignBootcamp?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {assignBootcamp?.id === 'conditionals' && <ConditionalAssignmentFields value={conditionalTarget} onChange={setConditionalTarget} disabled={assigning} />}
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
