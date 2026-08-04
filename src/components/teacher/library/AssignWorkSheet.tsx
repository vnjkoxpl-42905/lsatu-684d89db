import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { assignWorkBundle, describeAssignResult, type AssignableItem } from '@/lib/assignWork';
import { useHubStudents } from '@/hooks/useHubStudents';
import { useStudentLevels } from '@/hooks/useStudentLevels';
import { questionBank } from '@/lib/questionLoader';
import { useAuth } from '@/contexts/AuthContext';
import { resolveGuidedDrillPool, type GuidedDrill } from '@/lib/guidedDrills';
import { countInBand } from '@/lib/guidedDrillLevel';
import {
  LEVEL_LABELS,
  STUDENT_LEVELS,
  describeBand,
  levelBand,
  type StudentLevel,
} from '@/lib/studentLevel';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

/**
 * The one assign flow (spec D4/§7.1). Every surface that hands work to a student
 * opens this sheet, and the sheet is the only caller of the bundle pipeline, so
 * a drill and a homework set picked together ship as one assignment event rather
 * than as two separate pings.
 */

export interface AssignWorkSheetItem {
  /** What actually gets assigned. */
  item: AssignableItem;
  /** What the teacher sees in the bundle list. */
  title: string;
  /** "Guided drill", "Homework set", … — so a mixed bundle is readable. */
  kindLabel: string;
  /**
   * The full drill row, for guided drills only. Supplied by surfaces that
   * already hold it, so the sheet can preview how many questions each student
   * will get at their level without doing any I/O of its own. Optional: callers
   * that do not assign drills are unaffected.
   */
  drill?: GuidedDrill;
}

export function AssignWorkSheet({
  open,
  items,
  onClose,
  onAssigned,
  defaultStudentIds,
}: {
  open: boolean;
  items: AssignWorkSheetItem[];
  onClose: () => void;
  onAssigned?: () => void;
  /** Pre-scope to a student — the dossier assigns to exactly one. */
  defaultStudentIds?: string[];
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { rows: students } = useHubStudents();
  const { data: profileLevels } = useStudentLevels();
  /**
   * Read from the bank singleton rather than QuestionBankContext, so the sheet
   * renders anywhere it is mounted. The preview is a nicety; a missing provider
   * must never take down an assign flow that does not otherwise need the bank.
   */
  const [bankReady, setBankReady] = useState(() => questionBank.isReady());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = useState('');
  const [assigning, setAssigning] = useState(false);
  /** Per-student band chosen for this assign only. Absent = use the profile. */
  const [levelOverrides, setLevelOverrides] = useState<Record<string, StudentLevel | null>>({});
  /** Shorten the drill for everyone in this assign. Empty = the drill's own count. */
  const [questionCount, setQuestionCount] = useState('');

  // The bank is normally already warm by the time a teacher opens this, but on
  // a cold tab it may still be in flight. load() is idempotent and de-duped.
  useEffect(() => {
    if (!open || bankReady) return;
    let cancelled = false;
    questionBank
      .load()
      .then(() => !cancelled && setBankReady(questionBank.isReady()))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, bankReady]);

  // Reopening the sheet starts clean, except for a caller-supplied scope.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(defaultStudentIds ?? []));
    setScheduledFor('');
    setLevelOverrides({});
    setQuestionCount('');
    // defaultStudentIds is a fresh array each render at most call sites, so key
    // the reset on its contents rather than its identity.
  }, [open, defaultStudentIds?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const bundleTitle = useMemo(() => {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0].title;
    return `${items.length} pieces of work`;
  }, [items]);

  /** The drills in this bundle that came with their full row attached. */
  const drills = useMemo(
    () => items.map((i) => i.drill).filter((d): d is GuidedDrill => !!d),
    [items],
  );
  const hasGuidedDrill = items.some((i) => i.item.kind === 'guided_drill');
  /** Sizing and per-student counts only make sense for a single drill. */
  const soleDrill = drills.length === 1 && items.length === 1 ? drills[0] : null;

  /** The drill's pool, resolved once. Empty until the bank finishes loading. */
  const pool = useMemo(
    () => (soleDrill && bankReady ? resolveGuidedDrillPool(soleDrill.bank_filter) : []),
    [soleDrill, bankReady],
  );

  const effectiveCount = useMemo(() => {
    const parsed = Number.parseInt(questionCount, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return soleDrill?.question_count ?? null;
  }, [questionCount, soleDrill]);

  /** Minutes scale with the size, so trimming a drill shows the time saved. */
  const scaledMinutes = useMemo(() => {
    if (!soleDrill?.estimated_minutes || !soleDrill.question_count || !effectiveCount) return null;
    return Math.max(
      1,
      Math.round((soleDrill.estimated_minutes * effectiveCount) / soleDrill.question_count),
    );
  }, [soleDrill, effectiveCount]);

  const levelFor = (studentId: string): StudentLevel | null =>
    studentId in levelOverrides
      ? levelOverrides[studentId]
      : (profileLevels?.[studentId] ?? null);

  const handleAssign = async () => {
    if (!user || selected.size === 0 || items.length === 0) return;
    setAssigning(true);
    try {
      const result = await assignWorkBundle({
        teacherId: user.id,
        studentIds: [...selected],
        items: items.map((i) => i.item),
        scheduledForLocalDate: scheduledFor || undefined,
        levelOverrides: hasGuidedDrill ? levelOverrides : undefined,
        questionCountOverride: hasGuidedDrill ? effectiveOverrideCount(questionCount) : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['homework-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
      queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

      const { level, message } = describeAssignResult(result, bundleTitle);
      toast[level](message);
      onAssigned?.();
      // Leave the sheet open when nobody got the work, so the teacher can read
      // the reason and retry without reselecting everyone.
      if (result.ok.length > 0) onClose();
    } catch (e) {
      toast.error(`Assign failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {items.length === 1 ? `Assign: ${items[0].title}` : `Assign ${items.length} items`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {items.length > 1 ? (
            <ul className="space-y-1 border border-border p-2">
              {items.map(({ item, title, kindLabel }) => (
                <li key={itemKeyOf(item)} className="flex items-baseline gap-2 text-sm">
                  <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                    {kindLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div>
            <label
              htmlFor="assign-schedule"
              className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Schedule for (optional)
            </label>
            <Input
              id="assign-schedule"
              type="date"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-1"
            />
          </div>

          {soleDrill ? (
            <div>
              <label
                htmlFor="assign-question-count"
                className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Questions (optional)
              </label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="assign-question-count"
                  type="number"
                  min={1}
                  max={pool.length || undefined}
                  inputMode="numeric"
                  placeholder={String(soleDrill.question_count ?? '')}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">
                  {scaledMinutes ? `about ${scaledMinutes} min` : 'Leave blank for the full drill'}
                </span>
              </div>
            </div>
          ) : null}

          <div>
            <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
              Students ({selected.size} selected)
            </span>
            {students.length === 0 ? (
              <p className="mt-2 border border-dashed border-border p-3 text-sm text-muted-foreground">
                No students to assign to yet.
              </p>
            ) : (
              <div className="mt-2 max-h-80 space-y-1 overflow-y-auto border border-border p-2">
                {students.map((s) => {
                  const isSelected = selected.has(s.class_id);
                  const level = levelFor(s.class_id);
                  const overridden = s.class_id in levelOverrides;
                  return (
                    <div key={s.class_id}>
                      <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-muted">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(s.class_id);
                              else next.delete(s.class_id);
                              return next;
                            });
                          }}
                        />
                        <span className="text-sm">
                          {s.display_name || s.email || s.class_id.slice(0, 8)}
                        </span>
                      </label>

                      {hasGuidedDrill && isSelected ? (
                        <StudentLevelRow
                          level={level}
                          overridden={overridden}
                          pool={pool}
                          bankLoading={!bankReady}
                          want={effectiveCount}
                          hasPool={!!soleDrill}
                          onPick={(next) =>
                            setLevelOverrides((prev) => ({ ...prev, [s.class_id]: next }))
                          }
                          onUseProfile={() =>
                            setLevelOverrides((prev) => {
                              const next = { ...prev };
                              delete next[s.class_id];
                              return next;
                            })
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={selected.size === 0 || items.length === 0 || assigning}
            onClick={handleAssign}
            className="inline-flex w-full items-center justify-center gap-2 bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assigning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Assign to {selected.size} student{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** The typed question-count override, or undefined when left blank. */
function effectiveOverrideCount(raw: string): number | undefined {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * What one selected student will actually get, shown before the teacher
 * commits. The warning is here rather than in the result toast because
 * "this drill has nothing at their level" is a decision to make beforehand.
 */
function StudentLevelRow({
  level,
  overridden,
  pool,
  bankLoading,
  want,
  hasPool,
  onPick,
  onUseProfile,
}: {
  level: StudentLevel | null;
  overridden: boolean;
  pool: Parameters<typeof countInBand>[0];
  bankLoading: boolean;
  want: number | null;
  hasPool: boolean;
  onPick: (level: StudentLevel | null) => void;
  onUseProfile: () => void;
}) {
  const inBand = hasPool && !bankLoading ? countInBand(pool, level) : null;
  const target = want ?? inBand;
  const short = inBand != null && target != null && inBand < target;

  let detail: string;
  if (!hasPool) detail = level ? describeBand(levelBand(level)) : 'the drill’s own range';
  else if (bankLoading) detail = 'checking pool…';
  else if (inBand === 0) {
    detail = `nothing at this level in a pool of ${pool.length}`;
  } else if (target != null) {
    detail = `${Math.min(inBand ?? 0, target)} of ${target} at level`;
  } else {
    detail = `${inBand} at level`;
  }

  return (
    <div className="mb-1 ml-8 mr-2 flex flex-wrap items-center gap-x-2 gap-y-1 pb-1.5">
      <span
        className={cn(
          'text-xs',
          short || inBand === 0 ? 'text-amber-700' : 'text-muted-foreground',
        )}
      >
        {level ? LEVEL_LABELS[level] : 'Level not set'}
        {level && !overridden ? ' (profile)' : ''}
        {' · '}
        {detail}
      </span>

      <div className="ml-auto inline-flex items-center border border-border">
        <button
          type="button"
          onClick={onUseProfile}
          aria-pressed={!overridden}
          title="Use this student's own level"
          className={cn(
            'px-1.5 py-0.5 text-xs font-semibold transition',
            !overridden ? 'bg-black text-white' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          Profile
        </button>
        {STUDENT_LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onPick(option)}
            aria-pressed={overridden && level === option}
            title={`${LEVEL_LABELS[option]} — ${describeBand(levelBand(option))}`}
            className={cn(
              'border-l border-border px-1.5 py-0.5 text-xs font-semibold transition',
              overridden && level === option
                ? 'bg-black text-white'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {LEVEL_LABELS[option][0]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Stable key for a bundle row; the id field differs per kind. */
function itemKeyOf(item: AssignableItem): string {
  switch (item.kind) {
    case 'homework_set':
      return `homework_set:${item.setId}`;
    case 'guided_drill':
      return `guided_drill:${item.drillId}`;
    case 'activity':
      return `activity:${item.activityId}`;
    case 'bootcamp':
      return `bootcamp:${item.topicId}`;
  }
}

/**
 * A bundle tray: the items a teacher has ticked across tabs, plus the controls
 * to clear it or open the sheet. Rendered by Library so a drill picked on one
 * tab and a homework set on another leave together.
 */
export function AssignBundleBar({
  items,
  onRemove,
  onClear,
  onOpen,
}: {
  items: AssignWorkSheetItem[];
  onRemove: (item: AssignableItem) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-black/10 bg-white/60 px-4 py-2">
      <span className="text-xs font-semibold text-black/55">
        Bundle ({items.length})
      </span>
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {items.map(({ item, title }) => (
          <li key={itemKeyOf(item)}>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${title} from the bundle`}
              className="inline-flex max-w-[220px] items-center gap-1 border border-black/15 bg-white px-2 py-1 text-xs text-black/70 transition hover:text-black"
            >
              <span className="truncate">{title}</span>
              <X className="h-3 w-3 shrink-0" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-black/45 transition hover:text-black"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 bg-teacher-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teacher-accent-hover"
        >
          <Send className="h-3 w-3" strokeWidth={2} />
          Assign bundle
        </button>
      </div>
    </div>
  );
}

export { itemKeyOf as assignItemKey };
