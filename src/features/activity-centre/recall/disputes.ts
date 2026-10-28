import { supabase } from "@/integrations/supabase/client";

/**
 * Saying that a verdict rests on a mis-hearing.
 *
 * The audit's stimulus 5: the judge quoted her as saying "clearly moral
 * characters", the recording says IMMORAL, and she was told she gave the wrong
 * Read. The card now says the marking is done from the transcript and that a
 * wrong transcript makes the marking wrong. This is the other half -- a way to
 * say so that goes somewhere.
 *
 * Deliberately not a workflow. One row, no status, no resolution. The order
 * (W7) asks for a stored flag and a place Joshua can see it, and inventing a
 * triage state machine on top would be answering a question nobody asked.
 */

export interface DisputeInput {
  assignmentId: string;
  attemptNo: number;
  stimulusSlug: string;
  sourceSection?: string | null;
  studentId: string;
  /** What the card said at the time. A dispute is only legible beside it. */
  band?: string | null;
  reason?: string | null;
}

export type DisputeResult =
  | { ok: true; alreadyRaised: boolean }
  | { ok: false; reason: "not-configured" | "failed" };

/** Postgres: relation does not exist. The table arrives with its own migration. */
const NO_SUCH_TABLE = "42P01";
/** Postgres: unique violation. She tapped twice, which is not a second complaint. */
const ALREADY_THERE = "23505";

/**
 * Record one dispute.
 *
 * **A failure here is reported, never swallowed.** The read paths in
 * `activitiesClient` treat a missing table as an empty result, which is right
 * for a read: a Report Card that cannot find its grades should render as having
 * none rather than crash. It is exactly wrong for this. A student who taps
 * "This is not what I said" and is shown a quiet success, while the row went
 * nowhere, has been lied to on the one screen whose whole subject is the app
 * getting something wrong about her.
 *
 * So the caller gets `not-configured` distinctly from `failed`, and the control
 * says something true in both cases.
 */
export async function raiseDispute(input: DisputeInput): Promise<DisputeResult> {
  /*
   * `activity_grade_disputes` arrives with its own migration and `types.ts` is
   * generated from the DEPLOYED schema, so the generated client does not know
   * the table yet. Narrowed to the one call actually used rather than cast to
   * `any`, so a typo in a column name is still a type error. Delete the shim
   * once the types are regenerated.
   */
  const table = supabase.from("activity_grade_disputes" as never) as unknown as {
    insert: (
      row: Record<string, unknown>,
    ) => Promise<{ error: { code?: string; message?: string } | null }>;
  };

  const { error } = await table.insert({
    assignment_id: input.assignmentId,
    attempt_no: input.attemptNo,
    stimulus_slug: input.stimulusSlug,
    source_section: input.sourceSection ?? null,
    student_id: input.studentId,
    disputed_band: input.band ?? null,
    disputed_reason: input.reason ?? null,
  });

  if (!error) return { ok: true, alreadyRaised: false };
  // Already raised is a success from her side: the thing she wanted recorded is
  // recorded. Only the second tap knows the difference, and it need not care.
  if (error.code === ALREADY_THERE) return { ok: true, alreadyRaised: true };
  if (error.code === NO_SUCH_TABLE) return { ok: false, reason: "not-configured" };
  return { ok: false, reason: "failed" };
}
