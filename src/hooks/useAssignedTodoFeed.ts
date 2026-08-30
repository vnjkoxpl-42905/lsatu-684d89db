import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentAssignments, useStudentTAAssignments } from '@/hooks/useStudentAssignments';
import { useClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';
import { readSectionBriefing, type SectionBriefing } from '@/lib/sectionBriefing';
import { listAssignmentsForStudent as listGuidedForStudent, type GuidedDrill, type GuidedDrillAssignment } from '@/lib/guidedDrills';
import { listStudentAssignments as listActivityForStudent } from '@/features/activity-centre/api/activitiesClient';

/**
 * A unified read-only "assigned" row surfaced in the student's Today list.
 * Status is derived from the underlying source row so completing work on the
 * assignment page reflects here without any extra plumbing.
 */
export interface AssignedTodoRow {
  key: string;
  kind: 'homework' | 'ta' | 'activity' | 'guided' | 'bootcamp' | 'plan';
  refId: string;
  /** The table `refId` points into, so a classroom_items row can be matched to it. */
  sourceTable: string;
  title: string;
  subtitle: string;
  status: 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  /** Due date, when a classroom_items row carries one. */
  dueAt: string | null;
  route: string;
  /**
   * Work that reports its own completion, so the student is never asked to
   * assert it. A timed section is the case: sitting it IS finishing it, and a
   * "Mark done" button beside one can be pressed without doing the section at
   * all, which is worse than useless on work assigned as a measurement.
   */
  selfCompleting?: boolean;
  /**
   * Present only on a timed section. Home opens these instructions over the
   * stage instead of navigating, so declining costs the student nothing.
   */
  briefing?: SectionBriefing;
}

type GuidedRow = GuidedDrillAssignment & { guided_drill: GuidedDrill };

function normalizeStatus(raw: string | null | undefined): AssignedTodoRow['status'] {
  if (raw === 'completed') return 'completed';
  if (raw === 'assigned') return 'assigned';
  return 'in_progress';
}

/** classroom_items types that represent work rather than reading material. */
const WORK_ITEM_KIND: Partial<Record<ClassroomItem['type'], AssignedTodoRow['kind']>> = {
  drill: 'guided',
  homework: 'homework',
  activity: 'activity',
  bootcamp_module: 'bootcamp',
  weekly_plan_task: 'plan',
};

/**
 * `/guided/:id` reads `returnTo` to decide where finishing the drill lands the
 * student. Building it into the row would bake in whichever surface happened to
 * construct the feed, which is how every guided drill ended up returning to
 * `/schedule` no matter where it was launched from. Consumers call this at
 * click time with their own location instead.
 */
export function routeWithReturnTo(route: string, from: string): string {
  if (!route.startsWith('/guided/')) return route;
  const [path, query = ''] = route.split('?');
  const params = new URLSearchParams(query);
  params.set('returnTo', from);
  return `${path}?${params.toString()}`;
}

/**
 * The single source for "what has been assigned to me".
 *
 * Two independent builders used to answer this question — this hook, and
 * `buildWorkRows` in classroomData.ts — reading overlapping but different
 * tables. The result was not merely inconsistent, it was disjoint: Home listed
 * guided drills and no bootcamp, the Classroom's Assigned work panel listed the
 * bootcamp and no drills. Everything now merges here.
 *
 * Identity is `sourceTable:refId`. A classroom_items row that points at a
 * source assignment is the preferred representation of it — the teacher can
 * retitle it and set a due date — so it overrides, and `resolveItemRoute` sends
 * it to the same destination the raw row would have used.
 */
export interface AssignedFeedSources {
  hw: ReturnType<typeof useStudentAssignments>['assignments'];
  ta: ReturnType<typeof useStudentTAAssignments>['assignments'];
  guided: GuidedRow[];
  activities: Awaited<ReturnType<typeof listActivityForStudent>>;
  items: ClassroomItem[];
}

/**
 * The pure merge behind the hook, exported so the disjoint-feed and
 * duplicate-assignment rules can be tested without standing up five queries.
 */
export function buildAssignedRows({
  hw,
  ta,
  guided,
  activities,
  items,
}: AssignedFeedSources): AssignedTodoRow[] {
  {
    const byIdentity = new Map<string, AssignedTodoRow>();
    const put = (row: AssignedTodoRow) => byIdentity.set(`${row.sourceTable}:${row.refId}`, row);

    for (const a of hw) {
      put({
        key: `hw-${a.id}`,
        kind: 'homework',
        refId: a.id,
        sourceTable: 'homework_assignments',
        title: a.set_title || 'Homework',
        subtitle: `${a.question_qids?.length ?? 0} questions${a.score != null ? ` · ${Math.round(a.score)}%` : ''}`,
        status: normalizeStatus(a.status),
        createdAt: a.created_at,
        dueAt: null,
        route: `/classroom/${encodeURIComponent(a.id)}`,
      });
    }

    for (const a of ta) {
      put({
        key: `ta-${a.id}`,
        kind: 'ta',
        refId: a.id,
        sourceTable: 'ta_assignments',
        title: a.title || 'From Joshua',
        subtitle: a.pdf_url ? 'PDF attached' : 'TA assignment',
        status: a.status === 'viewed' ? 'in_progress' : normalizeStatus(a.status),
        createdAt: a.assigned_at,
        dueAt: null,
        route: `/classroom/ta/${encodeURIComponent(a.id)}`,
      });
    }

    // Assigning the same drill twice writes two rows that render identically,
    // so they collapse to one. An open assignment always wins over a completed
    // one — otherwise finishing the older twin would hide work still owed —
    // and the newest wins within that.
    const bestByDrill = new Map<string, GuidedRow>();
    for (const g of guided) {
      const drillId = g.guided_drill_id ?? g.id;
      const held = bestByDrill.get(drillId);
      if (!held) {
        bestByDrill.set(drillId, g);
        continue;
      }
      const heldOpen = held.status !== 'completed';
      const thisOpen = g.status !== 'completed';
      if (thisOpen !== heldOpen) {
        if (thisOpen) bestByDrill.set(drillId, g);
        continue;
      }
      if (new Date(g.assigned_at).getTime() > new Date(held.assigned_at).getTime()) {
        bestByDrill.set(drillId, g);
      }
    }
    for (const g of bestByDrill.values()) {
      put({
        key: `g-${g.id}`,
        kind: 'guided',
        refId: g.id,
        sourceTable: 'guided_drill_assignments',
        title: g.guided_drill?.title || 'Guided drill',
        subtitle: `${g.guided_drill?.question_count ?? '?'} questions${g.guided_drill?.estimated_minutes ? ` · ${g.guided_drill.estimated_minutes} min` : ''}`,
        status: g.status === 'completed' ? 'completed' : g.status === 'assigned' ? 'assigned' : 'in_progress',
        createdAt: g.assigned_at,
        dueAt: null,
        route: `/guided/${encodeURIComponent(g.id)}`,
      });
    }

    for (const a of activities) {
      put({
        key: `act-${a.id}`,
        kind: 'activity',
        refId: a.id,
        sourceTable: 'activity_assignments',
        title: a.title || 'Activity',
        subtitle: a.subtitle || 'Activity',
        status: normalizeStatus(a.status),
        createdAt: a.created_at,
        dueAt: null,
        route: `/activities/${encodeURIComponent(a.id)}`,
      });
    }

    for (const item of items) {
      const kind = WORK_ITEM_KIND[item.type];
      if (!kind) continue; // notes and recaps are reading material, not work
      const route = resolveItemRoute(item);
      if (!route) continue;
      const sourceTable = item.source_table ?? 'classroom_items';
      const refId = item.source_id ?? item.id;
      const existing = byIdentity.get(`${sourceTable}:${refId}`);
      // Completion wins over the mirror. A student who finished the underlying
      // assignment must not see it come back because the classroom_items row it
      // was mirrored into still says "assigned" — that is why finished work kept
      // reappearing on Home.
      const itemStatus = normalizeStatus(item.status);
      const status =
        itemStatus === 'completed' || existing?.status === 'completed' ? 'completed' : itemStatus;
      byIdentity.set(`${sourceTable}:${refId}`, {
        key: `ci-${item.id}`,
        kind,
        refId,
        sourceTable,
        title: item.title || existing?.title || 'Assigned work',
        // The item carries no question count, so keep the source row's subtitle
        // when there is one.
        subtitle: existing?.subtitle ?? item.description ?? '',
        status,
        createdAt: item.created_at,
        dueAt: item.due_at,
        route,
        selfCompleting:
          (item.metadata_json as { kind?: string } | null)?.kind === 'timed_section',
        briefing: readSectionBriefing(item.metadata_json) ?? undefined,
      });
    }

    // Open work first, then completed; newest within each bucket.
    return [...byIdentity.values()].sort((x, y) => {
      const s = (x.status === 'completed' ? 1 : 0) - (y.status === 'completed' ? 1 : 0);
      if (s !== 0) return s;
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    });
  }
}

/** @see buildAssignedRows — this hook only supplies it with live queries. */
export function useAssignedTodoFeed(): {
  rows: AssignedTodoRow[];
  loading: boolean;
} {
  const { user } = useAuth();
  const { assignments: hw, loading: hwLoading } = useStudentAssignments();
  const { assignments: ta, loading: taLoading } = useStudentTAAssignments();
  const itemsQuery = useClassroomItems();

  const { data: guided = [], isLoading: guidedLoading } = useQuery<GuidedRow[]>({
    queryKey: ['todo-feed:guided', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => (await listGuidedForStudent(user!.id)) as GuidedRow[],
  });

  const { data: activities = [], isLoading: actLoading } = useQuery({
    queryKey: ['todo-feed:activity', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => listActivityForStudent(user!.id),
  });

  const items = itemsQuery.data ?? [];
  const rows = useMemo(
    () => buildAssignedRows({ hw, ta, guided, activities, items }),
    [hw, ta, guided, activities, items],
  );

  return {
    rows,
    loading: hwLoading || taLoading || guidedLoading || actLoading || itemsQuery.isLoading,
  };
}
