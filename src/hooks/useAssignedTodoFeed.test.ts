import { describe, it, expect } from 'vitest';
import {
  buildAssignedRows,
  routeWithReturnTo,
  type AssignedFeedSources,
} from './useAssignedTodoFeed';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

// Regression cover for the audit's H8/H9/H10. Before this merge two builders
// answered "what is assigned to me" from overlapping-but-different tables and
// the results were disjoint, not merely inconsistent.

const EMPTY: AssignedFeedSources = {
  hw: [],
  ta: [],
  guided: [],
  activities: [],
  items: [],
};

function guidedRow(over: Record<string, unknown> = {}) {
  return {
    id: 'ga-1',
    guided_drill_id: 'drill-1',
    status: 'assigned',
    assigned_at: '2026-05-22T15:31:33Z',
    guided_drill: { title: 'First Sentence Conclusions', question_count: 6, estimated_minutes: 30 },
    ...over,
  } as never;
}

function item(over: Partial<ClassroomItem> = {}): ClassroomItem {
  return {
    id: 'ci-1',
    type: 'bootcamp_module',
    title: 'Intro to LR',
    status: 'assigned',
    source_table: 'bootcamps',
    source_id: '/bootcamp/intro-to-lr',
    due_at: null,
    created_at: '2026-05-20T00:00:00Z',
    description: null,
    ...over,
  } as ClassroomItem;
}

describe('H8 · one feed, not two disjoint ones', () => {
  it('shows classroom-item work and source-row work in the same list', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [guidedRow()],
      items: [item()],
    });
    const titles = rows.map((r) => r.title).sort();
    // The old split showed "Intro to LR" on one surface and the drill on the
    // other, with zero overlap.
    expect(titles).toEqual(['First Sentence Conclusions', 'Intro to LR']);
  });

  it('routes a bootcamp module to the bootcamp, not a generic detail page', () => {
    const [row] = buildAssignedRows({ ...EMPTY, items: [item()] });
    expect(row.route).toBe('/bootcamp/intro-to-lr');
    expect(row.kind).toBe('bootcamp');
  });

  it('lets a classroom item override the source row it points at', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [guidedRow()],
      items: [
        item({
          id: 'ci-2',
          type: 'drill',
          title: 'Week 3 drill',
          source_table: 'guided_drill_assignments',
          source_id: 'ga-1',
          due_at: '2026-05-30T00:00:00Z',
        }),
      ],
    });
    expect(rows).toHaveLength(1);
    // The teacher's title and due date win...
    expect(rows[0].title).toBe('Week 3 drill');
    expect(rows[0].dueAt).toBe('2026-05-30T00:00:00Z');
    // ...but it still opens the drill, and keeps the source row's subtitle.
    expect(rows[0].route).toContain('/guided/ga-1');
    expect(rows[0].subtitle).toContain('6 questions');
  });

  it('does not let a mirror mark an unfinished guided attempt complete', () => {
    const [row] = buildAssignedRows({
      ...EMPTY,
      guided: [guidedRow({ status: 'read' })],
      items: [item({
        type: 'drill',
        source_table: 'guided_drill_assignments',
        source_id: 'ga-1',
        status: 'completed',
      })],
    });
    expect(row.status).toBe('assigned');
  });

  it('does not treat notes and recaps as work', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      items: [item({ type: 'note' }), item({ id: 'ci-3', type: 'session_recap' })],
    });
    expect(rows).toEqual([]);
  });
});

describe('Repeated assignments keep their own history', () => {
  it('keeps both issued instances of the same drill', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [
        guidedRow({ id: 'e47f7ea5', assigned_at: '2026-05-22T15:31:33Z' }),
        guidedRow({ id: 'a84153c7', assigned_at: '2026-05-22T15:37:08Z' }),
      ],
    });
    expect(rows.map((row) => row.refId)).toEqual(['a84153c7', 'e47f7ea5']);
  });

  it('shows an open assignment and a separately completed one', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [
        guidedRow({ id: 'old-open', status: 'assigned', assigned_at: '2026-05-01T00:00:00Z' }),
        guidedRow({ id: 'new-done', status: 'completed', completed_at: '2026-05-23T00:00:00Z', assigned_at: '2026-05-22T00:00:00Z' }),
      ],
    });
    expect(rows.map((row) => [row.refId, row.status])).toEqual([
      ['old-open', 'assigned'],
      ['new-done', 'completed'],
    ]);
  });

  it('uses an account-saved answer, not Start click, for In progress', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [guidedRow({ id: 'clicked-start', status: 'started' }), guidedRow({ id: 'saved-answer', status: 'started' })],
      guidedEvidence: { 'saved-answer': { sessionId: 'session-1', savedAnswerCount: 1, status: 'in_progress' } },
    });
    expect(rows.find((row) => row.refId === 'clicked-start')?.status).toBe('assigned');
    expect(rows.find((row) => row.refId === 'saved-answer')?.status).toBe('in_progress');
  });

  it('uses a saved Activity response, not Start click, for In progress', () => {
    const activity = { id: 'activity-a', title: 'Spot the Relationship', subtitle: null, status: 'in_progress', created_at: '2026-09-28T00:00:00Z', completed_at: null } as never;
    expect(buildAssignedRows({ ...EMPTY, activities: [activity] })[0].status).toBe('assigned');
    expect(buildAssignedRows({ ...EMPTY, activities: [activity], activityEvidence: new Set(['activity-a']) })[0].status)
      .toBe('in_progress');
  });

  it('keeps genuinely different drills apart', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [guidedRow({ id: 'a', guided_drill_id: 'd1' }), guidedRow({ id: 'b', guided_drill_id: 'd2' })],
    });
    expect(rows).toHaveLength(2);
  });
});

describe('H10 · a guided drill returns where it was launched from', () => {
  it('carries no returnTo until a caller supplies one', () => {
    const [row] = buildAssignedRows({ ...EMPTY, guided: [guidedRow()] });
    expect(row.route).toBe('/guided/ga-1');
  });

  it('stamps the launching surface', () => {
    expect(routeWithReturnTo('/guided/ga-1', '/classroom')).toBe('/guided/ga-1?returnTo=%2Fclassroom');
    expect(routeWithReturnTo('/guided/ga-1', '/schedule')).toBe('/guided/ga-1?returnTo=%2Fschedule');
  });

  it('replaces a baked-in returnTo rather than appending a second one', () => {
    const stamped = routeWithReturnTo('/guided/ga-1?returnTo=%2Fschedule', '/classroom');
    expect(stamped).toBe('/guided/ga-1?returnTo=%2Fclassroom');
  });

  it('leaves non-guided routes alone', () => {
    expect(routeWithReturnTo('/activities/x', '/classroom')).toBe('/activities/x');
    expect(routeWithReturnTo('/bootcamp/intro-to-lr', '/classroom')).toBe('/bootcamp/intro-to-lr');
  });
});

describe('an assigned PrepTest section is sat, not marked', () => {
  const sectionHw = {
    id: 'hw-9',
    set_title: 'PT156.S4 (LR)',
    question_qids: Array.from({ length: 26 }, (_, i) => `PT156-S4-Q${i + 1}`),
    status: 'assigned',
    created_at: '2026-09-11T00:00:00Z',
    score: null,
  };
  const mixedHw = { ...sectionHw, id: 'hw-10', question_qids: ['PT156-S4-Q1', 'PT101-S2-Q3'] };

  it('opens on the directions page and completes itself', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [row] = buildAssignedRows({ ...EMPTY, hw: [sectionHw as any] });
    expect(row.route).toBe('/section/hw-9');
    expect(row.selfCompleting).toBe(true);
  });

  it('keeps the classroom page and Mark done for a mixed set', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [row] = buildAssignedRows({ ...EMPTY, hw: [mixedHw as any] });
    expect(row.route).toBe('/classroom/hw-10');
    expect(row.selfCompleting).toBeFalsy();
  });

  it('survives the classroom_items mirror written with the old route', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hw: [sectionHw as any],
      items: [
        item({
          id: 'ci-9',
          type: 'homework',
          title: 'PT156.S4 (LR)',
          source_table: 'homework_assignments',
          source_id: 'hw-9',
          metadata_json: { assigned_route: '/classroom/hw-9' },
        }),
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].route).toBe('/section/hw-9');
    expect(rows[0].selfCompleting).toBe(true);
  });
});

describe('homework progress requires a saved answer', () => {
  it('does not count first-question render or a completed mirror as completion', () => {
    const homework = { id: 'hw-opened', set_title: 'LR homework', question_qids: ['PT101-S2-Q1'], status: 'in_progress', completed_at: null, created_at: '2026-09-28T00:00:00Z', score: null };
    const [row] = buildAssignedRows({
      ...EMPTY,
      hw: [homework as never],
      items: [item({ type: 'homework', source_table: 'homework_assignments', source_id: 'hw-opened', status: 'completed' })],
    });
    expect(row.status).toBe('assigned');
  });
});

describe('weekly plan source status', () => {
  const planMirror = item({
    id: 'ci-plan',
    type: 'weekly_plan_task',
    source_table: 'weekly_plan_items',
    source_id: 'plan-task-1',
  });

  it('uses the plan item after either side of the mirror becomes stale', () => {
    expect(buildAssignedRows({
      ...EMPTY,
      items: [{ ...planMirror, status: 'assigned' }],
      weeklyPlanStatusById: { 'plan-task-1': 'completed' },
    })[0].status).toBe('completed');
    expect(buildAssignedRows({
      ...EMPTY,
      items: [{ ...planMirror, status: 'completed' }],
      weeklyPlanStatusById: { 'plan-task-1': 'assigned' },
    })[0].status).toBe('assigned');
    expect(buildAssignedRows({
      ...EMPTY,
      items: [{ ...planMirror, status: 'completed' }],
      weeklyPlanStatusById: { 'plan-task-1': 'in_progress' },
    })[0].status).toBe('in_progress');
  });

  it('withholds plan mirrors until their source is read, and omits missing or skipped sources', () => {
    expect(buildAssignedRows({ ...EMPTY, items: [planMirror] })).toEqual([]);
    expect(buildAssignedRows({ ...EMPTY, items: [planMirror], weeklyPlanStatusById: {} })).toEqual([]);
    expect(buildAssignedRows({
      ...EMPTY,
      items: [planMirror],
      weeklyPlanStatusById: { 'plan-task-1': 'skipped' },
    })).toEqual([]);
  });

  it('does not hide other work while weekly plan status is unavailable', () => {
    const rows = buildAssignedRows({ ...EMPTY, items: [planMirror, item({ id: 'ci-bootcamp' })] });
    expect(rows.map((row) => row.kind)).toEqual(['bootcamp']);
  });
});
