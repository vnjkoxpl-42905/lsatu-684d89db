import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { bootcampDays } from '@/lib/bootcampDays';

// Item C — groups per-student classroom_items rows into one logical
// "assignment" each. There's no shared group_id column today; we group
// heuristically by (type, title, source_key). Same-title rows of the same
// type and source collapse together. Acceptable trade-off; admins can
// rename if two genuinely different assignments share a title.

export type AssignmentState = 'not_started' | 'in_progress' | 'completed' | 'stuck';

const STUCK_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

interface ProgressMeta {
  completedDays?: number[];
  totalDays?: number;
  percent?: number;
  lastDayAt?: string;
}

interface BootcampMeta {
  bootcamp_id?: string;
  assigned_day_ids?: number[];
  progress?: ProgressMeta;
}

interface HomeworkMeta {
  set_id?: string;
}

function metaOf<T>(item: ClassroomItem): T {
  return (item.metadata_json ?? {}) as T;
}

export function sourceKeyOf(item: ClassroomItem): string | null {
  if (item.type === 'bootcamp_module') {
    return metaOf<BootcampMeta>(item).bootcamp_id ?? null;
  }
  if (item.type === 'homework') {
    return metaOf<HomeworkMeta>(item).set_id ?? null;
  }
  return null;
}

export function classifyItem(item: ClassroomItem, now: Date = new Date()): AssignmentState {
  if (item.status === 'completed') return 'completed';
  if (item.status === 'archived') return 'not_started';

  const meta = metaOf<BootcampMeta>(item);
  const progress = meta.progress;
  const completedCount = progress?.completedDays?.length ?? 0;

  // Bootcamp-specific completion check against assigned days.
  if (item.type === 'bootcamp_module' && meta.bootcamp_id) {
    const fullSchedule = bootcampDays(meta.bootcamp_id);
    const assignedCount = meta.assigned_day_ids?.length ?? fullSchedule?.length ?? progress?.totalDays ?? 0;
    if (assignedCount > 0 && completedCount >= assignedCount) return 'completed';
  }

  const hasProgress = completedCount > 0 || item.status === 'in_progress';
  if (hasProgress) {
    const lastTouchIso = progress?.lastDayAt ?? item.updated_at;
    const lastTouchMs = lastTouchIso ? Date.parse(lastTouchIso) : NaN;
    if (Number.isFinite(lastTouchMs) && now.getTime() - lastTouchMs > STUCK_THRESHOLD_MS) {
      return 'stuck';
    }
    return 'in_progress';
  }
  return 'not_started';
}

export interface AssignmentGroupStats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  stuck: number;
}

export interface AssignmentGroup {
  groupKey: string;
  type: ClassroomItem['type'];
  title: string;
  sourceKey: string | null;
  createdBy: string;
  items: ClassroomItem[];
  stats: AssignmentGroupStats;
  // Most recent created_at across the group, used for sort.
  latestCreatedAt: string;
}

function groupKeyOf(item: ClassroomItem, sourceKey: string | null): string {
  return [item.type, item.title.trim().toLowerCase(), sourceKey ?? '∅'].join('|');
}

export function groupAssignments(
  items: ClassroomItem[],
  now: Date = new Date(),
): AssignmentGroup[] {
  const map = new Map<string, AssignmentGroup>();
  for (const item of items) {
    if (item.status === 'archived') continue;
    const sourceKey = sourceKeyOf(item);
    const key = groupKeyOf(item, sourceKey);
    let group = map.get(key);
    if (!group) {
      group = {
        groupKey: key,
        type: item.type,
        title: item.title,
        sourceKey,
        createdBy: item.created_by,
        items: [],
        stats: { total: 0, notStarted: 0, inProgress: 0, completed: 0, stuck: 0 },
        latestCreatedAt: item.created_at,
      };
      map.set(key, group);
    }
    group.items.push(item);
    group.stats.total += 1;
    const state = classifyItem(item, now);
    if (state === 'completed') group.stats.completed += 1;
    else if (state === 'in_progress') group.stats.inProgress += 1;
    else if (state === 'stuck') group.stats.stuck += 1;
    else group.stats.notStarted += 1;
    if (item.created_at > group.latestCreatedAt) group.latestCreatedAt = item.created_at;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.latestCreatedAt < b.latestCreatedAt ? 1 : a.latestCreatedAt > b.latestCreatedAt ? -1 : 0,
  );
}

export interface DayProgress {
  day: number;
  label: string;
  focus: string;
  state: 'done' | 'in_progress' | 'untouched' | 'not_assigned';
}

// Item D — pure read over a single bootcamp_module row's metadata.
// Reads completedDays + assigned_day_ids + the bootcamp's day registry.
// in_progress is reserved for "max completed day + 1, if assigned and
// not yet done."
export function bootcampProgressByDay(
  item: ClassroomItem,
  bootcampId: string,
): DayProgress[] {
  const days = bootcampDays(bootcampId) ?? [];
  const meta = metaOf<BootcampMeta>(item);
  const completed = new Set(meta.progress?.completedDays ?? []);
  const assignedSet = meta.assigned_day_ids
    ? new Set(meta.assigned_day_ids)
    : null; // null = all days assigned

  const nextDay = computeNextAssignedDay(days, completed, assignedSet);

  return days.map<DayProgress>((d) => {
    const assigned = assignedSet ? assignedSet.has(d.day) : true;
    if (!assigned) {
      return { day: d.day, label: d.label, focus: d.focus, state: 'not_assigned' };
    }
    if (completed.has(d.day)) {
      return { day: d.day, label: d.label, focus: d.focus, state: 'done' };
    }
    if (d.day === nextDay) {
      return { day: d.day, label: d.label, focus: d.focus, state: 'in_progress' };
    }
    return { day: d.day, label: d.label, focus: d.focus, state: 'untouched' };
  });
}

function computeNextAssignedDay(
  days: { day: number }[],
  completed: Set<number>,
  assignedSet: Set<number> | null,
): number | null {
  for (const d of days) {
    const assigned = assignedSet ? assignedSet.has(d.day) : true;
    if (assigned && !completed.has(d.day)) return d.day;
  }
  return null;
}
