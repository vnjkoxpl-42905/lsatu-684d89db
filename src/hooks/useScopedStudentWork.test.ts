import { describe, expect, it } from 'vitest';
import { projectScopedOwnedRows } from './useScopedStudentWork';

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
