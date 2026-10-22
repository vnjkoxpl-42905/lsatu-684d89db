import { useClassroomMotion } from '@/hooks/useClassroomMotion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Activity, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedHubStudent, useStudentEmail, type HubStudentRow } from '@/hooks/useHubStudents';
import { formatLastActiveLabel, isUserOnline } from '@/lib/presence';
import AssignmentBuilder from '@/components/teacher/AssignmentBuilder';
import { cn } from '@/lib/utils';

/**
 * The student dossier (spec T3.2): everything about one student behind one
 * URL, with the five surfaces as real child routes so each is linkable and
 * back/forward work. Replaces the split between TeacherStudentDetail, the
 * StudentHub page, and the roster's inline expander.
 */

export interface DossierContext {
  studentId: string;
  student: HubStudentRow | undefined;
  studentName: string | null;
  studentEmail: string | null;
  /** Opens the shared assign flow already scoped to this student. */
  openAssign: () => void;
}

export function useDossier() {
  return useOutletContext<DossierContext>();
}

const TABS = [
  { to: 'overview', label: 'Overview' },
  { to: 'work', label: 'Work' },
  { to: 'review', label: 'Review' },
  { to: 'progress', label: 'Progress' },
  { to: 'notes', label: 'Notes' },
  { to: 'messages', label: 'Messages' },
  { to: 'schedule', label: 'Schedule' },
] as const;

export default function StudentDossier() {
  const motionBody = useRef<HTMLDivElement>(null);
  const location = useLocation();
  // Message thread selection is in-room state; other dossier tabs get a body entrance.
  const bodyKey = location.pathname.replace(/(\/messages)(?:\/.*)?$/, '$1');
  useClassroomMotion(motionBody, `dossier:${bodyKey}`);
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const student = useSelectedHubStudent(studentId ?? null);
  // The roster query may not have resolved on a deep link, so fall back to the
  // narrow per-student RPC rather than showing a nameless header.
  const { data: rpcEmail } = useStudentEmail(studentId ?? null);

  const [assignStudentId, setAssignStudentId] = useState<string | null>(null);

  useEffect(() => {
    setAssignStudentId(null);
  }, [studentId]);

  const studentName = student?.display_name?.trim() || null;
  const studentEmail = student?.email ?? rpcEmail ?? null;

  const isOnline = isUserOnline(student?.last_seen_at ?? null);
  const lastActiveLabel = formatLastActiveLabel(student?.last_seen_at ?? null);
  const lastActiveAbsolute = student?.last_seen_at
    ? format(new Date(student.last_seen_at), 'MMM d, h:mm a')
    : null;

  const context = useMemo<DossierContext>(
    () => ({
      studentId: studentId as string,
      student,
      studentName,
      studentEmail,
      openAssign: () => setAssignStudentId(studentId ?? null),
    }),
    [student, studentEmail, studentId, studentName],
  );

  if (!studentId) return null;

  return (
    <section className="flex h-full w-full flex-col" aria-label="Student dossier">
      <header className="shrink-0 border-b border-black/10 px-5 pb-0 pt-4">
        <button
          type="button"
          onClick={() => navigate('/teacher/students')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-black/45 transition hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Roster
        </button>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold tracking-tight text-black">
              {studentName || 'Student'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/45">
              {studentEmail && <span className="truncate font-mono">{studentEmail}</span>}
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
                {isOnline ? 'Online on LSAT U' : 'Offline'}
              </span>
              <span>{lastActiveLabel}</span>
              {lastActiveAbsolute && <span>· {lastActiveAbsolute}</span>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAssignStudentId(studentId)}
            className="inline-flex shrink-0 items-center gap-1.5 bg-teacher-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-teacher-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Assign work
          </button>
        </div>

        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-black/55">
          Viewing this student's records in the teacher workspace. Assignments, notes, and access changes here apply to this student. Questions you answer in Practice stay in your own account.
        </p>

        {/* Sub-tabs sit below the shell's room rail, so they take the ramp's
            13px label step — subordinate to the rail's 14px without inventing
            an undocumented size. */}
        <nav className="-mb-px mt-3 flex gap-1 overflow-x-auto" aria-label="Dossier sections">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap border-b-2 px-3 py-2 text-[13px] transition',
                  isActive
                    ? 'border-black font-semibold text-black'
                    : 'border-transparent font-medium text-black/45 hover:text-black/75',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div ref={motionBody} className="classroom-motion-root classroom-motion-local min-h-0 flex-1 overflow-y-auto">
        <Outlet context={context} />
      </div>

      {assignStudentId === studentId && user && (
        <AssignmentBuilder
          key={studentId}
          studentId={studentId}
          adminUserId={user.id}
          onClose={() => setAssignStudentId(null)}
        />
      )}
    </section>
  );
}
