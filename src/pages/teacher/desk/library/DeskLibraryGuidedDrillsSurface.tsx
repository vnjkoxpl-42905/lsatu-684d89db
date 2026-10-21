import React, { useEffect, useMemo, useState } from 'react';
import { Play, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  listGuidedDrills,
  resolveGuidedDrillPool,
  type GuidedDrill,
} from '@/lib/guidedDrills';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { Input } from '@/components/ui/input';
import { GuidedDrillCardPreview } from '@/components/drill/GuidedDrillCardPreview';
import { LibraryViews, type LibraryItem } from '@/components/teacher/desk/library/LibraryViews';
import { LibraryFilterSelect } from '@/components/teacher/desk/library/LibraryFilterSelect';
import type { LibraryView } from '@/hooks/useDeskLibraryView';
import type { AssignWorkSheetItem } from '@/components/teacher/library/AssignWorkSheet';
import { TEACHER_GUIDED_DRILLS_RETURN_TO } from '@/lib/guidedDrillNavigation';
import { cn, openRoute } from '@/lib/utils';

const REASONING_TYPES = ['Conditional Reasoning', 'Causation', 'Comparative Reasoning'];

export function DeskLibraryGuidedDrillsSurface({
  view,
  onAssign,
  onBundle,
}: {
  view: LibraryView;
  onAssign: (item: AssignWorkSheetItem) => void;
  onBundle: (item: AssignWorkSheetItem) => void;
}) {
  const { isLoading: qbLoading } = useQuestionBank();
  const [drills, setDrills] = useState<GuidedDrill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all');
  const [rtFilter, setRtFilter] = useState<string | 'all'>('all');

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

  const sheetItem = (d: GuidedDrill): AssignWorkSheetItem => ({
    item: { kind: 'guided_drill', drillId: d.id },
    title: d.title,
    kindLabel: 'Drill',
    // Carried so the assign sheet can show per-student level counts without
    // re-fetching the row.
    drill: d,
  });

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
          <LibraryFilterSelect
            value={weekFilter === 'all' ? 'all' : String(weekFilter)}
            onChange={(v) => setWeekFilter(v === 'all' ? 'all' : parseInt(v, 10))}
            options={[{ value: 'all', label: 'All weeks' }, ...weeks.map((w) => ({ value: String(w), label: `Week ${w}` }))]}
          />
          <LibraryFilterSelect
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
                  <span className={cn('tabular-nums', poolBad ? 'text-teacher-accent-strong' : 'text-black/45')}>
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
                      onClick={() => onBundle(sheetItem(d))}
                      title="Add to the assign bundle"
                      aria-label={`Add ${d.title} to the assign bundle`}
                      className="ml-auto inline-flex items-center gap-1 border border-black/15 bg-white/40 px-2 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssign(sheetItem(d))}
                      className="inline-flex items-center gap-1.5 border border-teacher-accent/40 bg-teacher-accent/15 px-2.5 py-1 text-xs font-semibold text-teacher-accent-strong transition hover:bg-teacher-accent/25"
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
    </section>
  );
}

export default DeskLibraryGuidedDrillsSurface;
