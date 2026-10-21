import { useQuery } from '@tanstack/react-query';
import { useStudentSubjectScope } from '@/hooks/useStudentSubjectScope';
import { buildAssignedRows, type AssignedFeedSources, type AssignedTodoRow } from '@/hooks/useAssignedTodoFeed';
import { loadScopedOwnedAssignmentSources } from '@/lib/studentScopedWork';
import { studentScopeQueryKey } from '@/lib/studentSubjectScope';

type OwnedSources = Awaited<ReturnType<typeof loadScopedOwnedAssignmentSources>>;

/** Preserve the issued assignment ID, and let an existing Hub mirror keep its Unassign control. */
export function projectScopedOwnedRows(sources: OwnedSources): {
  rows: AssignedTodoRow[];
  failedSources: string[];
} {
  const { guided, activities, items, assignmentEvidence, activityEvidence } = sources;
  const failedSources = [
    guided.state === 'failed' && 'guided assignments',
    activities.state === 'failed' && 'Activity assignments',
    items.state === 'failed' && 'classroom mirrors',
    assignmentEvidence.state === 'failed' && 'saved guided progress',
    activityEvidence?.state === 'failed' && 'saved Activity responses',
  ].filter((name): name is string => typeof name === 'string');

  const ownedGuided = guided.state === 'ready' ? guided.data : [];
  const ownedActivities = activities.state === 'ready' ? activities.data : [];
  const classroomItems = items.state === 'ready' ? items.data : [];
  const ownedIds = new Set([
    ...ownedGuided.map((row) => `guided_drill_assignments:${row.id}`),
    ...ownedActivities.map((row) => `activity_assignments:${row.id}`),
  ]);
  const mirroredInHub = new Set(classroomItems
    .filter((item) => item.type !== 'drill' && item.type !== 'homework' && item.source_table && item.source_id)
    .map((item) => `${item.source_table}:${item.source_id}`));

  const rows = buildAssignedRows({
    hw: [],
    ta: [],
    guided: ownedGuided as AssignedFeedSources['guided'],
    activities: ownedActivities,
    items: classroomItems.filter((item) => item.visible_to_student),
    guidedEvidence: assignmentEvidence.state === 'ready' ? assignmentEvidence.data.guided : {},
    activityEvidence: activityEvidence?.state === 'ready' ? activityEvidence.data : new Set<string>(),
  }).filter((row) => ownedIds.has(`${row.sourceTable}:${row.refId}`) && !mirroredInHub.has(`${row.sourceTable}:${row.refId}`));
  return { rows, failedSources };
}

/**
 * Loads the same assignment sources for a student or Joshua's selected-student
 * view. Cache keys include both actor and subject so changing the selection
 * cannot display the previous student's records.
 */
export function useScopedStudentWork(selectedStudentId?: string | null) {
  const resolution = useStudentSubjectScope(selectedStudentId);
  const scope = resolution.state === 'ready' ? resolution.scope : null;
  const query = useQuery({
    queryKey: scope ? studentScopeQueryKey(scope) : ['student-work-scope', 'inactive'],
    enabled: !!scope,
    staleTime: 30_000,
    queryFn: () => loadScopedOwnedAssignmentSources(scope!),
  });
  const projected = query.data ? projectScopedOwnedRows(query.data) : { rows: [], failedSources: [] };
  return {
    resolution,
    rows: scope ? projected.rows : [],
    failedSources: scope ? projected.failedSources : [],
    loading: resolution.state === 'loading' || (!!scope && query.isPending),
    error: query.error,
    refresh: query.refetch,
  };
}
