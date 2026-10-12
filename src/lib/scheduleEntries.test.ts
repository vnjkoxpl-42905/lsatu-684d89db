import { describe, expect, it } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import type { TodoItem } from '@/hooks/useStudentTodo';
import {
  buildScheduleEntries,
  entriesForDate,
  groupScheduleEntries,
  normalizeClassroomScheduleEntries,
  normalizeTodoScheduleEntries,
} from './scheduleEntries';

function classroom(overrides: Partial<ClassroomItem> = {}): ClassroomItem {
  return {
    id: 'classroom-1',
    student_id: 'student-1',
    class_id: null,
    created_by: 'teacher-1',
    type: 'homework',
    title: 'Logical reasoning set',
    description: null,
    content_html: null,
    content_markdown: null,
    source_table: 'homework_assignments',
    source_id: 'homework-1',
    status: 'assigned',
    unlock_at: null,
    due_at: '2026-08-12T20:00:00-04:00',
    completed_at: null,
    priority: 0,
    visible_to_student: true,
    metadata_json: {},
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    ...overrides,
  };
}

function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'todo-1',
    weekly_plan_id: 'plan-1',
    student_id: 'student-1',
    classroom_item_id: null,
    day_date: '2026-08-12',
    title: 'Review wrong answers',
    instructions: null,
    estimated_minutes: 30,
    unlock_at: null,
    due_at: null,
    status: 'assigned',
    sort_order: 0,
    metadata_json: {},
    source: 'self',
    google_event_id: null,
    ...overrides,
  };
}

describe('normalizeClassroomScheduleEntries', () => {
  it('never invents a schedule date from created_at', () => {
    const entries = normalizeClassroomScheduleEntries([
      classroom({ due_at: null, unlock_at: null, created_at: '2026-08-10T14:00:00Z' }),
    ]);

    expect(entries).toEqual([]);
  });

  it('uses an intentional unlock date when no due date exists', () => {
    const [entry] = normalizeClassroomScheduleEntries([
      classroom({ due_at: null, unlock_at: '2026-08-11T09:30:00-04:00' }),
    ]);

    expect(entry).toMatchObject({
      kind: 'work',
      sourceType: 'classroom',
      dateKey: '2026-08-11',
      allDay: false,
    });
    expect(entry.startsAt).toBe('2026-08-11T13:30:00.000Z');
  });

  it('expands an inclusive multi-day bootcamp range', () => {
    const entries = normalizeClassroomScheduleEntries([
      classroom({
        id: 'bootcamp-1',
        type: 'bootcamp_module',
        unlock_at: '2026-08-10T08:00:00-04:00',
        due_at: '2026-08-13T18:00:00-04:00',
      }),
    ]);

    expect(entries.map((entry) => entry.dateKey)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
    ]);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(4);
    expect(entries.every((entry) => entry.allDay)).toBe(true);
  });
});

describe('combined schedule entries', () => {
  it('normalizes all three sources and sorts timed entries precisely', () => {
    const entries = buildScheduleEntries(
      [classroom({ id: 'work', due_at: '2026-08-12T15:00:00-04:00' })],
      [
        classroom({
          id: 'late-session',
          due_at: '2026-08-12T11:00:00-04:00',
          source_table: 'booking_pass_redemptions',
          metadata_json: { end_at: '2026-08-12T12:10:00-04:00', meet_url: 'https://meet.example/late', calendar_status: 'synced' },
        }),
        classroom({
          id: 'early-session',
          due_at: '2026-08-12T09:15:00-04:00',
          source_table: 'booking_pass_redemptions',
        }),
      ],
      [todo()],
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      'todo-1',
      'early-session',
      'late-session',
      'work',
    ]);
    expect(entries.map((entry) => entry.kind)).toEqual(['task', 'session', 'session', 'work']);
    expect(entries[2]).toMatchObject({
      route: '/booking',
      meetUrl: 'https://meet.example/late',
      calendarStatus: 'synced',
    });
    expect(entries[2].endAt).toBe('2026-08-12T16:10:00.000Z');
  });

  it('keeps todos on day_date but preserves a same-day due time', () => {
    const [timed] = normalizeTodoScheduleEntries([
      todo({ day_date: '2026-08-12', due_at: '2026-08-12T14:45:00-04:00' }),
    ]);
    const [moved] = normalizeTodoScheduleEntries([
      todo({ day_date: '2026-08-13', due_at: '2026-08-12T14:45:00-04:00' }),
    ]);

    expect(timed).toMatchObject({ dateKey: '2026-08-12', allDay: false });
    expect(timed.startsAt).toBe('2026-08-12T18:45:00.000Z');
    expect(moved).toMatchObject({ dateKey: '2026-08-13', allDay: true });
  });

  it('prefers a todo linked to classroom work instead of showing both', () => {
    const entries = buildScheduleEntries(
      [classroom({ id: 'linked-work', title: 'Teacher classroom title' })],
      [],
      [todo({
        id: 'linked-todo',
        classroom_item_id: 'linked-work',
        day_date: '2026-08-13',
        title: 'Actionable weekly-plan title',
        status: 'in_progress',
      })],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 'linked-todo',
      kind: 'task',
      title: 'Actionable weekly-plan title',
      dateKey: '2026-08-13',
      status: 'in_progress',
    });
  });

  it('indexes and selects entries by local yyyy-MM-dd', () => {
    const entries = buildScheduleEntries(
      [classroom({ id: 'work-12' })],
      [],
      [todo({ id: 'todo-13', day_date: '2026-08-13' })],
    );
    const index = groupScheduleEntries(entries);

    expect([...index.keys()]).toEqual(['2026-08-12', '2026-08-13']);
    expect(index.get('2026-08-12')?.map((entry) => entry.id)).toEqual(['work-12']);
    expect(entriesForDate(index, '2026-08-13').map((entry) => entry.id)).toEqual(['todo-13']);
  });
});
