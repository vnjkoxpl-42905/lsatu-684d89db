import { type ReactNode } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import LockedModule from "@/components/LockedModule";
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import { loadPracticeTestRun } from "@/lib/practiceTest";
import { classroomItemMatchesBootcamp } from '@/lib/bootcamps';
import { getPracticePool } from '@/bootcamps/main-conclusion/data/practiceDrillPools';
import {
  launchFromRouteState,
  parseDrillLaunch,
  type DrillHandoverState,
  type DrillLaunch,
  type PtLegRef,
} from "@/lib/drillLaunch";

/**
 * Per item, never per feature.
 *
 * A student on Tier 3 has the floor and whatever Joshua assigns. Assigning one
 * activity must open that activity, not the Activity Centre; assigning one
 * PrepTest must open that sitting, not the Testing Centre. So an assignment
 * authorises its own runner: this gate lets the child render when the feature
 * switch is on OR when `authorize` proves the signed-in student owns the
 * specific thing in the route. Otherwise it falls through to the ordinary
 * ProtectedRoute, which shows the locked state.
 *
 * Same shape as BootcampGate, which has done this for bootcamps all along.
 * Route-level only: RLS already scopes every assignment table by student_id,
 * so this decides what a student is shown, not what they can read.
 */
export function AssignmentGate({
  flag,
  authKey,
  authorize,
  assignmentOnly = false,
  children,
}: {
  flag: PermissionFlag | readonly PermissionFlag[];
  /** Stable name for the thing being authorised, for caching. null = nothing to authorise. */
  authKey: string | null;
  authorize: (userId: string) => Promise<boolean>;
  assignmentOnly?: boolean;
  children: ReactNode;
}) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const flags = (Array.isArray(flag) ? flag : [flag]) as PermissionFlag[];
  const flagOpen = permissions.is_admin || (!assignmentOnly && flags.some((f) => Boolean(permissions[f])));

  const { data: assigned, isLoading } = useQuery<boolean>({
    queryKey: ["assignment-gate", user?.id, authKey],
    enabled: authReady && !!user && !permissions.loading && !flagOpen && !!authKey && permissions.has_classroom_access,
    queryFn: () => authorize(user!.id),
    staleTime: 60_000,
  });

  const waiting =
    authReady && !!user && !permissions.loading && !flagOpen && !!authKey && permissions.has_classroom_access && isLoading;
  if (waiting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!flagOpen && permissions.has_classroom_access && assigned) return <>{children}</>;
  return <ProtectedRoute flag={assignmentOnly ? [] : flag}>{!flagOpen && assignmentOnly ? <LockedModule /> : children}</ProtectedRoute>;
}

// ── What each runner accepts as proof ──────────────────────────────────────

async function ownsRow(table: string, id: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(table as never)
    .select("id")
    .eq("id", id)
    .eq("student_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/** A live practice-test assignment for exactly this PrepTest. */
export async function hasPracticeTestAssignment(userId: string, pt?: number): Promise<boolean> {
  let query = supabase
    .from("practice_test_assignments" as never)
    .select("id")
    .eq("student_id", userId)
    .neq("status", "archived");
  if (typeof pt === "number") query = query.eq("pt", pt);
  const { data, error } = await query.limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

async function hasAssignedBootcamp(userId: string, bootcampId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("classroom_items")
    .select("id,source_id,metadata_json")
    .eq("student_id", userId)
    .eq("type", "bootcamp_module")
    .neq("status", "archived")
    ;
  if (error) return false;
  // A bootcamp-day link names only a day and a part, not which bootcamp it
  // came from — the student arrived from inside one, so any live bootcamp
  // assignment is the proof. Named bootcamps (practice sets) still match
  // their own id.
  if (bootcampId === "any") return (data ?? []).length > 0;
  return (data ?? []).some((row) => classroomItemMatchesBootcamp(row as never, bootcampId));
}

/** The PrepTest a sitting leg belongs to, read from the run on this device. */
function ptOfRun(runId: string | null | undefined): number | null {
  if (!runId) return null;
  return loadPracticeTestRun(runId)?.pt ?? null;
}

// ── Route wrappers ─────────────────────────────────────────────────────────

/** /activities/:assignmentId */
export function ActivityAssignmentGate({ children, rrcOnly = false }: { children: ReactNode; rrcOnly?: boolean }) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const access = useReadingCenterAccess(!permissions.is_admin);
  const ownRrc = useQuery({
    queryKey: ['rrc-assignment-gate', user?.id, assignmentId],
    enabled: authReady && !!user && !!assignmentId && !permissions.loading,
    queryFn: async () => {
      let query = supabase.from('activity_assignments').select('id,mode,item_format').eq('id', assignmentId!);
      if (!permissions.is_admin) query = query.eq('student_id', user!.id);
      const { data, error } = await query.maybeSingle();
      if (error || !data) return null;
      if (data.mode === 'section' && data.item_format === 'spoken-recall') return 'section';
      return data.mode === 'section-library' ? 'library' : null;
    },
    staleTime: 0,
  });
  if (!authReady || permissions.loading || (!!user && (ownRrc.isPending || (!permissions.is_admin && access.isPending)))) {
    return <div role="status" className="flex min-h-screen items-center justify-center">Checking activity access…</div>;
  }
  if (rrcOnly) {
    return <ProtectedRoute allowSignedIn>{ownRrc.data === 'section' && (permissions.is_admin || access.allowed || permissions.has_classroom_access)
      ? children : <LockedModule />}</ProtectedRoute>;
  }
  if (ownRrc.data && access.allowed) return <ProtectedRoute allowSignedIn>{children}</ProtectedRoute>;
  return (
    <AssignmentGate
      flag="has_activity_access"
      assignmentOnly
      authKey={assignmentId ? `activity:${assignmentId}` : null}
      authorize={(uid) => ownsRow("activity_assignments", assignmentId!, uid)}
    >
      {children}
    </AssignmentGate>
  );
}

/** The RRC door accepts a hub grant or its existing, specifically assigned library. */
export function ReadingCenterRrcGate({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const access = useReadingCenterAccess(!permissions.is_admin);
  const legacy = useQuery({
    queryKey: ['rrc-library-gate', user?.id],
    enabled: authReady && !!user && !permissions.loading && permissions.has_classroom_access && !permissions.is_admin && !access.allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_assignments').select('id')
        .eq('student_id', user!.id).eq('mode', 'section-library').limit(1);
      return !error && !!data?.length;
    },
    staleTime: 0,
  });
  if (!authReady || permissions.loading || (!!user && !permissions.is_admin &&
    (access.isPending || (!access.allowed && permissions.has_classroom_access && legacy.isPending)))) {
    return <div role="status" className="flex min-h-screen items-center justify-center">Checking Read, Recall, Colour access…</div>;
  }
  return <ProtectedRoute allowSignedIn>{permissions.is_admin || access.allowed || (permissions.has_classroom_access && legacy.data === true)
    ? children : <LockedModule />}</ProtectedRoute>;
}

/** /classroom/ta/:assignmentId */
export function TAAssignmentGate({ children }: { children: ReactNode }) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  return (
    <AssignmentGate
      flag="has_ta_access"
      assignmentOnly
      authKey={assignmentId ? `ta:${assignmentId}` : null}
      authorize={(uid) => ownsRow("ta_assignments", assignmentId!, uid)}
    >
      {children}
    </AssignmentGate>
  );
}

/** Permanent activity doors require that exact library assignment. */
export function ActivityLibraryGate({ activityId, mode, children }: {
  activityId?: string; mode?: string; children: ReactNode;
}) {
  return <AssignmentGate flag="has_activity_access" assignmentOnly
    authKey={`activity-library:${activityId ?? mode}`}
    authorize={async (uid) => {
      let query = supabase.from('activity_assignments').select('id').eq('student_id', uid);
      if (activityId) query = query.eq('activity_id', activityId);
      if (mode) query = query.eq('mode', mode as never);
      const { data, error } = await query.limit(1);
      return !error && !!data?.length;
    }}>{children}</AssignmentGate>;
}

/** Saved work authorizes only its own review page, never a feature catalogue. */
export function OwnedWorkReviewGate({ kind, children }: {
  kind: 'section' | 'intro-lr' | 'hard-sentences' | 'native-lab'; children: ReactNode;
}) {
  const params = useParams();
  const id = params.attemptId ?? params.historyId ?? params.attemptKey;
  return <AssignmentGate flag="has_analytics_access" authKey={id ? `review:${kind}:${params.sourceKind ?? ''}:${id}` : null}
    authorize={async (uid) => {
      if (!id) return false;
      switch (kind) {
        case 'section': return !!await (await import('@/lib/sectionHistory')).fetchOwnedSectionHistoryItem(uid, id);
        case 'intro-lr': return !!await (await import('@/components/review/introLrReviewSource')).fetchOwnedIntroLrAttempt(uid, id);
        case 'hard-sentences': return !!await (await import('@/components/review/hardSentencesReviewSource')).fetchOwnedHardSentencesAttempt(uid, params.sourceKind ?? '', id);
        case 'native-lab': return !!await (await import('@/components/review/nativeLabReviewSource')).fetchOwnedNativeLabAttempt(uid, id);
      }
    }}>{children}</AssignmentGate>;
}

/** /testing: the Testing Centre lists only assigned PrepTests without the switch. */
export function TestingCentreGate({ children }: { children: ReactNode }) {
  return (
    <AssignmentGate
      flag="has_practice_access"
      authKey="testing:any"
      authorize={(uid) => hasPracticeTestAssignment(uid)}
    >
      {children}
    </AssignmentGate>
  );
}

/** /testing/test/:runId */
export function PracticeTestRunGate({ children }: { children: ReactNode }) {
  const { runId } = useParams<{ runId: string }>();
  return (
    <AssignmentGate
      flag="has_practice_access"
      authKey={runId ? `practice-run:${runId}` : null}
      authorize={async (uid) => {
        if (!runId) return false;
        const { data, error } = await supabase
          .from("practice_test_runs" as never)
          .select("pt,status")
          .eq("id", runId)
          .eq("user_id", uid)
          .maybeSingle();
        if (!error && data) {
          const accountRun = data as { pt: number; status: string };
          return accountRun.status === "complete" ||
            hasPracticeTestAssignment(uid, accountRun.pt);
        }
        const localPt = ptOfRun(runId);
        return localPt !== null && hasPracticeTestAssignment(uid, localPt);
      }}
    >
      {children}
    </AssignmentGate>
  );
}

/**
 * What an assignment-launched drill run is authorised by, if anything. Pure so
 * it can be tested without a router.
 */
export type DrillAuthorisation =
  | { kind: "homework"; id: string }
  | { kind: "guided"; id: string }
  | { kind: "practice-test"; pt: number }
  | { kind: "bootcamp"; id: string }
  | null;

export function drillAuthorisation(
  launch: DrillLaunch | null,
  ptRunId: string | null,
  ptOf: (runId: string) => number | null = ptOfRun as (runId: string) => number | null,
  /** `?assignmentId=` from the oldest classroom links, which name no launch kind. */
  legacyAssignmentId: string | null = null,
): DrillAuthorisation {
  if (ptRunId) {
    const pt = ptOf(ptRunId);
    if (pt !== null) return { kind: "practice-test", pt };
  }
  if (!launch) return legacyAssignmentId ? { kind: "homework", id: legacyAssignmentId } : null;
  if (launch.kind === "questions" && launch.carry) {
    const carry = launch.carry;
    if (carry.ptLeg?.runId) {
      const pt = ptOf(carry.ptLeg.runId);
      if (pt !== null) return { kind: "practice-test", pt };
    }
    if (carry.guidedAssignmentId) return { kind: "guided", id: carry.guidedAssignmentId };
    if (carry.assignmentId) return { kind: "homework", id: carry.assignmentId };
  }
  switch (launch.kind) {
    case "assignment":
      return { kind: "homework", id: launch.assignmentId };
    case "guided-drill":
      return launch.assignmentId ? { kind: "guided", id: launch.assignmentId } : null;
    case "bootcamp-day":
      return { kind: "bootcamp", id: "any" };
    case "practice-set":
      return getPracticePool(launch.slug) ? { kind: "bootcamp", id: "intro-to-lr" } : null;
    case "section":
      if (launch.ptLeg?.runId) {
        const pt = ptOf(launch.ptLeg.runId);
        if (pt !== null) return { kind: "practice-test", pt };
      }
      return null;
    default:
      return null;
  }
}

/** A carried question list may narrow the assigned snapshot, never widen it. */
export function assignedQuestionScope(launch: DrillLaunch | null, assignedQids: readonly string[]): boolean {
  if (launch?.kind !== 'questions') return true;
  const allowed = new Set(assignedQids);
  return launch.qids.length > 0 && launch.qids.every((qid) => allowed.has(qid));
}

async function authoriseDrill(auth: NonNullable<DrillAuthorisation>, uid: string, launch: DrillLaunch | null): Promise<boolean> {
  switch (auth.kind) {
    case "homework":
      {
        const { data, error } = await supabase.from('homework_assignments').select('question_qids')
          .eq('id', auth.id).eq('student_id', uid).maybeSingle();
        return !error && !!data && assignedQuestionScope(launch, data.question_qids ?? []);
      }
    case "guided": {
      const { data, error } = await supabase.from('guided_drill_assignments').select('*')
        .eq('id', auth.id).eq('student_id', uid).maybeSingle();
      if (error || !data) return false;
      if (launch?.kind === 'guided-drill') return !launch.drillId || launch.drillId === data.guided_drill_id;
      if (launch?.kind !== 'questions') return false;
      const { getGuidedDrill, resolveGuidedDrillPool } = await import('@/lib/guidedDrills');
      const drill = await getGuidedDrill(data.guided_drill_id);
      if (!drill) return false;
      const assignmentQids = (data as unknown as { question_qids?: string[] }).question_qids;
      const exact = assignmentQids?.length ? assignmentQids : drill.question_qids;
      const qids = exact?.length ? exact : resolveGuidedDrillPool(drill.bank_filter).map((q) => q.qid);
      return assignedQuestionScope(launch, qids);
    }
    case "practice-test":
      return hasPracticeTestAssignment(uid, auth.pt);
    case "bootcamp":
      return hasAssignedBootcamp(uid, auth.id);
  }
}

/** A sitting grants its active LR section only, never a fresh ad-hoc drill. */
export function isActivePracticeTestLrLeg(
  row: { pt: number; status: string; current_leg: number; legs: Array<{ kind: string; section: number; startedAt?: string; completedAt?: string }> },
  launch: DrillLaunch | null,
  runId: string,
): boolean {
  if (row.status !== 'in-progress' || launch?.kind !== 'section') return false;
  const leg = row.legs?.[row.current_leg];
  return !!leg && leg.kind === 'lr' && !!leg.startedAt && !leg.completedAt &&
    launch.ptLeg?.runId === runId && launch.ptLeg.legIndex === row.current_leg &&
    launch.pt === row.pt && launch.section === leg.section;
}

/** Resuming RC requires the exact account session for the active sitting leg. */
export function isActivePracticeTestRcLeg(
  row: { status: string; current_leg: number; legs: Array<{ kind: string; startedAt?: string; completedAt?: string; passageIds?: number[] }> },
  session: { user_id: string; practice_test_run_id: string | null; practice_test_leg: number | null; status: string; passage_ids: number[] },
  userId: string,
  runId: string,
  legIndex: number,
): boolean {
  const leg = row.legs?.[row.current_leg];
  return row.status === 'in-progress' && leg?.kind === 'rc' && !!leg.startedAt && !leg.completedAt &&
    row.current_leg === legIndex && session.user_id === userId &&
    session.practice_test_run_id === runId && session.practice_test_leg === legIndex &&
    session.status === 'in_progress' &&
    JSON.stringify([...session.passage_ids].sort((a, b) => a - b)) ===
      JSON.stringify([...(leg.passageIds ?? [])].sort((a, b) => a - b));
}

function authKeyOf(auth: DrillAuthorisation): string | null {
  if (!auth) return null;
  switch (auth.kind) {
    case "homework":
    case "guided":
      return `${auth.kind}:${auth.id}`;
    case "practice-test":
      return `pt:${auth.pt}`;
    case "bootcamp":
      return `bootcamp:${auth.id}`;
  }
}

/**
 * /drill, /rc and /rc/drill. The runner is shared, so the Drill switch opens it
 * for anything, and an assignment opens it for that one run: a homework set, an
 * assigned guided drill, an assigned bootcamp's days, or a leg of an assigned
 * PrepTest sitting.
 */
export function DrillAssignmentGate({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const state = location.state as (DrillHandoverState & { ptRun?: PtLegRef }) | null;

  let launch: DrillLaunch | null = null;
  try {
    launch = parseDrillLaunch(searchParams) ?? launchFromRouteState(state, state?.ptRun);
  } catch {
    launch = null;
  }
  const ptRunId = state?.ptRun?.runId ?? searchParams.get("ptRun") ??
    (launch?.kind === 'section' ? launch.ptLeg?.runId : null) ??
    (launch?.kind === 'questions' ? launch.carry?.ptLeg?.runId : null);
  const auth = drillAuthorisation(launch, ptRunId, undefined, searchParams.get("assignmentId"));
  const rcSessionId = location.pathname === '/rc/drill' ? searchParams.get('sessionId') : null;
  const rcLegParam = searchParams.get('ptLeg');
  const rcLegIndex = rcLegParam !== null && /^\d+$/.test(rcLegParam) ? Number(rcLegParam) : null;

  return (
    <AssignmentGate
      flag="has_drill_access"
      authKey={ptRunId ? `practice-leg:${ptRunId}:${launch?.kind === 'section' ? `${launch.ptLeg?.legIndex}:${launch.pt}:${launch.section}` : rcSessionId ? `rc:${rcSessionId}:${rcLegIndex}` : 'invalid'}` : auth ? `${authKeyOf(auth)}:${JSON.stringify(launch)}` : null}
      authorize={async (uid) => {
        if (ptRunId) {
          const { data, error } = await supabase.from("practice_test_runs" as never)
            .select("pt,status,current_leg,legs")
            .eq("id", ptRunId)
            .eq("user_id", uid)
            .maybeSingle();
          if (error || !data) return false;
          const run = data as Parameters<typeof isActivePracticeTestLrLeg>[0];
          if (isActivePracticeTestLrLeg(run, launch, ptRunId)) {
            return hasPracticeTestAssignment(uid, run.pt);
          }
          if (!rcSessionId || rcLegIndex === null || launch) return false;
          const { data: session, error: sessionError } = await supabase.from('rc_drill_sessions')
            .select('user_id,practice_test_run_id,practice_test_leg,status,passage_ids')
            .eq('id', rcSessionId)
            .eq('user_id', uid)
            .eq('practice_test_run_id', ptRunId)
            .eq('practice_test_leg', rcLegIndex)
            .maybeSingle();
          if (sessionError || !session || !isActivePracticeTestRcLeg(run, session, uid, ptRunId, rcLegIndex)) return false;
          return hasPracticeTestAssignment(uid, run.pt);
        }
        return auth ? authoriseDrill(auth, uid, launch) : false;
      }}
    >
      {children}
    </AssignmentGate>
  );
}
