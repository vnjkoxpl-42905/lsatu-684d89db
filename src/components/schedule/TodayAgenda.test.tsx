import { render, screen } from '@testing-library/react';
import { format, subDays } from 'date-fns';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { useStudentTodo, TodoItem } from '@/hooks/useStudentTodo';
import type { ScheduleEntry } from '@/lib/scheduleEntries';
import TodayAgenda from './TodayAgenda';

describe('TodayAgenda', () => {
  it('shows a moved overdue task once, in the overdue section', () => {
    const today = new Date();
    const item = {
      id: 'todo-1',
      weekly_plan_id: 'plan-1',
      student_id: 'student-1',
      classroom_item_id: null,
      day_date: format(today, 'yyyy-MM-dd'),
      title: 'Moved task',
      instructions: null,
      estimated_minutes: null,
      unlock_at: null,
      due_at: subDays(today, 1).toISOString(),
      status: 'assigned',
      sort_order: 0,
      metadata_json: {},
      source: 'self',
      google_event_id: null,
    } satisfies TodoItem;
    const entry = {
      id: item.id,
      key: `todo:${item.id}:${item.day_date}`,
      kind: 'task',
      sourceType: 'todo',
      title: item.title,
      startsAt: `${item.day_date}T00:00:00.000Z`,
      dateKey: item.day_date,
      endAt: null,
      route: null,
      meetUrl: null,
      calendarStatus: null,
      status: item.status,
      allDay: true,
      source: item,
    } satisfies ScheduleEntry;
    const todo = {
      items: [item],
      loading: false,
      error: null,
      refresh: vi.fn(),
      toggleComplete: vi.fn(),
      moveToDay: vi.fn(),
      addTask: vi.fn(),
      deleteTask: vi.fn(),
    } satisfies ReturnType<typeof useStudentTodo>;

    render(
      <MemoryRouter>
        <TodayAgenda entries={[entry]} todo={todo} onOpenEntry={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Moved task')).toHaveLength(1);
    expect(screen.getByText('Overdue · 1')).toBeInTheDocument();
    expect(screen.queryByText(/^Tasks ·/)).not.toBeInTheDocument();
  });
});
