import { type ReactNode } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import { loadPracticeTestRun } from "@/lib/practiceTest";
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
  children,
}: {
  flag: PermissionFlag | readonly PermissionFlag[];
  /** Stable name for the thing being authorised, for caching. null = nothing to authorise. */
  authKey: string | null;
  authorize: (userId: string) => Promise<boolean>;
  children: ReactNode;
}) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const flags = (Array.isArray(flag) ? flag : [flag]) as PermissionFlag[];
  const flagOpen = permissions.is_admin || flags.some((f) => Boolean(permissions[f]));

  const { data: assigned, isLoading } = useQuery<boolean>({
    queryKey: ["assignment-gate", user?.id, authKey],
    enabled: authReady && !!user && !permissions.loading && !flagOpen && !!authKey,
    queryFn: () => authorize(user!.id),
    staleTime: 60_000,
  });

  const waiting =
    authReady && !!user && !permissions.loading && !flagOpen && !!authKey && isLoading;
  if (waiting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!flagOpen && assigned) return <>{children}</>;
  return <ProtectedRoute flag={flag}>{children}</ProtectedRoute>;
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

async function hasAssignedBootcamp(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("classroom_items")
    .select("id")
    .eq("student_id", userId)
    .eq("type", "bootcamp_module")
    .neq("status", "archived")
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

/** The PrepTest a sitting leg belongs to, read from the run on this device. */
function ptOfRun(runId: string | null | undefined): number | null {
  if (!runId) return null;
  return loadPracticeTestRun(runId)?.pt ?? null;
}

// ── Route wrappers ─────────────────────────────────────────────────────────

/** /activities/:assignmentId */
export function ActivityAssignmentGate({ children }: { children: ReactNode }) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  return (
    <AssignmentGate
      flag="has_activity_access"
      authKey={assignmentId ? `activity:${assignmentId}` : null}
      authorize={(uid) => ownsRow("activity_assignments", assignmentId!, uid)}
    >
      {children}
    </AssignmentGate>
  );
}

/** /classroom/ta/:assignmentId */
export function TAAssignmentGate({ children }: { children: ReactNode }) {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  return (
    <AssignmentGate
      flag="has_ta_access"
      authKey={assignmentId ? `ta:${assignmentId}` : null}
      authorize={(uid) => ownsRow("ta_assignments", assignmentId!, uid)}
    >
      {children}
    </AssignmentGate>
  );
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
  const pt = ptOfRun(runId);
  return (
    <AssignmentGate
      flag="has_practice_access"
      authKey={pt !== null ? `pt:${pt}` : null}
      authorize={(uid) => hasPracticeTestAssignment(uid, pt!)}
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
  | { kind: "bootcamp" }
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
    case "practice-set":
      return { kind: "bootcamp" };
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

async function authoriseDrill(auth: NonNullable<DrillAuthorisation>, uid: string): Promise<boolean> {
  switch (auth.kind) {
    case "homework":
      return ownsRow("homework_assignments", auth.id, uid);
    case "guided":
      return ownsRow("guided_drill_assignments", auth.id, uid);
    case "practice-test":
      return hasPracticeTestAssignment(uid, auth.pt);
    case "bootcamp":
      return hasAssignedBootcamp(uid);
  }
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
      return "bootcamp:any";
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
  const ptRunId = state?.ptRun?.runId ?? searchParams.get("ptRun");
  const auth = drillAuthorisation(launch, ptRunId, undefined, searchParams.get("assignmentId"));

  return (
    <AssignmentGate
      flag="has_drill_access"
      authKey={authKeyOf(auth)}
      authorize={(uid) => (auth ? authoriseDrill(auth, uid) : Promise.resolve(false))}
    >
      {children}
    </AssignmentGate>
  );
}
