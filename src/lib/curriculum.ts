import type { StudentLevel } from '@/lib/studentLevel';

/**
 * Turn a curriculum track plus one student's overrides into the sequence that
 * student actually works.
 *
 * Pure and dependency-free, like the level resolver, so the interesting logic
 * is testable without a database.
 *
 * The track is shared; the overrides are the student's diff against it. A
 * student with no overrides gets the spine verbatim, which is what makes an
 * edit to the track reach everyone who has not been hand-tuned.
 */

export type CurriculumAction = 'skip' | 'reorder' | 'insert' | 'repace';

export interface CurriculumTrackItem {
  id: string;
  track_id: string;
  guided_drill_id: string;
  position: number;
  suggested_week: number | null;
  estimated_minutes: number | null;
  is_optional: boolean;
  notes?: string | null;
}

export interface StudentCurriculumOverride {
  id: string;
  student_id: string;
  track_id: string;
  track_item_id: string | null;
  action: CurriculumAction;
  position: number | null;
  guided_drill_id: string | null;
  level: StudentLevel | null;
  notes?: string | null;
}

export interface CurriculumEntry {
  /** The spine item, or null for a drill inserted just for this student. */
  trackItemId: string | null;
  guidedDrillId: string;
  /** 1-based, after skips are removed and reorders applied. */
  position: number;
  suggestedWeek: number | null;
  estimatedMinutes: number | null;
  isOptional: boolean;
  /** Set only when this entry is pinned to a band for this student. */
  level: StudentLevel | null;
  /** True when this entry is not on the shared track. */
  inserted: boolean;
  /** True when the student's position differs from the track's. */
  moved: boolean;
}

export interface ResolvedCurriculum {
  entries: CurriculumEntry[];
  /** Spine items this student does not do. */
  skipped: CurriculumTrackItem[];
  /** True when the student follows the track exactly. */
  isPristine: boolean;
}

/**
 * Apply a student's overrides to a track.
 *
 * Order matters and is fixed: skips first (so a skipped item cannot occupy a
 * slot), then reorders and inserts by their requested position, then a final
 * renumber to 1..n. `repace` carries no ordering meaning here -- it belongs to
 * schedule generation, which reads estimated_minutes -- but it is accepted so
 * a repace row does not look like an unknown action.
 */
export function resolveStudentCurriculum(
  items: CurriculumTrackItem[],
  overrides: StudentCurriculumOverride[] = [],
): ResolvedCurriculum {
  const byAction = <T extends CurriculumAction>(action: T) =>
    overrides.filter((o) => o.action === action);

  const skippedIds = new Set(
    byAction('skip')
      .map((o) => o.track_item_id)
      .filter((id): id is string => !!id),
  );

  const repositioned = new Map<string, number>();
  for (const o of byAction('reorder')) {
    if (o.track_item_id && o.position != null) repositioned.set(o.track_item_id, o.position);
  }

  /** Pin an entry to a band, from either a reorder row or a standalone one. */
  const pinnedLevel = new Map<string, StudentLevel>();
  for (const o of overrides) {
    if (o.track_item_id && o.level) pinnedLevel.set(o.track_item_id, o.level);
  }

  const sorted = [...items].sort((a, b) => a.position - b.position);

  const kept: CurriculumEntry[] = sorted
    .filter((item) => !skippedIds.has(item.id))
    .map((item) => {
      const moved = repositioned.has(item.id);
      return {
        trackItemId: item.id,
        guidedDrillId: item.guided_drill_id,
        position: moved ? repositioned.get(item.id)! : item.position,
        suggestedWeek: item.suggested_week,
        estimatedMinutes: item.estimated_minutes,
        isOptional: item.is_optional,
        level: pinnedLevel.get(item.id) ?? null,
        inserted: false,
        moved,
      };
    });

  const inserted: CurriculumEntry[] = byAction('insert')
    .filter((o) => !!o.guided_drill_id)
    .map((o) => ({
      trackItemId: null,
      guidedDrillId: o.guided_drill_id!,
      // No position given means "put it at the end".
      position: o.position ?? Number.MAX_SAFE_INTEGER,
      suggestedWeek: null,
      estimatedMinutes: null,
      isOptional: false,
      level: o.level ?? null,
      inserted: true,
      moved: false,
    }));

  const merged = [...kept, ...inserted].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    // A moved or inserted entry claiming an occupied slot lands before the
    // item that was already there, matching "put this one here".
    const priority = (e: CurriculumEntry) => (e.inserted || e.moved ? 0 : 1);
    return priority(a) - priority(b);
  });

  return {
    entries: merged.map((entry, index) => ({ ...entry, position: index + 1 })),
    skipped: sorted.filter((item) => skippedIds.has(item.id)),
    isPristine: overrides.length === 0,
  };
}

/**
 * The next entries a student should be given, skipping anything already
 * assigned and stopping once the minutes budget is spent.
 *
 * The budget is a soft ceiling: the first entry is always included, so a single
 * long drill cannot produce an empty week. An entry with no estimate is treated
 * as free rather than as blocking, since an unknown duration should not stall
 * the sequence.
 */
export function nextCurriculumEntries(
  resolved: ResolvedCurriculum,
  input: {
    /** Drill ids the student already has an assignment for. */
    assignedDrillIds: Iterable<string>;
    /** Minutes available, before the pace multiplier. */
    minutesBudget: number;
    paceMultiplier?: number;
    /** Hard cap regardless of budget. */
    maxEntries?: number;
  },
): CurriculumEntry[] {
  const done = new Set(input.assignedDrillIds);
  const budget = input.minutesBudget * (input.paceMultiplier ?? 1);
  const max = input.maxEntries ?? Number.MAX_SAFE_INTEGER;

  const out: CurriculumEntry[] = [];
  let spent = 0;
  for (const entry of resolved.entries) {
    if (done.has(entry.guidedDrillId)) continue;
    if (out.length >= max) break;
    const cost = entry.estimatedMinutes ?? 0;
    if (out.length > 0 && spent + cost > budget) break;
    out.push(entry);
    spent += cost;
  }
  return out;
}
