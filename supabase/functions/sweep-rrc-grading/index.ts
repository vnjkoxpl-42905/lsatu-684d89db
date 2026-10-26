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
 * It re-drives a run only once that run is FINISHED. Stimuli are written as
 * they happen now, so a half-done section has rows too, and rows are no longer
 * evidence that anything is over. A section is the unit of work and half a
 * section is not a partial score, so the finished mark is the gate. Saving and
 * judging are different acts.
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
 * NOT SCHEDULED, and that is a decision rather than an oversight (2026-09-04).
 *
 * This comment used to say it was "scheduled externally, on the pattern in
 * `docs/ops/native-single-session-workers.md`". It never was: `cron.job` holds
 * four jobs and all four are booking and calendar. Joshua's call, once that was
 * shown, is to leave it unscheduled -- a section grades itself on submit, so
 * this is the backstop and not the path, and scheduling it would put a worker
 * secret inline in a cron command the way the booking jobs' already is.
 *
 * So nothing runs this today. It is invoked by hand, and everything below still
 * holds for when it is. What stays uncovered is a run whose client-side ask
 * never left the browser: it has the 120-second retry and nothing else. See
 * `docs/adr/0021-a-partial-grade-is-written-and-says-so.md`.
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
  /** Which sitting needs grading. Each Attempt keeps its own Report Card. */
  attempt: number;
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
      // Finished, and nothing else. An abandoned run left rows behind and must
      // never be graded on them.
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT);
    if (aErr) throw aErr;

    // Old enough to have graded itself. `completed_at` is the honest clock; a
    // run marked finished without one still has a start.
    const aged = (assignments ?? []).filter((a) => {
      const at = a.completed_at ?? a.started_at;
      return typeof at === "string" && at < cutoff;
    });
    if (!aged.length) return json({ worker: WORKER_NAME, considered: 0, swept: [] });

    const ids = aged.map((a) => a.id);

    /*
     * Only a run that actually recorded something can be graded.
     *
     * A section finished with the microphone refused, or one closed before a
     * single stimulus ended, has no rows. Without this check those would be
     * re-driven on every sweep for ever, each time to be told there is nothing
     * to grade.
     */
    const { data: responded, error: rErr } = await admin
      .from("activity_item_responses")
      .select("assignment_id, attempt_no")
      .in("assignment_id", ids);
    if (rErr) throw rErr;
    /*
     * The newest sitting of each assignment, which is the one a grade is about.
     *
     * A section can be run more than once against the same assignment, and each
     * sitting keeps its own Report Card. Asking only "does this assignment have
     * a grade" would call a second run graded because the first one was, and
     * that is the exact shape of the bug the per-Attempt key was added to fix:
     * the run nothing will ever look at again is the one that needed sweeping.
     */
    const latestAttempt = new Map<string, number>();
    for (const r of responded ?? []) {
      const id = r.assignment_id as string;
      const n = Number(r.attempt_no ?? 1);
      latestAttempt.set(id, Math.max(latestAttempt.get(id) ?? 0, n));
    }

    const { data: grades, error: gErr } = await admin
      .from("activity_section_grades")
      .select("assignment_id, attempt_no, section")
      .in("assignment_id", ids);
    if (gErr) throw gErr;
    const gradeFor = new Map(
      (grades ?? []).map((g) => [
        `${g.assignment_id as string}:${Number(g.attempt_no ?? 1)}`,
        g.section as Record<string, unknown> | null,
      ]),
    );

    const candidates: Candidate[] = [];
    for (const a of aged) {
      const attempt = latestAttempt.get(a.id);
      if (attempt === undefined) continue;
      const key = `${a.id}:${attempt}`;
      if (!gradeFor.has(key)) {
        candidates.push({ id: a.id, attempt, reason: "never-graded", since: a.completed_at ?? a.started_at });
        continue;
      }
      // `complete: false` is the grader saying so itself. A grade written before
      // that flag existed has no `complete` key and is left alone: it is a real
      // grade, and re-driving every one of them would be a re-grade, not a sweep.
      if (gradeFor.get(key)?.complete === false) {
        candidates.push({ id: a.id, attempt, reason: "graded-partial", since: a.completed_at ?? a.started_at });
      }
    }

    // Oldest first: the run that has been waiting longest is the one a student
    // is most likely to have come back for.
    candidates.sort((x, y) => String(x.since ?? "").localeCompare(String(y.since ?? "")));

    /*
     * Only a run that covers its section can be graded.
     *
     * The grader refuses one that does not, so without this check a run that
     * lost rows would be re-driven every sweep for ever, each time to be told
     * so. Asked of a short list of candidates only: the snapshot is the whole
     * section's text and is not worth reading for five hundred rows.
     */
    const countFor = new Map<string, number>();
    for (const r of responded ?? []) {
      const key = `${r.assignment_id as string}:${Number(r.attempt_no ?? 1)}`;
      countFor.set(key, (countFor.get(key) ?? 0) + 1);
    }
    const shortlist = candidates.slice(0, MAX_PER_RUN * 2);
    const { data: snapshots, error: sErr } = await admin
      .from("activity_assignments")
      .select("id, items")
      .in("id", shortlist.map((c) => c.id));
    if (sErr) throw sErr;
    const sizeFor = new Map((snapshots ?? []).map((a) => [a.id as string, ((a.items ?? []) as unknown[]).length]));
    const skipped: { assignment_id: string; reason: string }[] = [];
    const whole = shortlist.filter((c) => {
      const need = sizeFor.get(c.id) ?? 0;
      const have = countFor.get(`${c.id}:${c.attempt}`) ?? 0;
      if (need > 0 && have < need) {
        skipped.push({ assignment_id: c.id, reason: `incomplete:${have}/${need}` });
        return false;
      }
      return true;
    });

    const swept: { assignment_id: string; reason: string; outcome: string }[] = [];
    for (const candidate of whole.slice(0, MAX_PER_RUN)) {
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
          body: JSON.stringify({
            assignmentId: candidate.id,
            attempt: candidate.attempt,
            force: candidate.reason === "graded-partial",
          }),
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
      deferred: Math.max(0, candidates.length - swept.length - skipped.length),
      // Runs that do not cover their section. Not deferred: no sweep will
      // ever grade them, and a growing list here is a runner losing rows.
      skipped,
      swept,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[sweep-rrc-grading] error", { error: message });
    return json({ error: "worker_failed" }, 500);
  }
});
