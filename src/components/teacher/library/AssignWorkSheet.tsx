import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { assignWorkBundle, describeAssignResult, type AssignableItem } from '@/lib/assignWork';
import { useHubStudents } from '@/hooks/useHubStudents';
import { useStudentLevels } from '@/hooks/useStudentLevels';
import { questionBank } from '@/lib/questionLoader';
import { useAuth } from '@/contexts/AuthContext';
import {
  resolveGuidedDrillPool,
  resolveGuidedDrillQidsForLevel,
  type GuidedDrill,
} from '@/lib/guidedDrills';
import { BEGINNER_GRADE_PCT, summarizePool } from '@/lib/guidedDrillLevel';
import { questionStats } from '@/lib/questionStats';
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
  const [statsReady, setStatsReady] = useState(() => questionStats.isReady());

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = useState('');
  const [assigning, setAssigning] = useState(false);
  /** Per-student band chosen for this assign only. Absent = use the profile. */
  const [levelOverrides, setLevelOverrides] = useState<Record<string, StudentLevel | null>>({});
  /** Shorten the drill for everyone in this assign. Empty = the drill's own count. */
  const [questionCount, setQuestionCount] = useState('');
  /**
   * Freeze the question set so an offline artifact can be built from it. Off by
   * default and deliberately hard to turn on by accident: it trades away the
   * re-attempt fresh draw for the whole assignment.
   */
  const [attachArtifact, setAttachArtifact] = useState(false);
  /** Comma-separated trap taxonomy tags this student keeps falling for. */
  const [trapTargets, setTrapTargets] = useState('');
  /** The pinned list, kept after a successful assign so it can be handed on. */
  const [frozenResult, setFrozenResult] = useState<Record<string, string[]> | null>(null);

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

  // Cohort percentages, loaded alongside the bank. Deliberately not awaited by
  // anything: the level row renders its count the moment the bank is ready and
  // gains the accuracy clause when this arrives. Stats never gate an assign.
  useEffect(() => {
    if (!open || statsReady) return;
    let cancelled = false;
    questionStats
      .load()
      .then(() => !cancelled && setStatsReady(questionStats.isReady()))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, statsReady]);

  // Reopening the sheet starts clean, except for a caller-supplied scope.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(defaultStudentIds ?? []));
    setScheduledFor('');
    setLevelOverrides({});
    setQuestionCount('');
    setAttachArtifact(false);
    setTrapTargets('');
    setFrozenResult(null);
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

  /**
   * Resolve now what would otherwise be drawn when the student opens the drill.
   * Only reachable with the attach control on, which is only offered for a
   * single drill with the bank loaded.
   *
   * Per student, not once: two students at different bands get different sets
   * from the same drill, and that is the point of the level feature.
   */
  const freezeQids = (): Record<string, string[]> | undefined => {
    if (!attachArtifact || !soleDrill || !bankReady) return undefined;

    // Trap targeting rides on the freeze and nowhere else. An open-time draw
    // has no teacher present to name a target and no column to remember one,
    // so an ordinary assignment keeps drawing exactly as it always has.
    const targets = trapTargets
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const out: Record<string, string[]> = {};
    for (const studentId of selected) {
      const { qids } = resolveGuidedDrillQidsForLevel({
        drill: soleDrill,
        level: levelFor(studentId),
        questionCount: effectiveCount,
        stats: targets.length > 0 && statsReady ? questionStats.asMap() : null,
        targetTrapTags: targets,
        // Half aim, half freshness. A full 1 would return the same questions
        // in the same order on every re-attempt of the same drill.
        trapWeight: targets.length > 0 ? 0.5 : 0,
      });
      // A student with nothing to draw is left out rather than pinned empty;
      // assignWork throws on an empty list precisely so this cannot pass
      // silently as "not frozen".
      if (qids.length > 0) out[studentId] = qids;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  };

  const handleAssign = async () => {
    if (!user || selected.size === 0 || items.length === 0) return;
    setAssigning(true);
    try {
      const frozenQidsByStudent = freezeQids();
      const result = await assignWorkBundle({
        teacherId: user.id,
        studentIds: [...selected],
        items: items.map((i) => i.item),
        scheduledForLocalDate: scheduledFor || undefined,
        levelOverrides: hasGuidedDrill ? levelOverrides : undefined,
        questionCountOverride: hasGuidedDrill ? effectiveOverrideCount(questionCount) : undefined,
        frozenQidsByStudent,
      });

      queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['homework-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
      queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });

      const { level, message } = describeAssignResult(result, bundleTitle);
      toast[level](message);
      onAssigned?.();

      if (frozenQidsByStudent && result.ok.length > 0) {
        // Keep the sheet open on a frozen assign. The artifact still has to be
        // generated from this exact list, and closing the sheet would drop the
        // only on-screen copy. The authoritative read is still the DB row —
        // this panel is a convenience, not the source.
        setFrozenResult(frozenQidsByStudent);
        console.info('[assignWork] frozen question sets', frozenQidsByStudent);
        return;
      }
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

          {soleDrill ? (
            <div>
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={attachArtifact}
                  disabled={!bankReady}
                  onCheckedChange={(v) => setAttachArtifact(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  Fix the question set for an emailed drill
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {bankReady
                      ? 'Pins each student’s questions now so a file can be built from them. This assignment stops re-drawing: a re-attempt shows the same questions, and changing the level later has no effect.'
                      : 'Loading the question bank…'}
                  </span>
                </span>
              </label>

              {attachArtifact ? (
                <div className="mt-3 pl-6">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Target traps
                  </label>
                  <Input
                    value={trapTargets}
                    onChange={(e) => setTrapTargets(e.target.value)}
                    placeholder="Too Strong, Out Of Scope"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trapTargets.trim()
                      ? 'Weights the set toward questions whose most-chosen wrong answer is one of these. Still mixed, so a re-attempt is not identical.'
                      : 'Optional. Leave blank to draw by level alone, exactly as before.'}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {frozenResult ? (
            <div className="border border-border bg-muted/40 p-3">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fixed question sets
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Build the drill file from these. The assignment rows hold the same list.
              </p>
              {Object.entries(frozenResult).map(([studentId, qids]) => (
                <div key={studentId} className="mt-2">
                  <p className="text-xs font-semibold">
                    {students.find((s) => s.class_id === studentId)?.display_name ?? studentId}
                  </p>
                  <code className="mt-0.5 block whitespace-pre-wrap break-all text-xs text-muted-foreground">
                    {qids.join('\n')}
                  </code>
                </div>
              ))}
              <button
                type="button"
                className="mt-3 inline-flex items-center border border-border px-2 py-1 text-xs font-semibold transition hover:bg-muted"
                onClick={() => {
                  const text = Object.entries(frozenResult)
                    .map(([id, qids]) => `${id}\n${qids.join('\n')}`)
                    .join('\n\n');
                  navigator.clipboard?.writeText(text);
                  toast.success('Question sets copied');
                }}
              >
                Copy
              </button>
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
                          statsReady={statsReady}
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
  statsReady,
  onPick,
  onUseProfile,
}: {
  level: StudentLevel | null;
  overridden: boolean;
  pool: Parameters<typeof summarizePool>[0];
  bankLoading: boolean;
  want: number | null;
  hasPool: boolean;
  statsReady: boolean;
  onPick: (level: StudentLevel | null) => void;
  onUseProfile: () => void;
}) {
  const summary =
    hasPool && !bankLoading
      ? summarizePool(pool, level, statsReady ? questionStats.asMap() : null)
      : null;
  const inBand = summary?.inBand ?? null;
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

  /*
   * The count alone cannot tell a teacher what a student will actually face.
   * A drill clamped to difficulty 1-3 assigned at the advanced band reports a
   * healthy in-band count while serving only the easiest questions that band
   * can hold. This clause is what makes that visible before the assign.
   *
   * Coverage is stated, never implied: "5 of 6 measured" is honest where a
   * bare average would quietly describe a subset.
   */
  const accuracy = summary?.meanCorrectPct;
  const beginnerGrade = accuracy != null && accuracy >= BEGINNER_GRADE_PCT;

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

      {accuracy != null && summary != null ? (
        <span
          className={cn('text-xs', beginnerGrade ? 'text-amber-700' : 'text-muted-foreground')}
          title={
            `${summary.measured} of ${summary.inBand} in-band questions have measured cohort data.` +
            (summary.topTraps.length
              ? ` Most common trap: ${summary.topTraps.map((t) => t.tag).join(', ')}.`
              : '') +
            (beginnerGrade
              ? ` At or above ${BEGINNER_GRADE_PCT}% this is work most test takers already get right.`
              : '')
          }
        >
          {'· avg '}
          {accuracy}
          {'% correct'}
          {summary.measured < summary.inBand ? ` (${summary.measured} of ${summary.inBand} measured)` : ''}
        </span>
      ) : null}

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
