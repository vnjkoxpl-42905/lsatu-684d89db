import { describe, it, expect } from 'vitest';
import {
  nextCurriculumEntries,
  resolveStudentCurriculum,
  type CurriculumTrackItem,
  type StudentCurriculumOverride,
} from './curriculum';

const TRACK = 'track-1';
const STUDENT = 'stu-1';

function item(n: number, extra: Partial<CurriculumTrackItem> = {}): CurriculumTrackItem {
  return {
    id: `item-${n}`,
    track_id: TRACK,
    guided_drill_id: `drill-${n}`,
    position: n,
    suggested_week: n,
    estimated_minutes: 30,
    is_optional: false,
    ...extra,
  };
}

/** A five-drill spine. */
const SPINE = [item(1), item(2), item(3), item(4), item(5)];

function override(o: Partial<StudentCurriculumOverride>): StudentCurriculumOverride {
  return {
    id: `ov-${Math.abs(o.position ?? 0)}-${o.action}-${o.track_item_id ?? o.guided_drill_id}`,
    student_id: STUDENT,
    track_id: TRACK,
    track_item_id: null,
    action: 'skip',
    position: null,
    guided_drill_id: null,
    level: null,
    ...o,
  };
}

const drills = (r: { entries: { guidedDrillId: string }[] }) =>
  r.entries.map((e) => e.guidedDrillId);

describe('resolveStudentCurriculum', () => {
  it('gives the spine verbatim to a student with no overrides', () => {
    const r = resolveStudentCurriculum(SPINE);
    expect(drills(r)).toEqual(['drill-1', 'drill-2', 'drill-3', 'drill-4', 'drill-5']);
    expect(r.isPristine).toBe(true);
    expect(r.skipped).toEqual([]);
  });

  it('is unaffected by the order rows arrive in', () => {
    const shuffled = [SPINE[3], SPINE[0], SPINE[4], SPINE[2], SPINE[1]];
    expect(drills(resolveStudentCurriculum(shuffled))).toEqual(
      drills(resolveStudentCurriculum(SPINE)),
    );
  });

  it('drops a skipped drill and closes the gap', () => {
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'skip', track_item_id: 'item-3' }),
    ]);
    expect(drills(r)).toEqual(['drill-1', 'drill-2', 'drill-4', 'drill-5']);
    // Positions renumber, so nothing downstream has to reason about holes.
    expect(r.entries.map((e) => e.position)).toEqual([1, 2, 3, 4]);
    expect(r.skipped.map((s) => s.id)).toEqual(['item-3']);
    expect(r.isPristine).toBe(false);
  });

  it('moves a drill earlier when reordered', () => {
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'reorder', track_item_id: 'item-5', position: 2 }),
    ]);
    expect(drills(r)).toEqual(['drill-1', 'drill-5', 'drill-2', 'drill-3', 'drill-4']);
    expect(r.entries.find((e) => e.guidedDrillId === 'drill-5')?.moved).toBe(true);
  });

  it('inserts a drill that is not on the track at all', () => {
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'insert', guided_drill_id: 'extra', position: 3 }),
    ]);
    expect(drills(r)).toEqual(['drill-1', 'drill-2', 'extra', 'drill-3', 'drill-4', 'drill-5']);
    const added = r.entries.find((e) => e.guidedDrillId === 'extra');
    expect(added).toMatchObject({ inserted: true, trackItemId: null });
  });

  it('appends an insert with no position', () => {
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'insert', guided_drill_id: 'extra' }),
    ]);
    expect(drills(r).at(-1)).toBe('extra');
    expect(r.entries).toHaveLength(6);
  });

  it('pins one entry to a band without touching the rest', () => {
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'repace', track_item_id: 'item-2', level: 'advanced' }),
    ]);
    expect(r.entries.find((e) => e.trackItemId === 'item-2')?.level).toBe('advanced');
    expect(r.entries.filter((e) => e.level !== null)).toHaveLength(1);
  });

  it('combines skip, reorder and insert in one student', () => {
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'skip', track_item_id: 'item-2' }),
      override({ action: 'reorder', track_item_id: 'item-5', position: 1 }),
      override({ action: 'insert', guided_drill_id: 'extra', position: 4 }),
    ]);
    expect(drills(r)).toEqual(['drill-5', 'drill-1', 'drill-3', 'extra', 'drill-4']);
    expect(r.entries.map((e) => e.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ignores a skip pointing at an item that is no longer on the track', () => {
    // The spine can be edited after a student has diverged.
    const r = resolveStudentCurriculum(SPINE, [
      override({ action: 'skip', track_item_id: 'item-99' }),
    ]);
    expect(r.entries).toHaveLength(5);
    expect(r.skipped).toEqual([]);
  });

  it('picks up a drill added to the spine after the student diverged', () => {
    // The point of storing a diff rather than a copy: an edit to the shared
    // track still reaches a student who has their own overrides.
    const grown = [...SPINE, item(6)];
    const r = resolveStudentCurriculum(grown, [
      override({ action: 'skip', track_item_id: 'item-2' }),
    ]);
    expect(drills(r)).toContain('drill-6');
  });
});

describe('nextCurriculumEntries', () => {
  const resolved = resolveStudentCurriculum(SPINE);

  it('starts from the beginning when nothing is assigned', () => {
    const next = nextCurriculumEntries(resolved, { assignedDrillIds: [], minutesBudget: 60 });
    expect(next.map((e) => e.guidedDrillId)).toEqual(['drill-1', 'drill-2']);
  });

  it('skips what the student already has', () => {
    const next = nextCurriculumEntries(resolved, {
      assignedDrillIds: ['drill-1', 'drill-2'],
      minutesBudget: 60,
    });
    expect(next.map((e) => e.guidedDrillId)).toEqual(['drill-3', 'drill-4']);
  });

  it('fits more work in when the pace is raised', () => {
    const next = nextCurriculumEntries(resolved, {
      assignedDrillIds: [],
      minutesBudget: 60,
      paceMultiplier: 2,
    });
    expect(next).toHaveLength(4);
  });

  it('never returns an empty week just because one drill exceeds the budget', () => {
    const long = [item(1, { estimated_minutes: 500 })];
    const next = nextCurriculumEntries(resolveStudentCurriculum(long), {
      assignedDrillIds: [],
      minutesBudget: 30,
    });
    expect(next).toHaveLength(1);
  });

  it('respects a hard cap ahead of the budget', () => {
    const next = nextCurriculumEntries(resolved, {
      assignedDrillIds: [],
      minutesBudget: 10_000,
      maxEntries: 3,
    });
    expect(next).toHaveLength(3);
  });

  it('returns nothing once the track is finished', () => {
    const next = nextCurriculumEntries(resolved, {
      assignedDrillIds: SPINE.map((i) => i.guided_drill_id),
      minutesBudget: 60,
    });
    expect(next).toEqual([]);
  });
});
