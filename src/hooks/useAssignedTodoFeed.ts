import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentAssignments, useStudentTAAssignments } from '@/hooks/useStudentAssignments';
import { useClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import type { WeeklyPlanItem } from '@/hooks/useWeeklyPlan';
import { supabase } from '@/integrations/supabase/client';
import { resolveItemRoute } from '@/lib/classroomItems';
import { readSectionBriefing, type SectionBriefing } from '@/lib/sectionBriefing';
import { singleSectionOf } from '@/lib/drillRunSpec';
import { sectionDirectionsRoute } from '@/lib/sectionDirections';
import { mergeWorkSections, sectionFromCitation, sectionFromMetadata, sectionFromQuestionIds, type AssignedWorkSection } from '@/lib/assignedWorkSection';
import { listAssignmentsForStudent as listGuidedForStudent, type GuidedDrill, type GuidedDrillAssignment } from '@/lib/guidedDrills';
import { listStudentAssignments as listActivityForStudent } from '@/features/activity-centre/api/activitiesClient';
import { activityWorkStatus, guidedWorkStatus, homeworkWorkStatus, studentWorkKey, teacherWorkStatus } from '@/lib/studentWorkProjection';
import { loadActivityWorkEvidence, loadAssignmentWorkEvidence, type GuidedWorkEvidence, type HomeworkWorkEvidence, type AssignmentWorkEvidence, assignmentEvidenceWarnings, assignmentProgressUnverified } from '@/lib/studentWorkEvidence';

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
  progressUnverified?: boolean;
  createdAt: string;
  /** Due date, when a classroom_items row carries one. */
  dueAt: string | null;
  route: string;
  /** Source identity/content evidence only. Unknown work remains in general work. */
  workSection?: AssignedWorkSection;
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
const EMPTY_ACTIVITY_EVIDENCE = new Set<string>();

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
  guidedEvidence?: Record<string, GuidedWorkEvidence>;
  homeworkEvidence?: Record<string, HomeworkWorkEvidence>;
  activityEvidence?: ReadonlySet<string>;
  assignmentWorkEvidence?: AssignmentWorkEvidence;
  assignmentEvidenceUnavailable?: boolean;
  activityEvidenceUnavailable?: boolean;
  /** Undefined until the source read succeeds; plan mirrors cannot stand in for it. */
  weeklyPlanStatusById?: Readonly<Record<string, WeeklyPlanItem['status']>>;
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
  guidedEvidence = {},
  homeworkEvidence = {},
  activityEvidence = EMPTY_ACTIVITY_EVIDENCE,
  weeklyPlanStatusById,
  assignmentWorkEvidence,
  assignmentEvidenceUnavailable = false,
  activityEvidenceUnavailable = false,
}: AssignedFeedSources): AssignedTodoRow[] {
  {
    const byIdentity = new Map<string, AssignedTodoRow>();
    const put = (row: AssignedTodoRow) => byIdentity.set(studentWorkKey({ sourceTable: row.sourceTable, assignmentId: row.refId }), row);

    for (const a of hw) {
      // A set that is exactly one PrepTest section is sat, not worked through:
      // it opens on the section's directions page and the clock does the
      // rest. Finishing the run completes the row, so it must never carry a
      // "Mark done" the student could press without sitting it.
      const section = singleSectionOf(a.question_qids ?? []);
      put({
        key: `hw-${a.id}`,
        kind: 'homework',
        refId: a.id,
        sourceTable: 'homework_assignments',
        title: a.set_title || 'Homework',
        subtitle: `${a.question_qids?.length ?? 0} questions${a.score != null ? ` · ${Math.round(a.score)}%` : ''}`,
        status: homeworkWorkStatus(a, homeworkEvidence[a.id]),
        createdAt: a.created_at,
        dueAt: null,
        route: section ? sectionDirectionsRoute(a.id) : `/classroom/${encodeURIComponent(a.id)}`,
        selfCompleting: !!section,
        workSection: sectionFromQuestionIds(a.question_qids),
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
        status: teacherWorkStatus(a),
        createdAt: a.assigned_at,
        dueAt: null,
        route: `/classroom/ta/${encodeURIComponent(a.id)}`,
      });
    }

    // Preserve every assignment instance, even when the teacher issued the
    // same drill twice. The assignment ID, not guided_drill_id, is identity.
    for (const g of guided) {
      put({
        key: `g-${g.id}`,
        kind: 'guided',
        refId: g.id,
        sourceTable: 'guided_drill_assignments',
        title: g.guided_drill?.title || 'Guided drill',
        subtitle: `${g.guided_drill?.question_count ?? '?'} questions${g.guided_drill?.estimated_minutes ? ` · ${g.guided_drill.estimated_minutes} min` : ''}`,
        status: guidedWorkStatus(g, guidedEvidence[g.id]),
        createdAt: g.assigned_at,
        dueAt: null,
        route: `/guided/${encodeURIComponent(g.id)}`,
        workSection: sectionFromQuestionIds(g.question_qids?.length ? g.question_qids : g.guided_drill?.question_qids),
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
        status: activityWorkStatus(a, activityEvidence.has(a.id)),
        createdAt: a.created_at,
        dueAt: null,
        route: `/activities/${encodeURIComponent(a.id)}`,
        workSection: mergeWorkSections(sectionFromCitation(a.source_section), sectionFromMetadata(a.instructions)),
      });
    }

    for (const item of items) {
      const kind = WORK_ITEM_KIND[item.type];
      if (!kind) continue; // notes and recaps are reading material, not work
      // The plan item can be checked off independently of its classroom mirror.
      // A missing source (including a failed or pending read) cannot certify a
      // status, and a skipped task no longer belongs on an assigned-work list.
      const planStatus = kind === 'plan' && item.source_table === 'weekly_plan_items' && item.source_id
        ? weeklyPlanStatusById?.[item.source_id]
        : undefined;
      if (kind === 'plan' && (!planStatus || planStatus === 'skipped')) continue;
      const route = resolveItemRoute(item);
      if (!route) continue;
      const sourceTable = item.source_table ?? 'classroom_items';
      const refId = item.source_id ?? item.id;
      const identity = studentWorkKey({ sourceTable, assignmentId: refId });
      const existing = byIdentity.get(identity);
      // Completion wins over the mirror. A student who finished the underlying
      // assignment must not see it come back because the classroom_items row it
      // was mirrored into still says "assigned" — that is why finished work kept
      // reappearing on Home.
      const itemStatus = normalizeStatus(item.status);
      // Guided and written teacher assignments have their own persisted
      // completion/progress evidence. A stale or manually updated mirror must
      // not promote them merely because the page was opened or a button was
      // pressed outside the actual work flow.
      const sourceOwnsStatus = existing && (
        sourceTable === 'guided_drill_assignments' ||
        sourceTable === 'homework_assignments' ||
        sourceTable === 'ta_assignments' ||
        sourceTable === 'activity_assignments'
      );
      const status = kind === 'plan' && planStatus && planStatus !== 'skipped'
        ? planStatus
        : sourceOwnsStatus
        ? existing.status
        : itemStatus === 'completed' || existing?.status === 'completed' ? 'completed' : itemStatus;
      byIdentity.set(identity, {
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
        // The mirror row was written before the section rule existed, so the
        // source row's directions route wins over the item's classroom link.
        route: existing?.selfCompleting ? existing.route : route,
        selfCompleting:
          (item.metadata_json as { kind?: string } | null)?.kind === 'timed_section' ||
          !!existing?.selfCompleting,
        briefing: readSectionBriefing(item.metadata_json) ?? undefined,
        workSection: mergeWorkSections(existing?.workSection, sectionFromMetadata(item.metadata_json)),
      });
    }

    // Open work first, then completed; newest within each bucket.
    return [...byIdentity.values()].map(row => {
      const family = row.sourceTable === 'guided_drill_assignments' ? 'guided' : row.sourceTable === 'homework_assignments' ? 'homework' : null;
      const uncertain = family
        ? assignmentEvidenceUnavailable || (assignmentWorkEvidence && assignmentProgressUnverified(assignmentWorkEvidence, family, row.refId))
        : row.sourceTable === 'activity_assignments' && activityEvidenceUnavailable;
      return uncertain && row.status === 'assigned' ? { ...row, progressUnverified: true } : row;
    }).sort((x, y) => {
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
  /** A read failed. Never report "nothing assigned" on a failed read. */
  failed: boolean;
  evidenceWarnings: string[];
  retry: () => void;
} {
  const { user } = useAuth();
  const userId = user?.id;
  const { assignments: hw, loading: hwLoading, error: hwError, refresh: hwRefresh } = useStudentAssignments();
  const { assignments: ta, loading: taLoading, error: taError, refresh: taRefresh } = useStudentTAAssignments();
  const itemsQuery = useClassroomItems();
  const hasPlanMirrors = itemsQuery.data?.some((item) => item.type === 'weekly_plan_task') ?? false;

  const { data: weeklyPlanStatusById, isFetching: planFetching, isError: planError, refetch: planRefetch } = useQuery({
    queryKey: ['weekly-plan', 'assigned-status', userId],
    enabled: !!userId && hasPlanMirrors,
    staleTime: 0,
    queryFn: async (): Promise<Record<string, WeeklyPlanItem['status']>> => {
      const { data, error } = await supabase
        .from('weekly_plan_items')
        .select('id,status')
        .eq('student_id', userId!);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map(({ id, status }) => [id, status as WeeklyPlanItem['status']]));
    },
  });

  const { data: guided = [], isLoading: guidedLoading, isError: guidedError, refetch: guidedRefetch } = useQuery<GuidedRow[]>({
    queryKey: ['todo-feed:guided', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => (await listGuidedForStudent(user!.id)) as GuidedRow[],
  });

  const { data: activities = [], isLoading: actLoading, isError: actError, refetch: actRefetch } = useQuery({
    queryKey: ['todo-feed:activity', user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => listActivityForStudent(user!.id),
  });

  const { data: assignmentEvidence, isLoading: evidenceLoading, isError: evidenceError, refetch: evidenceRefetch } = useQuery({
    queryKey: ['todo-feed:assignment-evidence', user?.id],
    enabled: !!user,
    staleTime: 5_000,
    queryFn: () => loadAssignmentWorkEvidence(user!.id),
  });
  const guidedEvidence = assignmentEvidence?.guided;
  const homeworkEvidence = assignmentEvidence?.homework;

  const activityIds = useMemo(() => activities.map((activity) => activity.id), [activities]);
  const { data: activityEvidence = EMPTY_ACTIVITY_EVIDENCE, isLoading: activityEvidenceLoading, isError: activityEvidenceError, refetch: activityEvidenceRefetch } = useQuery({
    queryKey: ['todo-feed:activity-evidence', user?.id, activityIds],
    enabled: !!user && !actLoading,
    staleTime: 5_000,
    queryFn: () => loadActivityWorkEvidence(user!.id, activityIds),
  });

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const rows = useMemo(
    () => buildAssignedRows({ hw, ta, guided, activities, items, guidedEvidence, homeworkEvidence, activityEvidence, weeklyPlanStatusById, assignmentWorkEvidence: assignmentEvidence, assignmentEvidenceUnavailable: evidenceError || !assignmentEvidence, activityEvidenceUnavailable: activityEvidenceError || activityEvidenceLoading }),
    [hw, ta, guided, activities, items, guidedEvidence, homeworkEvidence, activityEvidence, weeklyPlanStatusById, assignmentEvidence, evidenceError, activityEvidenceError, activityEvidenceLoading],
  );

  const retry = useMemo(
    () => () => {
      void hwRefresh();
      void taRefresh();
      void guidedRefetch();
      void evidenceRefetch();
      void activityEvidenceRefetch();
      void actRefetch();
      void itemsQuery.refetch();
      void planRefetch();
    },
    [hwRefresh, taRefresh, guidedRefetch, evidenceRefetch, actRefetch, activityEvidenceRefetch, itemsQuery, planRefetch],
  );

  const evidenceWarnings = assignmentEvidenceWarnings(assignmentEvidence);
  return {
    rows,
    evidenceWarnings,
    loading: rows.length === 0 && (hwLoading || taLoading || guidedLoading || evidenceLoading || actLoading || activityEvidenceLoading || itemsQuery.isLoading || (hasPlanMirrors && !weeklyPlanStatusById && !planError && planFetching)),
    failed: evidenceWarnings.length > 0 || !!hwError || !!taError || guidedError || evidenceError || actError || activityEvidenceError || itemsQuery.isError || planError,
    retry,
  };
}
