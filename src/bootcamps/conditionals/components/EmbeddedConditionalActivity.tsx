import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ActivityRunner } from '@/features/activity-centre/components/ActivityRunner';
import { ConditionalPracticeRoom } from '@/features/activity-centre/conditionals/ConditionalPractice';
import { isConditionalRephraseRun, loadPracticeRuns, practiceSaveMessage, readCachedRuns, syncPendingPractice, type ConditionalPracticeTiming, type PracticeRun } from '@/features/activity-centre/conditionals/practiceStore';
import { useStudentActivities, useStudentActivity } from '@/features/activity-centre/hooks/useStudentActivities';
import type { ActivityAssignment, ActivityInstructions, ActivityItem } from '@/features/activity-centre/api/types';
import rephrase from '@/features/activity-centre/content/conditional-rephrase.json';

export interface EmbeddedConditionalActivityProps {
  activity: 'rephrase' | 'linking' | 'missing-links' | 'must-be-true';
  userId: string;
  backUrl: string;
  /** The host resolves these IDs from a validated assignment selection. Existing runs keep their own snapshots. */
  selectedItemOrders?: readonly number[];
  selectedQuestionIds?: readonly string[];
  allowedItemOrders?: readonly number[];
  allowedQuestionIds?: readonly string[];
  selectionLabel?: string;
  localOnly?: boolean;
  timing?: ConditionalPracticeTiming;
}

/** One player per collection, shared with standalone assignments and their history. */
export function EmbeddedConditionalActivity(props: EmbeddedConditionalActivityProps) {
  if (props.activity !== 'rephrase') return <ConditionalPracticeRoom key={`${props.userId}:${props.activity}`} userId={props.userId} localOnly={props.localOnly}
    embeddedMode={props.activity === 'missing-links' ? 'missing-link' : props.activity}
    selectedQuestionIds={props.selectedQuestionIds} allowedQuestionIds={props.allowedQuestionIds} backUrl={props.backUrl} selectionLabel={props.selectionLabel} />;
  return <EmbeddedRephrase key={props.userId} {...props} />;
}

function EmbeddedRephrase({ userId, backUrl, selectedItemOrders, allowedItemOrders, selectionLabel, localOnly = false, timing = 'progressive' }: EmbeddedConditionalActivityProps) {
  const [params, setParams] = useSearchParams();
  const [runs, setRuns] = useState<PracticeRun[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const ordersKey = selectedItemOrders?.join(',') ?? 'all';
  const definition = useMemo<ActivityAssignment>(() => ({
    id: `conditional-rephrase-practice:${ordersKey}:${timing}`,
    activity_id: '7946f46b-e7f8-4c60-b405-4ece9c409deb', student_id: userId,
    title: 'Conditional Rephrase', subtitle: selectionLabel ?? rephrase.subtitle,
    instructions: { ...rephrase.instructions, task: 'Diagram the statement on paper. Then choose the pair with the correct conditional and its contrapositive.' } as ActivityInstructions, item_format: 'mcq',
    items: (rephrase.items as ActivityItem[]).filter(item => (!selectedItemOrders || selectedItemOrders.includes(item.order)) && (!allowedItemOrders || allowedItemOrders.includes(item.order))),
    status: 'assigned', score: null, started_at: null, completed_at: null,
    assigned_by: '', class_id: '', created_at: '',
  }), [userId, ordersKey, allowedItemOrders?.join(','), selectionLabel, timing]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const permitted = (run: PracticeRun) => isConditionalRephraseRun(run) && (!allowedItemOrders || run.general!.items.every(item => allowedItemOrders.includes(item.order)));
        const local = readCachedRuns(userId).filter(permitted);
        if (alive) setRuns(local);
        if (localOnly) return;
        await syncPendingPractice(userId);
        const saved = (await loadPracticeRuns(userId)).filter(permitted);
        if (alive) { setRuns(saved); setHistoryError(null); }
      } catch (error) { if (alive) setHistoryError(practiceSaveMessage(error)); }
    };
    void refresh();
    return () => { alive = false; };
  }, [userId, localOnly, params.get('practiceRun'), allowedItemOrders?.join(',')]);
  const openPractice = (id: string) => {
    const next = new URLSearchParams(params);
    next.delete('activityAssignment'); next.set('practiceRun', id); setParams(next);
  };
  const assignedId = params.get('activityAssignment');
  const hasRun = params.has('practiceRun');
  if (assignedId && !localOnly) return allowedItemOrders ? <ScopedOwnedRephraseAssignment assignmentId={assignedId} userId={userId} backUrl={backUrl} allowedItemOrders={allowedItemOrders} /> : <OwnedRephraseAssignment assignmentId={assignedId} backUrl={backUrl} />;
  return <section className="oc-embedded-activity" aria-label="Conditional Rephrase">
    <Link className="oc-back" to={backUrl}>Back to conditional practice</Link>
    {definition.items.length ? <ActivityRunner practiceDefinition={definition} practiceUserId={userId} localOnly={localOnly} backUrl={backUrl} timing={timing} allowedItemOrders={allowedItemOrders} />
      : <p role="alert">No questions match this selection. Choose another topic to begin.</p>}
    {!hasRun && <section className="oc-activity-history"><h2>Your Conditional Rephrase work</h2>
      {historyError && <p role="alert">{historyError}</p>}
      {!localOnly && <RephraseAssignmentHistory onOpen={id => { const next = new URLSearchParams(params); next.delete('practiceRun'); next.set('activityAssignment', id); setParams(next); }} />}
      {runs.length ? runs.map(run => <article key={run.id}><h3>Practice session</h3><p>{run.createdAt.slice(0, 10)} · {run.stage === 'done' ? 'Completed' : 'In progress'} · {run.general!.items.length} questions</p><button className="oc-action" onClick={() => openPractice(run.id)}>{run.stage === 'done' ? 'Review practice' : 'Continue practice'}</button></article>) : <p>No saved practice sessions yet.</p>}
    </section>}
  </section>;
}

function ScopedOwnedRephraseAssignment({ assignmentId, userId, backUrl, allowedItemOrders }: { assignmentId: string; userId: string; backUrl: string; allowedItemOrders: readonly number[] }) {
  const { assignment, loading, error } = useStudentActivity(assignmentId);
  if (loading) return <p>Loading your assigned work...</p>;
  if (error) return <p role="alert">Your assigned work could not be loaded. Reload to retry.</p>;
  if (!assignment || assignment.student_id !== userId || assignment.activity_id !== '7946f46b-e7f8-4c60-b405-4ece9c409deb' || assignment.revoked_at || assignment.items.some(item => !allowedItemOrders.includes(item.order))) return <p role="alert">This saved assignment includes work outside this selection. Open it from your full conditional bootcamp or original activity.</p>;
  return <ActivityRunner assignmentId={assignmentId} backUrl={backUrl} allowedItemOrders={allowedItemOrders} />;
}

function RephraseAssignmentHistory({ onOpen }: { onOpen: (id: string) => void }) {
  const { assignments, loading, error } = useStudentActivities();
  const rows = assignments.filter(row => row.activity_id === '7946f46b-e7f8-4c60-b405-4ece9c409deb' && !row.revoked_at);
  if (loading) return <p>Loading assigned work...</p>;
  if (error) return <p role="alert">Your assigned work could not be loaded. Reload to retry.</p>;
  return <>{rows.map(row => <article key={row.id}><h3>{row.title}</h3><p>Assigned work · {row.status === 'completed' ? 'Completed' : 'In progress'}{row.completed_at ? ` · ${row.completed_at.slice(0, 10)}` : ''}</p><button className="oc-action" onClick={() => onOpen(row.id)}>{row.status === 'completed' ? 'Review assigned work' : 'Continue assigned work'}</button></article>)}</>;
}

function OwnedRephraseAssignment({ assignmentId, backUrl }: { assignmentId: string; backUrl: string }) {
  const { assignments, loading, error } = useStudentActivities();
  if (loading) return <p>Loading your assigned work...</p>;
  if (error) return <p role="alert">Your assigned work could not be loaded. Reload to retry.</p>;
  if (!assignments.some(row => row.id === assignmentId && row.activity_id === '7946f46b-e7f8-4c60-b405-4ece9c409deb' && !row.revoked_at)) return <p role="alert">This Conditional Rephrase assignment is not available for this account.</p>;
  return <ActivityRunner assignmentId={assignmentId} backUrl={backUrl} />;
}
