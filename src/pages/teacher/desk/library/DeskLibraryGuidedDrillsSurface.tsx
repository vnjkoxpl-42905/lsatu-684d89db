import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  listGuidedDrills,
  createAssignments,
  resolveGuidedDrillPool,
  type GuidedDrill,
} from '@/lib/guidedDrills';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useHubStudents } from '@/hooks/useHubStudents';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { GuidedDrillCardPreview } from '@/components/drill/GuidedDrillCardPreview';
import { LibraryViews, type LibraryItem } from '@/components/teacher/desk/library/LibraryViews';
import type { LibraryView } from '@/hooks/useDeskLibraryView';
import { TEACHER_GUIDED_DRILLS_RETURN_TO } from '@/lib/guidedDrillNavigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn, openRoute } from '@/lib/utils';

const REASONING_TYPES = ['Conditional Reasoning', 'Causation', 'Comparative Reasoning'];

export function DeskLibraryGuidedDrillsSurface({ view }: { view: LibraryView }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isLoading: qbLoading } = useQuestionBank();
  const { rows: students } = useHubStudents();
  const [drills, setDrills] = useState<GuidedDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all');
  const [rtFilter, setRtFilter] = useState<string | 'all'>('all');
  const [assignDrill, setAssignDrill] = useState<GuidedDrill | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    listGuidedDrills()
      .then((d) => setDrills(d))
      .catch((e) => {
        toast.error('Failed to load guided drills');
        console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const weeks = useMemo(
    () => Array.from(new Set(drills.map((d) => d.week))).sort((a, b) => a - b),
    [drills],
  );

  const filtered = useMemo(
    () =>
      drills.filter((d) => {
        if (weekFilter !== 'all' && d.week !== weekFilter) return false;
        if (rtFilter !== 'all' && !d.reasoning_types.includes(rtFilter)) return false;
        if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [drills, search, weekFilter, rtFilter],
  );

  const poolSize = (d: GuidedDrill) =>
    qbLoading ? null : resolveGuidedDrillPool(d.bank_filter).length;

  const closeAssign = () => {
    setAssignDrill(null);
    setSelected(new Set());
    setScheduledFor('');
  };

  const handleAssign = async () => {
    if (!assignDrill || !user || selected.size === 0) return;
    setAssigning(true);
    try {
      const assignments = await createAssignments({
        guided_drill_ids: [assignDrill.id],
        student_ids: [...selected],
        scheduled_for: scheduledFor || null,
        assigned_by: user.id,
      });
      const unlockAt = scheduledFor ? new Date(scheduledFor).toISOString() : null;
      const notifyResults = await Promise.all(
        assignments.map(async (a) => {
          await createClassroomItem({
            studentId: a.student_id,
            createdBy: user.id,
            type: 'drill',
            title: assignDrill.title,
            description: `New guided drill: ${assignDrill.title}`,
            unlockAt,
            sourceTable: 'guided_drill_assignments',
            sourceId: a.id,
            status: 'assigned',
            visibleToStudent: true,
          });
          return notifyStudentOfClassroomItem({
            adminUserId: user.id,
            studentId: a.student_id,
            title: assignDrill.title,
            route: `/guided/${a.id}?returnTo=/classroom`,
            description: `New guided drill: ${assignDrill.title}`,
          });
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
      queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

      const allOk = notifyResults.every((r) => r.inbox_ok && r.bell_ok && r.email_ok);
      if (allOk) {
        toast.success(`Assigned "${assignDrill.title}" to ${selected.size} student${selected.size === 1 ? '' : 's'}`);
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
        <h2 className="text-base font-semibold text-black">Guided Drills</h2>
        <p className="mt-0.5 text-xs text-black/55">
          {drills.length} drills across {weeks.length} weeks. Filter, preview, and assign to one or more students.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 max-w-xs border-black/15 bg-white/40 text-sm text-black placeholder:text-black/35 focus-visible:border-black/35 focus-visible:ring-black/10"
          />
          <FilterSelect
            value={weekFilter === 'all' ? 'all' : String(weekFilter)}
            onChange={(v) => setWeekFilter(v === 'all' ? 'all' : parseInt(v, 10))}
            options={[{ value: 'all', label: 'All weeks' }, ...weeks.map((w) => ({ value: String(w), label: `Week ${w}` }))]}
          />
          <FilterSelect
            value={rtFilter}
            onChange={(v) => setRtFilter(v)}
            options={[{ value: 'all', label: 'All reasoning types' }, ...REASONING_TYPES.map((r) => ({ value: r, label: r }))]}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="text-xs text-black/45">Loading drills…</div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-black/45">
            No drills match your filters.
          </div>
        ) : (
          <LibraryViews
            view={view}
            items={filtered.map((d): LibraryItem => {
              const ps = poolSize(d);
              const need = d.question_count ?? 0;
              const poolBad = ps != null && need > 0 && ps < need;
              return {
                id: d.id,
                eyebrow: `W${d.week}.${d.order_in_week}`,
                title: d.title,
                subtitle: d.category ?? undefined,
                badges: [...d.reasoning_types, ...d.question_types],
                meta: (
                  <span className={cn('tabular-nums', poolBad ? 'text-amber-700' : 'text-black/45')}>
                    pool {ps ?? '…'}{need ? `/${need}` : ''}
                  </span>
                ),
                renderPreview: () => (
                  <GuidedDrillCardPreview
                    drill={d}
                    questionCount={d.question_qids?.length || d.question_count || (ps ?? 0)}
                  />
                ),
                actions: (
                  <>
                    <button
                      type="button"
                      onClick={() => openRoute(`/guided-drills/${d.slug}?returnTo=${encodeURIComponent(TEACHER_GUIDED_DRILLS_RETURN_TO)}`)}
                      className="inline-flex items-center gap-1.5 border border-black/15 bg-white/40 px-2.5 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
                    >
                      <Play className="h-3 w-3" /> Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignDrill(d)}
                      className="ml-auto inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-500/30"
                    >
                      <Send className="h-3 w-3" /> Assign
                    </button>
                  </>
                ),
              };
            })}
          />
        )}
      </div>

      {/* Assign sheet */}
      <Sheet open={!!assignDrill} onOpenChange={(o) => !o && closeAssign()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Assign: {assignDrill?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Schedule for (optional)
              </label>
              <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1" />
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

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={options.find((o) => o.value === value)?.label ?? 'Filter'}
      className="h-8 border border-black/15 bg-white/40 px-2 text-sm text-black focus-visible:border-black/35 focus-visible:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default DeskLibraryGuidedDrillsSurface;
