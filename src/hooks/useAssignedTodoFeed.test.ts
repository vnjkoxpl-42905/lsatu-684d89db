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

  it('does not treat notes and recaps as work', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      items: [item({ type: 'note' }), item({ id: 'ci-3', type: 'session_recap' })],
    });
    expect(rows).toEqual([]);
  });
});

describe('H9 · duplicate assignments of one drill collapse', () => {
  it('keeps a single row for two assignments of the same drill', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [
        guidedRow({ id: 'e47f7ea5', assigned_at: '2026-05-22T15:31:33Z' }),
        guidedRow({ id: 'a84153c7', assigned_at: '2026-05-22T15:37:08Z' }),
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].refId).toBe('a84153c7'); // the newer of the two
  });

  it('prefers an open assignment over a newer completed one', () => {
    const rows = buildAssignedRows({
      ...EMPTY,
      guided: [
        guidedRow({ id: 'old-open', status: 'assigned', assigned_at: '2026-05-01T00:00:00Z' }),
        guidedRow({ id: 'new-done', status: 'completed', assigned_at: '2026-05-22T00:00:00Z' }),
      ],
    });
    expect(rows).toHaveLength(1);
    // Hiding still-owed work because a later twin was finished would be worse
    // than showing a stale date.
    expect(rows[0].refId).toBe('old-open');
    expect(rows[0].status).toBe('assigned');
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
