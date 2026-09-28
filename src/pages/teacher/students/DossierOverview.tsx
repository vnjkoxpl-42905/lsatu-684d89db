import { Crown, Shield, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import HubSnapshot from '@/components/hub/HubSnapshot';
import StudentOverview from '@/components/hub/StudentOverview';
import { CONFIGURABLE_FLAG_KEYS, ALL_FLAG_LABELS, isPrimaryAdmin } from '@/lib/adminUsers';
import { cn } from '@/lib/utils';
import { useSetStudentLevel, useStudentLevels } from '@/hooks/useStudentLevels';
import { useSetStudentSchedule, useStudentSchedule } from '@/hooks/useSchedules';
import { templateStudyDays } from '@/lib/scheduleTemplate';
import {
  LEVEL_LABELS,
  STUDENT_LEVELS,
  describeBand,
  levelBand,
  type StudentLevel,
} from '@/lib/studentLevel';
import { useDossier } from './StudentDossier';
import { useStudentAccess } from './useStudentAccess';

/**
 * Overview = the StudentHub snapshot plus the access/role controls that used
 * to live only in the roster's inline expander.
 */
export default function DossierOverview() {
  const { studentId, student, studentEmail } = useDossier();
  const { toggleAccess, setRole, readFlag, isBusy } = useStudentAccess(studentId);
  const { data: levels } = useStudentLevels();
  const setLevel = useSetStudentLevel();

  const isAdmin = student?.role === 'admin';
  const level = levels?.[studentId] ?? null;

  const {
    schedule,
    templates: schedules,
    isLoading: schedulesLoading,
  } = useStudentSchedule(studentId);
  const setSchedule = useSetStudentSchedule();

  const applySchedule = (scheduleTemplateId: string | null) => {
    setSchedule.mutate(
      { studentId, scheduleTemplateId },
      {
        onSuccess: () =>
          toast.success(
            scheduleTemplateId
              ? `Schedule set to ${schedules.find((s) => s.id === scheduleTemplateId)?.title}`
              : 'Schedule cleared; this student is on the default week',
          ),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : 'Could not update the schedule',
          ),
      },
    );
  };

  const applyLevel = (next: StudentLevel | null) => {
    setLevel.mutate(
      { studentId, level: next },
      {
        onSuccess: () =>
          toast.success(
            next
              ? `Level set to ${LEVEL_LABELS[next]}`
              : 'Level cleared; drills use their own range',
          ),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : 'Could not update the level',
          ),
      },
    );
  };

  return (
    <div className="space-y-5 p-5">
      <HubSnapshot studentId={studentId} />
      <StudentOverview studentId={studentId} />

      <div className="flex flex-wrap items-center justify-between gap-3 border border-black/10 bg-white/20 p-4">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/70">Saved answers</h2>
          <p className="mt-1 text-xs text-black/55">Review first-answer misses and check diagnostic progress for this student.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="../review" className="inline-flex min-h-11 items-center border border-black/15 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white/30">Open review</Link>
          <Link to="../progress" className="inline-flex min-h-11 items-center border border-black/15 px-3 py-2 text-xs font-semibold text-black/70 hover:bg-white/30">Open progress</Link>
        </div>
      </div>

      <section className="border border-black/10 bg-white/20 p-4">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">Level</h2>
        <p className="mt-1 text-xs leading-relaxed text-black/45">
          Sets which end of a guided drill's question pool this student gets. Not set means
          drills use their own difficulty range, the way they always have.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {STUDENT_LEVELS.map((option) => {
            const on = level === option;
            return (
              <button
                key={option}
                type="button"
                disabled={setLevel.isPending}
                onClick={() => applyLevel(on ? null : option)}
                aria-pressed={on}
                className={cn(
                  'border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                  on
                    ? 'border-emerald-700/25 bg-emerald-500/10 text-emerald-800'
                    : 'border-black/15 text-black/55 hover:bg-white/25 hover:text-black',
                )}
              >
                {LEVEL_LABELS[option]}
                <span className="ml-1.5 font-normal text-black/40">
                  {describeBand(levelBand(option)).replace('difficulty ', '')}
                </span>
              </button>
            );
          })}
          {level && (
            <button
              type="button"
              disabled={setLevel.isPending}
              onClick={() => applyLevel(null)}
              className="px-1.5 py-1.5 text-xs font-semibold text-black/40 underline-offset-2 transition hover:text-black hover:underline disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>

        {!level && (
          <p className="mt-2.5 text-xs text-black/40">Not set.</p>
        )}
      </section>

      <section className="border border-black/10 bg-white/20 p-4">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">
          Schedule
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-black/45">
          The shape of this student's week: which days they work, where the timed day and the
          rest day fall. The curriculum fills the drill slot on each skill day.
        </p>

        {schedules.length === 0 ? (
          <p className="mt-2.5 text-xs text-black/40">
            {schedulesLoading ? 'Loading…' : 'No schedules yet.'}
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {schedules.map((option) => {
                const on = schedule?.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={setSchedule.isPending}
                    onClick={() => applySchedule(on ? null : option.id)}
                    aria-pressed={on}
                    className={cn(
                      'border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                      on
                        ? 'border-emerald-700/25 bg-emerald-500/10 text-emerald-800'
                        : 'border-black/15 text-black/55 hover:bg-white/25 hover:text-black',
                    )}
                  >
                    {option.title}
                    <span className="ml-1.5 font-normal text-black/40">
                      {templateStudyDays(option.days).length} days
                    </span>
                  </button>
                );
              })}
              {schedule && (
                <button
                  type="button"
                  disabled={setSchedule.isPending}
                  onClick={() => applySchedule(null)}
                  className="px-1.5 py-1.5 text-xs font-semibold text-black/40 underline-offset-2 transition hover:text-black hover:underline disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>

            {schedule ? (
              <p className="mt-2.5 text-xs text-black/45">{schedule.description}</p>
            ) : (
              <p className="mt-2.5 text-xs text-black/40">
                Not set; this student is on the default week.
              </p>
            )}
          </>
        )}
      </section>

      <section className="border border-black/10 bg-white/20 p-4">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">Access</h2>
        <p className="mt-1 text-xs leading-relaxed text-black/45">
          Bootcamp access is controlled by assignment, not here. Assign or archive a bootcamp from
          the Library to add or remove it from this student's path.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONFIGURABLE_FLAG_KEYS.map((key) => {
            const on = readFlag(student as unknown as Record<string, unknown>, key);
            const busy = isBusy(key);
            return (
              <button
                key={key}
                type="button"
                disabled={busy || isAdmin}
                onClick={() => toggleAccess(key, !on)}
                className={cn(
                  'flex items-center justify-between gap-2 border px-3 py-2 text-xs font-semibold transition disabled:opacity-50',
                  on
                    ? 'border-emerald-700/20 text-emerald-800 hover:bg-emerald-500/10'
                    : 'border-black/15 text-black/45 hover:bg-white/25 hover:text-black',
                )}
              >
                <span className="truncate">{ALL_FLAG_LABELS[key] || key.replace(/^has_|_access$/g, '').replace(/_/g, ' ')}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  {on ? <UserCheck className="h-3 w-3" strokeWidth={1.5} /> : <UserX className="h-3 w-3" strokeWidth={1.5} />}
                  {on ? 'On' : 'Off'}
                </span>
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-black/40">
            <Shield className="h-3 w-3" strokeWidth={1.5} />
            Admins have full access; per-feature flags do not apply.
          </p>
        )}
      </section>

      <section className="border border-black/10 bg-white/20 p-4">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-black/45">Role</h2>
        <div className="mt-3">
          {!isAdmin ? (
            <button
              type="button"
              disabled={isBusy('role')}
              onClick={() => setRole('admin', studentEmail)}
              className="inline-flex items-center gap-1.5 border border-amber-700/25 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-500/10 disabled:opacity-50"
            >
              <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
              Promote to Admin
            </button>
          ) : isPrimaryAdmin(studentEmail) ? (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-black/45"
              title="The primary admin account cannot be demoted."
            >
              <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
              Protected primary admin
            </span>
          ) : (
            <button
              type="button"
              disabled={isBusy('role')}
              onClick={() => setRole('user', studentEmail)}
              className="border border-black/15 px-2.5 py-1.5 text-xs font-semibold text-black/55 transition hover:bg-white/25 hover:text-black disabled:opacity-50"
            >
              Demote to User
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
