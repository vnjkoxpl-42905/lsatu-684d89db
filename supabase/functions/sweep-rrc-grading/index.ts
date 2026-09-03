import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Re-drive Read, Recall, Colour sections that finished but never got a grade.
 *
 * The client asks for grading the moment a section ends, and does not wait on
 * the answer. That ask is an optimisation and it is lost easily: the tab closed
 * before the request left, the network dropped, the function was cold, the
 * judge was down. This is the guarantee behind it -- the thing that means a
 * closed tab never costs a Report Card, as
 * `docs/specs/2026-09-01-rrc-section-grader.md` §4 promised and nothing
 * delivered.
 *
 * It re-drives two states, and only after the run has had ten minutes to grade
 * itself:
 *
 * - a finished section with no grade row at all, and
 * - a grade row the grader itself marked incomplete, because some stimuli went
 *   unjudged and it wrote what it had rather than throwing the run away.
 *
 * It holds no lease and takes no lock. It does not need one: `grade-rrc-section`
 * returns an existing complete grade untouched, so two sweeps that overlap cost
 * one wasted request rather than two grades.
 *
 * Scheduled externally, on the pattern in
 * `docs/ops/native-single-session-workers.md`. Nothing here knows its own
 * schedule.
 */

const WORKER_NAME = "sweep-rrc-grading";

/** A run grades itself first. Only after this is it ours to re-drive. */
const GRACE_MINUTES = 10;

/**
 * How many sections one sweep will grade.
 *
 * Each is a transcription plus a full section's judging, and they run one after
 * another so that a backlog cannot put this function past its own wall clock --
 * which is the exact failure it exists to repair. Three a run, every ten
 * minutes, drains far faster than one tutor's students can fill it.
 */
const MAX_PER_RUN = 3;

/** How many section assignments to consider. RRC sections only, so it is small. */
const SCAN_LIMIT = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`);
  return value;
}

/** Constant-time, so the secret is not probed a byte at a time. */
function authorize(req: Request): boolean {
  const expected = requiredEnv("BOOKING_WORKER_SECRET");
  const actual = req.headers.get("x-worker-secret") ?? "";
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return difference === 0;
}

interface Candidate {
  id: string;
  /** What made it a candidate, carried through to the response so a sweep is legible. */
  reason: "never-graded" | "graded-partial";
  since: string | null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    if (!authorize(req)) return json({ error: "unauthorized" }, 401);

    const url = requiredEnv("SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey);

    const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

    // Every section run. `mode` is the snapshot's own, so a later edit to the
    // Activity cannot move a finished run in or out of this sweep.
    const { data: assignments, error: aErr } = await admin
      .from("activity_assignments")
      .select("id, status, completed_at, started_at, created_at")
      .eq("mode", "section")
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT);
    if (aErr) throw aErr;

    // Old enough to have graded itself. `completed_at` is the honest clock; a
    // run whose completion write failed still has a start, and a run with
    // neither has not produced anything to grade.
    const aged = (assignments ?? []).filter((a) => {
      const at = a.completed_at ?? a.started_at;
      return typeof at === "string" && at < cutoff;
    });
    if (!aged.length) return json({ worker: WORKER_NAME, considered: 0, swept: [] });

    const ids = aged.map((a) => a.id);

    /*
     * Only a run that actually recorded something can be graded.
     *
     * The runner writes its response rows in one go at the end, so an
     * abandoned section has none. Without this check every abandoned run in
     * the table would be re-driven every ten minutes for ever, each time to be
     * told there is nothing to grade.
     */
    const { data: responded, error: rErr } = await admin
      .from("activity_item_responses")
      .select("assignment_id")
      .in("assignment_id", ids);
    if (rErr) throw rErr;
    const hasWork = new Set((responded ?? []).map((r) => r.assignment_id as string));

    const { data: grades, error: gErr } = await admin
      .from("activity_section_grades")
      .select("assignment_id, section")
      .in("assignment_id", ids);
    if (gErr) throw gErr;
    const gradeFor = new Map(
      (grades ?? []).map((g) => [g.assignment_id as string, g.section as Record<string, unknown> | null]),
    );

    const candidates: Candidate[] = [];
    for (const a of aged) {
      if (!hasWork.has(a.id)) continue;
      if (!gradeFor.has(a.id)) {
        candidates.push({ id: a.id, reason: "never-graded", since: a.completed_at ?? a.started_at });
        continue;
      }
      // `complete: false` is the grader saying so itself. A grade written before
      // that flag existed has no `complete` key and is left alone: it is a real
      // grade, and re-driving every one of them would be a re-grade, not a sweep.
      if (gradeFor.get(a.id)?.complete === false) {
        candidates.push({ id: a.id, reason: "graded-partial", since: a.completed_at ?? a.started_at });
      }
    }

    // Oldest first: the run that has been waiting longest is the one a student
    // is most likely to have come back for.
    candidates.sort((x, y) => String(x.since ?? "").localeCompare(String(y.since ?? "")));

    const swept: { assignment_id: string; reason: string; outcome: string }[] = [];
    for (const candidate of candidates.slice(0, MAX_PER_RUN)) {
      try {
        /*
         * Called over HTTP rather than by importing the grader, so there is one
         * grading path and the sweeper cannot drift from what the student's own
         * request runs. The service role key identifies it: the grader accepts
         * that as a trusted caller precisely because a sweep has no user to
         * present.
         */
        const res = await fetch(`${url}/functions/v1/grade-rrc-section`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assignmentId: candidate.id, force: candidate.reason === "graded-partial" }),
        });
        const body = await res.json().catch(() => ({}));
        swept.push({
          assignment_id: candidate.id,
          reason: candidate.reason,
          outcome: res.ok ? String(body.status ?? "graded") : `error:${res.status}:${String(body.error ?? "").slice(0, 120)}`,
        });
      } catch (error) {
        // One section that will not grade must not stop the next one.
        const message = error instanceof Error ? error.message : String(error);
        console.error("[sweep-rrc-grading] failed", { assignmentId: candidate.id, error: message });
        swept.push({ assignment_id: candidate.id, reason: candidate.reason, outcome: `error:${message.slice(0, 120)}` });
      }
    }

    return json({
      worker: WORKER_NAME,
      considered: candidates.length,
      // What is left for the next sweep, so a growing backlog is visible in the
      // scheduler's own logs rather than only in the table.
      deferred: Math.max(0, candidates.length - swept.length),
      swept,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sweep-rrc-grading] error", { error: message });
    return json({ error: "worker_failed" }, 500);
  }
});
