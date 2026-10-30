/**
 * The indicator ledger, on the teacher's side of the glass.
 *
 * Same join, same arithmetic, different reader. The student sees it once, at the
 * end of their run, as a diagnosis of that run. This is the standing version:
 * which indicator families are costing THIS student marks, across everything
 * they have done, as material for deciding what the next session is about.
 *
 * It captures nothing. Every number here was written by the student's own
 * attempts months or minutes ago, and looking at it is not an event in their
 * record.
 *
 * Renders null when there is nothing to say, so a student with no Activity work
 * gets no empty block on their dossier.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeShort } from "@/lib/time";
import { useStudentActivityLedgers } from "../hooks/useStudentActivityLedgers";
import type { AssignmentLedger, FamilyTally } from "../ledger";

/**
 * The dossier is keyed by `profiles.class_id`; `activity_assignments.student_id`
 * is the auth user id the runner writes. `students` maps between them, the same
 * join the bootcamp progress panel uses.
 *
 * Falling back to the class_id when no mapping row exists is deliberate. In this
 * database the two identifiers coincide for some students, and a panel that
 * silently showed nothing because a join row was missing would look exactly like
 * a student who has done no Activity work.
 */
function useStudentUserId(classId: string | undefined) {
  return useQuery<string | null>({
    queryKey: ["dossier-activity-student-user-id", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("user_id")
        .eq("class_id", classId as string)
        .maybeSingle();
      return ((data?.user_id as string) ?? classId) ?? null;
    },
  });
}

function Meta({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-wider text-black/45">{children}</span>;
}

export function StudentIndicatorLedger({ studentClassId }: { studentClassId: string | undefined }) {
  const { data: userId } = useStudentUserId(studentClassId);
  const { runs, families, loading, error } = useStudentActivityLedgers(userId ?? undefined);

  // Silence while loading: the dossier already has several panels resolving at
  // once and one more spinner is noise. An error is NOT silent, because "no work"
  // and "we could not read it" must not look the same.
  if (loading) return null;
  if (error) {
    return (
      <section className="space-y-2 pt-2">
        <div className="text-[10px] uppercase tracking-wider text-black/45">Indicator ledger</div>
        <p className="text-sm text-black/60">Could not read this student's Activity work.</p>
      </section>
    );
  }
  if (runs.length === 0) return null;

  return <IndicatorLedgerReport runs={runs} families={families} />;
}

/**
 * The panel itself, with no idea where its numbers came from.
 *
 * Split out so the dev lab can render it against the real seeded bank: the
 * dossier is behind admin auth AND needs a student who has actually done the
 * work, which is two gates between this block and anyone looking at it.
 */
export function IndicatorLedgerReport({
  runs,
  families,
}: {
  runs: AssignmentLedger[];
  families: FamilyTally[];
}) {
  return (
    <section className="space-y-3 pt-2" data-testid="student-indicator-ledger">
      <div className="text-[10px] uppercase tracking-wider text-black/45">Indicator ledger</div>

      {families.length === 0 ? (
        <p className="text-sm text-[#11181c]">
          Nothing missed across {runs.length === 1 ? "their run" : `their ${runs.length} runs`}.
        </p>
      ) : (
        <ul className="space-y-2">
          {families.map((f) => (
            <li
              key={f.family}
              className="rounded-lg border border-black/12 bg-white/30 px-4 py-3"
              data-testid={`student-ledger-${f.family}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-[#11181c]">{f.label}</div>
                <div className="shrink-0 text-sm tabular-nums text-[#11181c]">
                  {f.missed}
                  <span className="text-black/45"> of {f.asked}</span>
                </div>
              </div>
              <p className="mt-1.5 text-sm text-black/60">
                {f.indicators
                  .filter((i) => i.missed > 0)
                  .map((i) => (i.missed > 1 ? `${i.indicator} \u00d7${i.missed}` : i.indicator))
                  .join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* What the numbers above were read from. A count with no visible source is
          a claim; this makes it checkable. */}
      <ul className="space-y-1">
        {runs.map((r) => (
          <li key={r.assignmentId} className="flex flex-wrap items-center gap-x-3">
            <Meta>{r.title}</Meta>
            <Meta>
              {r.ledger.missed} missed of {r.ledger.asked} checked
            </Meta>
            {r.resolved < r.total && (
              <Meta>
                {r.resolved} of {r.total} answered
              </Meta>
            )}
            {r.completedAt ? (
              <Meta>Finished {formatRelativeShort(r.completedAt)}</Meta>
            ) : r.startedAt ? (
              <Meta>Started {formatRelativeShort(r.startedAt)}</Meta>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
