import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Mail,
  CalendarDays,
  Clock,
  BarChart3,
  AlertTriangle,
  Activity,
  Shield,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeShort } from "@/lib/time";
import {
  useAdminTAAssignmentsForStudent,
  type StudentTAAssignment,
  type TAAssignmentStatus,
} from "@/hooks/useStudentAssignments";
import {
  useSelectedHubStudent,
  useStudentEmail,
  type HubStudentRow,
} from "@/hooks/useHubStudents";

interface Props {
  studentId: string | null;
}

const FLAG_LABELS: Record<string, string> = {
  has_bootcamp_access: "Bootcamps",
  has_classroom_access: "Classroom",
  has_analytics_access: "Analytics",
  has_schedule_access: "Schedule",
  has_practice_access: "Practice",
  has_drill_access: "Drill",
  has_waj_access: "WAJ",
  has_flagged_access: "Flagged",
  has_chat_access: "Chat",
  has_export_access: "Export",
  has_ta_access: "TA",
};

const FLAG_KEYS: (keyof HubStudentRow)[] = [
  "has_practice_access",
  "has_drill_access",
  "has_bootcamp_access",
  "has_classroom_access",
  "has_analytics_access",
  "has_schedule_access",
  "has_waj_access",
  "has_flagged_access",
  "has_chat_access",
  "has_export_access",
  "has_ta_access",
];

/**
 * Overview tab. Pulls the student's row out of the shared useHubStudents
 * cache (already loaded for the left panel, so this reuses data) and
 * fetches two lightweight counts (attempts, WAJ) per student.
 *
 * The ta_assignments detail strip is mounted unchanged — it has its own
 * query + collapse state.
 */
export default function StudentOverview({ studentId }: Props) {
  const student = useSelectedHubStudent(studentId);
  const studentsLoading = !student && !!studentId;

  // Narrow per-student RPC: used as a fallback when the roster's email
  // field is empty/"unknown" (profile row without a matching auth.users
  // entry, or caller without admin role at roster-fetch time).
  const needsEmailFallback =
    !!student && (!student.email || student.email === "unknown");
  const emailFallback = useStudentEmail(needsEmailFallback ? studentId : null);

  const { data: attemptsCount, isLoading: attemptsLoading } = useQuery<number>({
    queryKey: ["hub-overview-attempts", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("attempts")
        .select("*", { count: "exact", head: true })
        .eq("class_id", studentId as string);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: wajCount, isLoading: wajLoading } = useQuery<number>({
    queryKey: ["hub-overview-waj", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      // Mirror the ta-chat edge function: wrong_answer_journal is filtered
      // by class_id on the admin side too.
      const { count, error } = await supabase
        .from("wrong_answer_journal")
        .select("*", { count: "exact", head: true })
        .eq("class_id", studentId as string);
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (!studentId) {
    return (
      <EmptyState icon={GraduationCap} message="Select a student to view their profile." />
    );
  }

  if (studentsLoading && !student) {
    return <EmptyState message="Loading…" />;
  }

  if (!student) {
    return (
      <EmptyState
        icon={AlertTriangle}
        message="Student not found in the managed user list."
      />
    );
  }

  const lastSeen = formatRelativeShort(student.last_seen_at);

  const activeFlags = FLAG_KEYS.filter((k) => Boolean(student[k]));

  const resolvedEmail =
    student.email && student.email !== "unknown"
      ? student.email
      : emailFallback.data ?? null;

  return (
    <div className="flex flex-col divide-y divide-border/30">
      <ProfileCard
        name={student.display_name?.trim() || "Unnamed student"}
        email={resolvedEmail}
        role={student.role}
        lastSeen={lastSeen}
      />

      <AssignmentsSection studentId={studentId} />

      <section className="p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Quick analytics
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={Activity}
            label="Practice attempts"
            value={attemptsLoading ? "…" : (attemptsCount ?? 0).toLocaleString()}
          />
          <StatCard
            icon={BarChart3}
            label="WAJ items"
            value={wajLoading ? "…" : (wajCount ?? 0).toLocaleString()}
          />
        </div>
      </section>

      <section className="p-4 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          Active feature flags
        </div>
        {activeFlags.length === 0 ? (
          <div className="text-[12px] text-zinc-500">
            No feature flags enabled.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeFlags.map((k) => (
              <span
                key={k}
                className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300"
              >
                {FLAG_LABELS[k] ?? String(k)}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProfileCard({
  name,
  email,
  role,
  lastSeen,
}: {
  name: string;
  email: string | null;
  role: string;
  lastSeen: string;
}) {
  return (
    <section className="p-4 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-100 truncate">{name}</div>
          <div className="text-[11px] text-zinc-500 truncate">
            {role === "admin" ? "Admin" : "Student"}
          </div>
        </div>
      </div>
      <dl className="space-y-1 pt-1">
        {email && email !== "unknown" && (
          <MetaRow icon={Mail} label="Email" value={email} />
        )}
        <MetaRow icon={Clock} label="Last seen" value={lastSeen} />
      </dl>
    </section>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
      <span className="text-zinc-500 w-20 shrink-0">{label}</span>
      <span className="text-zinc-300 truncate">{value}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon = CalendarDays,
  message,
}: {
  icon?: typeof CalendarDays;
  message: string;
}) {
  return (
    <div className="flex items-center justify-center h-full p-8 text-center">
      <div className="max-w-xs space-y-2">
        <Icon className="h-8 w-8 text-zinc-600 mx-auto" />
        <div className="text-sm text-zinc-500">{message}</div>
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<TAAssignmentStatus, { label: string; cls: string }> = {
  assigned: { label: "Assigned", cls: "bg-zinc-800 text-zinc-300" },
  viewed: { label: "Viewed", cls: "bg-amber-500/15 text-amber-300" },
  completed: { label: "Completed", cls: "bg-emerald-500/15 text-emerald-300" },
};

/**
 * Flat assignment list (replaces the collapsed StudentTAAssignmentsStrip
 * for the Overview tab — the strip stayed collapsed by default and
 * duplicated the count pill already shown in the left-list row).
 * Sorted newest-first via the existing hook; renders at most 20 rows
 * with an "and N more" tail so the tab doesn't grow unbounded.
 */
function AssignmentsSection({ studentId }: { studentId: string }) {
  const { assignments, loading } = useAdminTAAssignmentsForStudent(studentId);
  const HEAD = 20;
  const head = assignments.slice(0, HEAD);
  const rest = Math.max(0, assignments.length - HEAD);

  return (
    <section className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Assignments
        </div>
        {assignments.length > 0 && (
          <span className="text-[11px] text-zinc-500">
            · {assignments.length}
          </span>
        )}
      </div>
      {loading && assignments.length === 0 ? (
        <div className="flex items-center gap-2 text-[12px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-[12px] text-zinc-500">
          No TA assignments yet.
        </div>
      ) : (
        <ul className="space-y-1">
          {head.map((a) => (
            <AssignmentRow key={a.id} assignment={a} />
          ))}
          {rest > 0 && (
            <li className="text-[11px] text-zinc-500 pt-1">
              and {rest} more…
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

function AssignmentRow({ assignment }: { assignment: StudentTAAssignment }) {
  const badge = STATUS_BADGE[assignment.status];
  const when = assignment.assigned_at
    ? formatRelativeShort(assignment.assigned_at)
    : "";
  return (
    <li className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] text-zinc-100 truncate">
            {assignment.title}
          </div>
          {when && (
            <div className="text-[10.5px] text-zinc-500 mt-0.5">{when}</div>
          )}
        </div>
        <span
          className={
            "shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium " +
            badge.cls
          }
        >
          {badge.label}
        </span>
      </div>
    </li>
  );
}
