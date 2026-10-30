import { useEffect, useState } from "react";
import {
  listAssignmentsForStudent,
  listResponsesForAssignments,
} from "../api/activitiesClient";
import { familiesAcrossRuns, ledgersForAssignments, type AssignmentLedger, type FamilyTally } from "../ledger";

interface StudentLedgers {
  runs: AssignmentLedger[];
  /** The families costing this student marks across every run, worst first. */
  families: FamilyTally[];
  loading: boolean;
  error: string | null;
}

/**
 * A student's indicator ledgers, for the teacher looking at their dossier.
 *
 * Two queries, not N+1: the assignments, then every attempt across all of them
 * in one `in` read. Both are admin reads that RLS already permits, and neither
 * writes anything -- looking at what a student did is not an event in their
 * record.
 *
 * An error is reported rather than swallowed into an empty state. "This student
 * has nothing" and "we could not find out" look identical on screen otherwise,
 * and the first is a fact about the student while the second is a fact about us.
 */
export function useStudentActivityLedgers(studentId: string | undefined): StudentLedgers {
  const [runs, setRuns] = useState<AssignmentLedger[]>([]);
  const [families, setFamilies] = useState<FamilyTally[]>([]);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setRuns([]);
      setFamilies([]);
      setLoading(false);
      setError(null);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const assignments = await listAssignmentsForStudent(studentId);
        const responses = await listResponsesForAssignments(assignments.map((a) => a.id));
        if (!live) return;
        const built = ledgersForAssignments(assignments, responses);
        setRuns(built);
        setFamilies(familiesAcrossRuns(built));
      } catch (e) {
        if (!live) return;
        console.error("[activity:ledger:student] failed", e);
        setError(e instanceof Error ? e.message : "Could not read this student's activity work");
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [studentId]);

  return { runs, families, loading, error };
}
