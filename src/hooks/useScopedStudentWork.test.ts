import { describe, expect, it } from 'vitest';
import { projectScopedOwnedRows, projectScopedActivityStatuses } from './useScopedStudentWork';

function ready<T>(data: T) { return { state: 'ready' as const, data }; }
function failed() { return { state: 'failed' as const, error: new Error('read failed') }; }

function sources(over: Record<string, unknown> = {}) {
  return {
    actorId: 'teacher-1',
    studentId: 'student-1',
    guided: ready([
      { id: 'guided-old', guided_drill_id: 'same-drill', assigned_at: '2026-09-27T00:00:00Z', status: 'assigned', completed_at: null, guided_drill: { title: 'Reasoning drill', question_count: 5 } },
      { id: 'guided-new', guided_drill_id: 'same-drill', assigned_at: '2026-09-28T00:00:00Z', status: 'completed', completed_at: '2026-09-28T01:00:00Z', guided_drill: { title: 'Reasoning drill', question_count: 5 } },
    ]),
    activities: ready([
      { id: 'activity-owned', title: 'Spot the relationship', subtitle: null, status: 'assigned', created_at: '2026-09-29T00:00:00Z', completed_at: null },
      { id: 'activity-mirrored', title: 'Find the premise', subtitle: null, status: 'assigned', created_at: '2026-09-28T00:00:00Z', completed_at: null },
    ]),
    items: ready([
      { id: 'mirror-1', type: 'activity', source_table: 'activity_assignments', source_id: 'activity-mirrored', status: 'assigned', title: 'Find the premise', created_at: '2026-09-28T00:00:00Z', due_at: null, visible_to_student: true },
    ]),
    assignmentEvidence: ready({ guided: {}, homework: {} }),
    activityEvidence: ready(new Set<string>()),
    ...over,
  } as never;
}

describe('selected-student owned Work projection', () => {
  it('omits revoked issued sources and their retained mirrors from actionable work', () => {
    const data = sources({ activities: ready([
      { id: 'activity-owned', title: 'Revoked', status: 'in_progress', created_at: '2026-09-29T00:00:00Z', revoked_at: '2026-09-30T00:00:00Z' },
      { id: 'activity-mirrored', title: 'Also revoked', status: 'completed', created_at: '2026-09-29T00:00:00Z', revoked_at: '2026-09-30T00:00:00Z' },
    ]) });
    expect(projectScopedOwnedRows(data).rows.map(row => row.refId)).toEqual(['guided-old', 'guided-new']);
    expect(projectScopedActivityStatuses(data)).toEqual({});
  });
  it('uses issued Activity source and saved responses instead of classroom mirror status', () => {
    const status = projectScopedActivityStatuses(sources({
      activities: ready([
        { id: 'historical', status: 'completed', completed_at: null },
        { id: 'answered', status: 'assigned', completed_at: null },
        { id: 'finished', status: 'completed', completed_at: '2026-09-30T01:00:00Z' },
      ]),
      activityEvidence: ready(new Set(['answered'])),
    }));
    expect(status).toEqual({ historical: 'assigned', answered: 'in_progress', finished: 'completed' });
    expect(status['activity-mirrored']).toBeUndefined();
  });

  it('does not turn a failed Activity source or response read into assigned progress', () => {
    expect(projectScopedActivityStatuses(sources({ activities: failed() }))).toEqual({});
    expect(projectScopedActivityStatuses(sources({ activityEvidence: failed() }))).toEqual({});
  });

  it('keeps repeated guided assignment IDs and omits only the Activity mirror already in Hub', () => {
    const { rows, failedSources } = projectScopedOwnedRows(sources());
    expect(failedSources).toEqual([]);
    expect(rows.map((row) => row.refId)).toEqual(['activity-owned', 'guided-old', 'guided-new']);
    expect(rows.map((row) => row.sourceTable)).toEqual([
      'activity_assignments', 'guided_drill_assignments', 'guided_drill_assignments',
    ]);
    expect(rows.at(-1)?.status).toBe('completed');
  });

  it('keeps available assignments while naming failed sources and progress evidence', () => {
    const { rows, failedSources } = projectScopedOwnedRows(sources({
      activities: failed(),
      assignmentEvidence: failed(),
    }));
    expect(rows.map((row) => row.refId)).toEqual(['guided-old', 'guided-new']);
    expect(failedSources).toEqual(['Activity assignments', 'saved guided progress']);
  });

  it('does not hide a source assignment because a classroom item points at its content ID', () => {
    const { rows } = projectScopedOwnedRows(sources({
      items: ready([{ id: 'mirror-content', type: 'activity', source_table: 'activity_assignments', source_id: 'different-assignment', title: 'Other', status: 'assigned', created_at: '2026-09-29T00:00:00Z', due_at: null, visible_to_student: true }]),
    }));
    expect(rows.map((row) => row.refId)).toContain('activity-owned');
  });

  it('leaves a hidden classroom mirror in Hub without duplicating its assignment in the owned panel', () => {
    const { rows } = projectScopedOwnedRows(sources({
      items: ready([{ id: 'hidden-mirror', type: 'activity', source_table: 'activity_assignments', source_id: 'activity-owned', visible_to_student: false }]),
    }));
    expect(rows.map((row) => row.refId)).not.toContain('activity-owned');
    expect(rows.map((row) => row.refId)).toContain('activity-mirrored');
  });
});


it('names rejected saved records and marks only uncertain untouched assignments', () => {
  const result = projectScopedOwnedRows(sources({ assignmentEvidence: ready({ guided: {}, homework: {}, diagnostics: [
    { source: 'practice_sessions', family: 'guided', reason: 'invalid_record', assignmentId: 'guided-old' },
    { source: 'drill_runs', family: 'guided', reason: 'read_failed' },
  ] }) }));
  expect(result.failedSources).toEqual(['saved assignment sessions', 'saved guided sittings']);
  expect(result.rows.find(row => row.refId === 'guided-old')?.progressUnverified).toBe(true);
  expect(result.rows.find(row => row.refId === 'guided-new')?.progressUnverified).toBeUndefined();
});

it('keeps valid saved answers visible despite a missing independent source', () => {
  const result = projectScopedOwnedRows(sources({ assignmentEvidence: ready({ guided: {
    'guided-old': { sessionId: 'saved', savedAnswerCount: 1, status: 'in_progress' },
  }, homework: {}, diagnostics: [{ source: 'drill_runs', family: 'guided', reason: 'read_failed' }] }) }));
  expect(result.rows.find(row => row.refId === 'guided-old')).toMatchObject({ status: 'in_progress' });
  expect(result.rows.find(row => row.refId === 'guided-old')?.progressUnverified).toBeUndefined();
});
