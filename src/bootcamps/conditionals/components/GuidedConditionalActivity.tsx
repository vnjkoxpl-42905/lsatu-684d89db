import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import GuidedDrillStart from '@/pages/GuidedDrillStart';
import DrillLaunchGate from '@/components/drill/DrillLaunchGate';
import { PracticeSetResults } from '@/components/drill/PracticeSetResults';
import { getGuidedDrillBySlug, listAssignmentsForStudent, type GuidedDrill, type GuidedDrillAssignment } from '@/lib/guidedDrills';
import { getLocalGuidedDrillBySlug } from '@/lib/guidedDrillsLocal';
import { listStandaloneDrillRuns, type StandaloneDrillRun } from '@/lib/drillRunLedger';
import { guidedSessionKey, guidedSessionToDrillSession } from '@/lib/guidedDrillSession';
import { launchDrill, parseDrillLaunch, type DrillLaunch } from '@/lib/drillLaunch';
import { conditionalGuidedSet } from './guidedConditionalCatalog';

const Drill = lazy(() => import('@/pages/Drill'));
type Assigned = GuidedDrillAssignment & { guided_drill?: GuidedDrill };
type History = { actorId: string; drill: GuidedDrill; assignments: Assigned[]; runs: StandaloneDrillRun[] };

export interface GuidedConditionalActivityProps {
  /** Native allowlisted slug. The parent route validates the conditional grant. */
  slug: string;
  backUrl: string;
  launchUrl: string;
  runUrl: string;
  view?: 'launch' | 'run';
  localOnly?: boolean;
}

/** Add transient runner params without discarding the parent assignment context. */
export function guidedCourseHref(base: string, additions: URLSearchParams) {
  const [path, query = ''] = base.split('?');
  const params = new URLSearchParams(query);
  additions.forEach((value, key) => params.set(key, value));
  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
}

/** Keep separate assignments separate, while displaying all owned work for this collection. */
export function conditionalGuidedHistory(drill: GuidedDrill, assignments: Assigned[], runs: StandaloneDrillRun[], userId: string) {
  const own = assignments.filter(row => row.student_id === userId && row.guided_drill?.slug === drill.slug);
  const keys = new Set([
    guidedSessionKey({ drillId: drill.id }),
    guidedSessionKey({ drillId: drill.slug }),
    guidedSessionKey({ slug: drill.slug }),
    ...own.map(row => guidedSessionKey({ assignmentId: row.id })),
  ]);
  return { assignments: own, runs: runs.filter(run => run.user_id === userId && keys.has(run.source_key)) };
}

export function GuidedConditionalActivity(props: GuidedConditionalActivityProps) {
  const set = conditionalGuidedSet(props.slug);
  if (!set) return <section className="cb-card"><h1>This guided activity is unavailable.</h1></section>;
  // A local preview must never instantiate the native runner or its account-writing effects.
  if (props.localOnly) return <section className="cb-card"><span className="cb-label">Guided LSAT questions</span><h1>{set.title}</h1><p>Read the rules, identify what follows, and explain why the tempting inference fails.</p><p>This preview does not load student work. Open your assigned bootcamp while signed in to practise with the question bank.</p></section>;
  return <GuidedConditionalAccountActivity {...props} slug={set.slug} />;
}

function GuidedConditionalAccountActivity({ slug, backUrl, launchUrl, runUrl, view = 'launch' }: GuidedConditionalActivityProps) {
  const { user } = useAuth();
  const { isLoading: bankLoading } = useQuestionBank();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setHistory(null);
    setError(false);
    if (!user) return;
    void Promise.all([getGuidedDrillBySlug(slug), listAssignmentsForStudent(user.id), listStandaloneDrillRuns(user.id)]).then(([remote, assignments, runs]) => {
      const drill = remote ?? getLocalGuidedDrillBySlug(slug);
      if (!drill) throw new Error('Unavailable guided definition');
      if (active) setHistory({ actorId: user.id, drill, ...conditionalGuidedHistory(drill, assignments as Assigned[], runs, user.id) });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [slug, user?.id, retry]);
  if (!user) return <section className="cb-card"><p>Sign in to open your guided practice.</p></section>;
  if (error) return <section className="cb-card"><h1>Your guided work could not load.</h1><p>Your earlier answers remain saved. Retry before starting another sitting.</p><button onClick={() => setRetry(value => value + 1)}>Retry</button></section>;
  if (!history || history.actorId !== user.id || history.drill.slug !== slug || bankLoading) return <p role="status">Loading your guided work…</p>;

  const selectedAssignmentId = params.get('guidedAssignment');
  const selectedAssignment = selectedAssignmentId ? history.assignments.find(row => row.id === selectedAssignmentId) : undefined;
  const runId = params.get('run');
  const run = runId ? history.runs.find(row => row.id === runId) : undefined;
  const legacySlugRun = run?.source_key === guidedSessionKey({ slug });
  const unavailable = (selectedAssignmentId && !selectedAssignment) || (runId && !run);
  const fail = <section className="cb-card"><h1>This saved guided work is unavailable.</h1><p>Return to this activity to choose work saved in your account.</p><button onClick={() => navigate(launchUrl)}>Return to activity</button></section>;
  if (unavailable) return fail;
  if (params.get('view') === 'results' || params.get('view') === 'history') {
    if (!run || (params.get('view') === 'results' && run.session.status !== 'completed') || (params.get('view') === 'history' && !legacySlugRun)) return fail;
    const session = guidedSessionToDrillSession(run.session);
    if (!session) return fail;
    return <>
      {legacySlugRun && <section className="cb-card"><h2>{run.session.status === 'completed' ? 'Earlier completed sitting' : 'Earlier unfinished sitting'}</h2><p>This earlier sitting is read-only. Its saved answers and original status stay unchanged. Open current practice to take another sitting.</p><button onClick={() => navigate(launchUrl)}>Open current practice</button></section>}
      <PracticeSetResults session={session} title={history.drill.title} subtitle={legacySlugRun && run.session.status !== 'completed' ? 'Unfinished earlier sitting. Saved answers only.' : 'Your saved guided sitting'} onBack={() => navigate(launchUrl)} />
    </>;
  }
  if (view === 'run') {
    let launch: DrillLaunch | null = null;
    const nativeParams = new URLSearchParams(params);
    nativeParams.delete('assignment');
    if (selectedAssignment) nativeParams.set('assignment', selectedAssignment.id);
    try { launch = parseDrillLaunch(nativeParams); } catch { /* A malformed launch cannot reach the runner. */ }
    if (!launch || launch.kind !== 'guided-drill') return fail;
    const guidedAssignmentId = launch.assignmentId;
    const assigned = guidedAssignmentId ? history.assignments.find(row => row.id === guidedAssignmentId) : undefined;
    const assignedDrillId = assigned?.guided_drill_id;
    if (launch.assignmentId && !assigned) return fail;
    if (launch.drillId && launch.drillId !== history.drill.id && launch.drillId !== history.drill.slug && launch.drillId !== assignedDrillId) return fail;
    const expectedKey = guidedSessionKey(assigned ? { assignmentId: assigned.id } : { drillId: launch.drillId });
    if (run && run.source_key !== expectedKey) return fail;
    // Return context is reconstructed locally; a pasted returnTo cannot change the shell.
    launch = { ...launch, options: { ...launch.options, returnTo: launchUrl } };
    return <Suspense fallback={<p role="status">Opening guided practice…</p>}><DrillLaunchGate launch={launch}><Drill /></DrillLaunchGate></Suspense>;
  }
  const begin = (launch: DrillLaunch, existingRunId?: string) => {
    const query = new URLSearchParams(launchDrill(launch));
    query.delete('assignment');
    if (launch.kind === 'guided-drill' && launch.assignmentId) query.set('guidedAssignment', launch.assignmentId);
    if (selectedAssignment) query.set('guidedAssignment', selectedAssignment.id);
    if (existingRunId) query.set('run', existingRunId);
    navigate(guidedCourseHref(runUrl, query));
  };
  return <div className="cb-guided-activity">
    <button onClick={() => navigate(backUrl)}>Back to conditional practice</button>
    <GuidedDrillStart key={`${slug}:${selectedAssignment?.id ?? 'direct'}`} slug={slug} assignmentId={selectedAssignment?.id} onReturn={() => navigate(backUrl)} launchReturnTo={launchUrl} onLaunch={begin} onResults={id => navigate(guidedCourseHref(launchUrl, new URLSearchParams({ view: 'results', run: id })))} />
    {!!history.assignments.length && <section className="cb-card"><h2>Your assigned practice</h2><p>Open an earlier assignment to see its saved place or completed work.</p><div className="cb-guided-history">{history.assignments.map(assigned => <article key={assigned.id}><strong>{assigned.status === 'completed' ? 'Completed assignment' : 'Assigned practice'}</strong><p>{assigned.assigned_at ? new Date(assigned.assigned_at).toLocaleDateString() : history.drill.title}</p><button onClick={() => navigate(guidedCourseHref(launchUrl, new URLSearchParams({ guidedAssignment: assigned.id })))}>Open assigned work</button></article>)}</div></section>}
    {!!history.runs.length && <section className="cb-card"><h2>Your earlier work</h2><p>Separate assignments and practice sittings keep their own answers.</p><div className="cb-guided-history">{history.runs.map(saved => {
      const assignment = history.assignments.find(row => saved.source_key === guidedSessionKey({ assignmentId: row.id }));
      const completed = saved.session.status === 'completed';
      const legacy = saved.source_key === guidedSessionKey({ slug });
      const query = new URLSearchParams({ run: saved.id });
      if (completed) query.set('view', 'results');
      else if (legacy) query.set('view', 'history');
      if (assignment) query.set('guidedAssignment', assignment.id);
      return <article key={saved.id}><strong>{completed ? 'Completed sitting' : legacy ? 'Earlier unfinished sitting' : 'Continue your sitting'}</strong><p>{new Date(saved.updated_at).toLocaleDateString()} · {saved.session.attempts.length} answered · {assignment ? 'Assigned practice' : 'Additional practice'}</p>{legacy && !completed && <p>This earlier sitting can be reviewed. Start another sitting from current practice.</p>}<button onClick={() => {
        if (completed || legacy) { navigate(guidedCourseHref(launchUrl, query)); return; }
        const drillId = saved.source_key.startsWith('guided::drill:') ? saved.source_key.slice('guided::drill:'.length) : history.drill.id;
        const launch: DrillLaunch = { kind: 'guided-drill', drillId, assignmentId: assignment?.id, options: { returnTo: launchUrl, label: history.drill.title } };
        const next = new URLSearchParams(launchDrill(launch));
        next.delete('assignment');
        if (assignment) next.set('guidedAssignment', assignment.id);
        next.set('run', saved.id);
        navigate(guidedCourseHref(runUrl, next));
      }}>{completed ? 'Results and review' : legacy ? 'View saved work' : 'Continue'}</button></article>;
    })}</div></section>}
  </div>;
}
