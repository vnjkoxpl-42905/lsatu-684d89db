import { eachDayOfInterval, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import type { TodoItem } from '@/hooks/useStudentTodo';
import { resolveItemRoute } from '@/lib/classroomItems';
import { readTodoAction, resolveTodoRoute } from '@/lib/todoActions';

export type ScheduleEntryKind = 'session' | 'work' | 'task';
export type ScheduleEntrySourceType = 'classroom' | 'booking' | 'todo';

/**
 * One thing placed on one calendar day. Multi-day classroom work expands into
 * one entry per day, with a stable source id and a date-specific key.
 */
export interface ScheduleEntry {
  id: string;
  key: string;
  kind: ScheduleEntryKind;
  sourceType: ScheduleEntrySourceType;
  title: string;
  startsAt: string;
  dateKey: string;
  endAt: string | null;
  route: string | null;
  meetUrl: string | null;
  calendarStatus: string | null;
  status: string;
  allDay: boolean;
  source: ClassroomItem | TodoItem;
}

/** yyyy-MM-dd in the runtime's local calendar. */
export function scheduleDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function validDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const date = parseISO(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function metadataString(item: ClassroomItem, key: string): string | undefined {
  const value = item.metadata_json?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function hasExplicitTime(raw: string): boolean {
  // A date-only value is an all-day date. A timestamp remains timed, even at
  // midnight, because its offset is part of the source's scheduling intent.
  return /T\d{2}:\d{2}/.test(raw);
}

function classroomEntry(
  item: ClassroomItem,
  startsAt: Date,
  allDay: boolean,
  dateKey = scheduleDateKey(startsAt),
): ScheduleEntry {
  return {
    id: item.id,
    key: `classroom:${item.id}:${dateKey}`,
    kind: 'work',
    sourceType: 'classroom',
    title: item.title,
    startsAt: startsAt.toISOString(),
    dateKey,
    endAt: null,
    route: resolveItemRoute(item),
    meetUrl: null,
    calendarStatus: null,
    status: item.status,
    allDay,
    source: item,
  };
}

/**
 * Normalize visible classroom records onto deliberate schedule dates.
 * `created_at` is never a calendar fallback: undated records are omitted.
 */
export function normalizeClassroomScheduleEntries(items: ClassroomItem[]): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const item of items) {
    const dueAt = validDate(item.due_at);
    const unlockAt = validDate(item.unlock_at);

    if (item.type === 'bootcamp_module' && unlockAt && dueAt && dueAt >= unlockAt) {
      for (const day of eachDayOfInterval({ start: startOfDay(unlockAt), end: startOfDay(dueAt) })) {
        const dateKey = scheduleDateKey(day);
        entries.push(classroomEntry(item, day, true, dateKey));
      }
      continue;
    }

    const raw = dueAt ? item.due_at : unlockAt ? item.unlock_at : null;
    const startsAt = dueAt ?? unlockAt;
    if (!raw || !startsAt) continue;
    entries.push(classroomEntry(item, startsAt, !hasExplicitTime(raw)));
  }

  return sortScheduleEntries(entries);
}

/** Booking items preserve their exact start/end times for chronological order. */
export function normalizeBookingScheduleEntries(items: ClassroomItem[]): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const item of items) {
    const startsAt = validDate(item.due_at);
    if (!startsAt) continue;
    const endAt = validDate(metadataString(item, 'end_at')) ?? undefined;
    const dateKey = scheduleDateKey(startsAt);
    entries.push({
      id: item.id,
      key: `booking:${item.id}:${dateKey}`,
      kind: 'session',
      sourceType: 'booking',
      title: item.title,
      startsAt: startsAt.toISOString(),
      dateKey,
      endAt: endAt?.toISOString() ?? null,
      route: '/booking',
      meetUrl: metadataString(item, 'meet_url') ?? null,
      calendarStatus: metadataString(item, 'calendar_status') ?? null,
      status: item.status,
      allDay: false,
      source: item,
    });
  }

  return sortScheduleEntries(entries);
}

/** Personal tasks live on `day_date`; a same-day due timestamp supplies time. */
export function normalizeTodoScheduleEntries(items: TodoItem[]): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  for (const item of items) {
    const day = validDate(item.day_date);
    if (!day) continue;
    const dayStart = startOfDay(day);
    const dueAt = validDate(item.due_at);
    const timedDueAt = dueAt && item.due_at && hasExplicitTime(item.due_at) && isSameDay(dueAt, dayStart)
      ? dueAt
      : null;
    const startsAt = timedDueAt ?? dayStart;
    const dateKey = scheduleDateKey(dayStart);
    const route = resolveTodoRoute(readTodoAction(item.metadata_json));
    entries.push({
      id: item.id,
      key: `todo:${item.id}:${dateKey}`,
      kind: 'task',
      sourceType: 'todo',
      title: item.title,
      startsAt: startsAt.toISOString(),
      dateKey,
      endAt: null,
      route,
      meetUrl: null,
      calendarStatus: null,
      status: item.status,
      allDay: timedDueAt === null,
      source: item,
    });
  }

  return sortScheduleEntries(entries);
}

/** Build one deterministic stream for all student Schedule surfaces. */
export function buildScheduleEntries(
  classroomItems: ClassroomItem[] = [],
  bookingItems: ClassroomItem[] = [],
  todoItems: TodoItem[] = [],
): ScheduleEntry[] {
  const classroomIdsRepresentedByTodos = new Set(
    todoItems
      .map((item) => item.classroom_item_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  const standaloneClassroomItems = classroomItems.filter(
    (item) => !classroomIdsRepresentedByTodos.has(item.id),
  );

  return sortScheduleEntries([
    ...normalizeClassroomScheduleEntries(standaloneClassroomItems),
    ...normalizeBookingScheduleEntries(bookingItems),
    ...normalizeTodoScheduleEntries(todoItems),
  ]);
}

/**
 * All-day entries lead their date; timed entries then retain millisecond-level
 * chronological ordering. Remaining fields make ties deterministic.
 */
export function sortScheduleEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort((a, b) => {
    const byDay = a.dateKey.localeCompare(b.dateKey);
    if (byDay !== 0) return byDay;
    const byAllDay = Number(b.allDay) - Number(a.allDay);
    if (byAllDay !== 0) return byAllDay;
    const byTime = new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    if (byTime !== 0) return byTime;
    return a.key.localeCompare(b.key);
  });
}

export function entriesForDate(index: Map<string, ScheduleEntry[]>, date: Date | string): ScheduleEntry[] {
  const parsed = typeof date === 'string' ? validDate(date) : date;
  if (!parsed || Number.isNaN(parsed.getTime())) return [];
  const dateKey = scheduleDateKey(parsed);
  return index.get(dateKey) ?? [];
}

export function groupScheduleEntries(entries: ScheduleEntry[]): Map<string, ScheduleEntry[]> {
  const index = new Map<string, ScheduleEntry[]>();
  for (const entry of sortScheduleEntries(entries)) {
    const day = index.get(entry.dateKey) ?? [];
    day.push(entry);
    index.set(entry.dateKey, day);
  }
  return index;
}
