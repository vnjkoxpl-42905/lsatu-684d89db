import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyPlan, WeeklyPlanItem } from '@/hooks/useWeeklyPlan';
import { buildPrescribedWeek } from '@/lib/weeklyPlanWeek';
import { fakePlanDb, type FakePlanDb } from '@/test/fakePlanDb';

const state = vi.hoisted(() => ({ db: null as unknown as FakePlanDb, user: { id: 'stu' } as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (t: string) => state.db.from(t) } }));

import PrescribedWeek, { PrescribedWeekView } from './PrescribedWeek';

afterEach(cleanup);

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return iso(d);
};
const todayISO = shift(0);

const makePlan = (over: Partial<WeeklyPlan> = {}): WeeklyPlan => ({
  id: 'p1',
  student_id: 'stu',
  created_by: 'teacher',
  title: 'Week 4',
  week_start: shift(-1),
  week_end: shift(5),
  status: 'published',
  ai_generated: false,
  rationale: null,
  published_at: null,
  created_at: '2026-09-27T00:00:00Z',
  updated_at: '2026-09-27T00:00:00Z',
  ...over,
});
const plan = makePlan();
const item = (over: Partial<WeeklyPlanItem>): WeeklyPlanItem => ({
  id: 'i',
  weekly_plan_id: 'p1',
  student_id: 'stu',
  classroom_item_id: null,
  day_date: todayISO,
  title: 'Task',
  instructions: null,
  estimated_minutes: null,
  unlock_at: null,
  due_at: null,
  status: 'assigned',
  sort_order: 0,
  metadata_json: {},
  ...over,
});

const items = [
  item({ id: 'g', title: 'Flaw drill', estimated_minutes: 40, metadata_json: { action: { kind: 'drill', ref_id: 'ga1', route: '/guided/ga1' } } }),
  item({ id: 'h', title: 'Review misses', sort_order: 1, classroom_item_id: 'ci-2', status: 'completed' }),
];

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

function renderStudent(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const ui = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/my-work/to-do']}>
        <Routes>
          <Route path="/my-work/to-do" element={<PrescribedWeek />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const utils = render(ui());
  return { ...utils, client, rerenderSame: () => utils.rerender(ui()) };
}

describe('PrescribedWeek (student)', () => {
  it('shows one real week with dates, order, stored status, disclosed estimates and a finish line', async () => {
    state.user = { id: 'stu' };
    state.db = fakePlanDb({ weekly_plans: [plan], weekly_plan_items: items });
    renderStudent();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your week: Week 4' })).toBeInTheDocument());
    const tasks = screen.getAllByTestId('prescribed-task');
    expect(tasks.map((t) => t.textContent)).toEqual([
      expect.stringContaining('1. Flaw drill'),
      expect.stringContaining('2. Review misses'),
    ]);
    expect(tasks[0]).toHaveTextContent('About 40 min');
    expect(tasks[0]).toHaveTextContent('Not started');
    expect(tasks[1]).toHaveTextContent('No time estimate');
    expect(tasks[1]).toHaveTextContent('Completed');
    expect(screen.getByTestId('prescribed-week-counts')).toHaveTextContent(
      '1 of 2 done. About 40 min in total, 40 min left, not counting 1 task with no estimate.',
    );
    expect(screen.getByTestId('prescribed-week-finish')).toHaveTextContent('This week is finished when all 2 tasks show Completed.');
    expect(screen.getByText(/\(today\)/)).toBeInTheDocument();
  });

  it('opens the actual record and writes nothing when a task is opened', async () => {
    state.user = { id: 'stu' };
    state.db = fakePlanDb({ weekly_plans: [plan], weekly_plan_items: items });
    renderStudent();
    const link = await screen.findByRole('link', { name: /Open step 1, Flaw drill/ });
    fireEvent.click(link);
    expect(screen.getByTestId('where')).toHaveTextContent('/guided/ga1?returnTo=%2Fmy-work%2Fto-do');
    expect(state.db.log.filter((q) => q.startsWith('write:'))).toEqual([]);
  });

  it('renders nothing when no prescribed plan exists, and never the personal to-do plan', async () => {
    state.user = { id: 'stu' };
    state.db = fakePlanDb({
      weekly_plans: [makePlan({ id: 'personal', title: '__personal__', created_by: 'stu', week_start: '2000-01-01', week_end: '2999-12-31' })],
      weekly_plan_items: [],
    });
    const { container } = renderStudent();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(container.textContent).toBe('');
  });

  it('says the first load failed and offers a retry', async () => {
    state.user = { id: 'stu' };
    state.db = fakePlanDb({ weekly_plans: [plan], weekly_plan_items: items });
    state.db.failTable.add('weekly_plans');
    renderStudent();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your weekly plan.');
    state.db.failTable.clear();
    fireEvent.click(screen.getByRole('button', { name: 'Load the weekly plan again' }));
    expect(await screen.findByRole('heading', { name: 'Your week: Week 4' })).toBeInTheDocument();
  });

  it('keeps the last loaded week on screen when a refresh fails, with a warning and a retry', async () => {
    state.user = { id: 'stu' };
    state.db = fakePlanDb({ weekly_plans: [plan], weekly_plan_items: items });
    const { client } = renderStudent();
    await screen.findByRole('heading', { name: 'Your week: Week 4' });

    state.db.failTable.add('weekly_plans');
    await act(async () => {
      await client.refetchQueries({ queryKey: ['current-weekly-plan', 'stu'] });
    });
    expect(await screen.findByTestId('prescribed-week-stale')).toHaveTextContent('We could not refresh your weekly plan.');
    expect(screen.getByRole('heading', { name: 'Your week: Week 4' })).toBeInTheDocument();
    expect(screen.getAllByTestId('prescribed-task')).toHaveLength(2);

    state.db.failTable.clear();
    fireEvent.click(screen.getByRole('button', { name: 'Load the weekly plan again' }));
    await waitFor(() => expect(screen.queryByTestId('prescribed-week-stale')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Your week: Week 4' })).toBeInTheDocument();
  });

  it('shows the new account\'s week after a switch, even when the old account\'s read lands late', async () => {
    const bPlan = makePlan({ id: 'pb', student_id: 'b', title: 'B week' });
    state.user = { id: 'a' };
    state.db = fakePlanDb({
      weekly_plans: [makePlan({ id: 'pa', student_id: 'a', title: 'A week' }), bPlan],
      weekly_plan_items: [item({ id: 'ia', weekly_plan_id: 'pa', student_id: 'a', title: 'A task' }), item({ id: 'ib', weekly_plan_id: 'pb', student_id: 'b', title: 'B task' })],
    });
    // Hold A's read open.
    let releaseA!: () => void;
    const aHeld = new Promise<void>((r) => (releaseA = r));
    let first = true;
    state.db.gate = () => (first ? ((first = false), aHeld) : Promise.resolve());

    const { rerenderSame } = renderStudent();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your weekly plan');

    state.user = { id: 'b' };
    rerenderSame();
    expect(await screen.findByRole('heading', { name: 'Your week: B week' })).toBeInTheDocument();

    await act(async () => {
      releaseA();
      await aHeld;
    });
    expect(screen.getByRole('heading', { name: 'Your week: B week' })).toBeInTheDocument();
    expect(screen.queryByText(/A task/)).toBeNull();
    expect(screen.getByText(/B task/)).toBeInTheDocument();
  });
});

describe('PrescribedWeekView (teacher)', () => {
  it('shows the same order, status and counts as the student, with no student links', () => {
    const week = buildPrescribedWeek(plan, items, new Date(), todayISO);
    render(
      <MemoryRouter>
        <PrescribedWeekView week={week} audience="teacher" />
      </MemoryRouter>,
    );
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    const tasks = screen.getAllByTestId('prescribed-task');
    expect(within(tasks[0]).getByText(/1\. Flaw drill/)).toBeInTheDocument();
    expect(tasks[1]).toHaveTextContent('Completed');
    expect(screen.getByTestId('prescribed-week-counts')).toHaveTextContent('1 of 2 done');
  });
});
