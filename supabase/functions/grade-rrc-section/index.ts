import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import {
  buildJudgeEntries,
  buildJudgePrompt,
  gradeStimulus,
  mapWithConcurrency,
  parseJudgeReply,
  pickDecoys,
  toDetailsByLine,
  type StimulusGrade,
} from "../_shared/rrcGrading.ts";
import { checkReciting } from "../_shared/rrcOverlap.ts";
import { stripVerbatimReads } from "../_shared/rrcReads.ts";
import { linesFromWords } from "../_shared/rrcLines.ts";

/**
 * Grade one finished Read, Recall, Colour section.
 *
 * The runner already writes everything this needs and nothing reads it: one
 * unbroken recording in `drill-recordings`, and one `activity_item_responses`
 * row per stimulus carrying the phase boundaries in milliseconds. This turns
 * that into a Report Card.
 *
 * Design lives in `docs/specs/2026-09-01-rrc-section-grader.md`. The three
 * decisions that shape it:
 *
 * - The transcript comes from Deepgram Nova-3, the same engine that read the
 *   standard the Details were calibrated against (ADR 0017). The browser's own
 *   SpeechRecognition text is kept but never graded: it is Chrome-only, absent
 *   without warning elsewhere, and carries no usable timing.
 * - Coverage is per stimulus and reported as a band, never as a raw percentage
 *   against an implied 100 (ADR 0018).
 * - The grade is written with the service role to a table the student can read
 *   and cannot write (ADR 0019).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Bumped when the prompt or the scoring changes, so a re-grade is legible. */
const GRADER_VERSION = 1;
/**
 * Which deploy is answering. Bumped on every change to this function.
 *
 * Lovable deploys edge functions on its own schedule and gives no receipt, so
 * this is the only way to prove from outside that a fix is the one running.
 * Returned on the 202 body and on the admin diagnostic below.
 */
const BUILD = "2026-09-09a";
const ASR_ENGINE = "deepgram/nova-3";

/** Silence inside The Recall, in seconds, before it counts as dead air. */
const DEAD_AIR_SECONDS = 4;

/**
 * How many stimuli are judged at once.
 *
 * A section is 22 of them. Judged in series they took longer than the edge
 * function is allowed to run, and the whole grade was lost at the end of a
 * correct recording, a correct upload and a correct transcription. Judged at
 * this width the judging stage costs about as long as its slowest single call.
 *
 * Not unbounded: the judge is a rate-limited API, and 429s would trade a
 * timeout for a different failure with the same result.
 */
const JUDGE_CONCURRENCY = 8;

interface Word { word: string; start: number; end: number; punctuated?: string }
interface Segment { slug: string; order: number; phase: string; startMs: number; endMs: number }

/** Constant-time string compare, so a secret is not probed a byte at a time. */
function sameSecret(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return difference === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Transcribe the recording Deepgram can fetch at `audioUrl`.
 *
 * By URL, never by bytes. This function used to download the recording and
 * post the buffer, which held the whole file in an edge function's memory
 * twice over. A 20-minute section fit; a 66-minute one (112 MB, Celia,
 * 2026-09-08) did not, and the function died with WORKER_RESOURCE_LIMIT before
 * a single word was transcribed -- the one failure the sweeper cannot repair
 * by re-driving, because every re-drive dies the same way. Deepgram fetches
 * the file itself from a short-lived signed URL, so this function never holds
 * the audio and the length of a section stops being a limit on grading it.
 */
async function transcribe(audioUrl: string): Promise<Word[]> {
  const key = Deno.env.get("DEEPGRAM_API_KEY");
  if (!key) throw new Error("DEEPGRAM_API_KEY is not configured");
  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true",
    {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: audioUrl }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  const words = body?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  return words.map((w: Record<string, unknown>) => ({
    word: String(w.punctuated_word ?? w.word ?? ""),
    start: Number(w.start ?? 0),
    end: Number(w.end ?? 0),
  }));
}

/**
 * The stretch of the recording a set of windows covers, in milliseconds.
 *
 * One span rather than the list of windows, because what it is for is a seek:
 * play from here to there. Null when there is nothing to play.
 */
function span(segments: Segment[]): { start: number; end: number } | undefined {
  if (!segments.length) return undefined;
  return {
    start: Math.min(...segments.map((s) => s.startMs)),
    end: Math.max(...segments.map((s) => s.endMs)),
  };
}

/** The words spoken inside any of this stimulus's windows, in order. */
function wordsIn(words: Word[], segments: Segment[]): Word[] {
  return words.filter((w) =>
    segments.some((s) => w.start * 1000 >= s.startMs && w.start * 1000 < s.endMs),
  );
}

/**
 * The longest silence inside The Recall.
 *
 * Windowed to `recalling` on purpose. She reads silently, so a gap during
 * `working` is a read and is correct; an unwindowed detector fires on every
 * stimulus and is worse than none.
 */
function deadAir(words: Word[], recalling: Segment[]): number {
  let worst = 0;
  for (const seg of recalling) {
    const inside = words.filter((w) => w.start * 1000 >= seg.startMs && w.start * 1000 < seg.endMs);
    let cursor = seg.startMs / 1000;
    for (const w of inside) {
      worst = Math.max(worst, w.start - cursor);
      cursor = w.end;
    }
    worst = Math.max(worst, seg.endMs / 1000 - cursor);
  }
  return Math.round(worst * 10) / 10;
}

async function judge(prompt: string): Promise<string> {
  // Lovable Cloud's gateway is the primary judge backend; the direct Gemini
  // key is the fallback so a grader never stops mid-section if one path is
  // unavailable.
  const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
  const direct = Deno.env.get("GEMINI_API_KEY");
  if (gatewayKey) {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        "Content-Type": "application/json",
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const body = await res.json();
    if (res.ok) return body?.choices?.[0]?.message?.content ?? "";
    if (!direct) throw new Error(`gateway ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
    console.error(`judge: gateway ${res.status}; falling back to direct Gemini`);
  }

  if (!direct) throw new Error("no judge backend: set LOVABLE_API_KEY or GEMINI_API_KEY");
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    {
      method: "POST",
      headers: { "x-goog-api-key": direct, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * How long a claim on an Attempt's grading is honoured with no release.
 *
 * A grading that dies mid-way never releases its claim. Longer than any grading
 * has taken (the slowest observed was 163 seconds) and no longer than the
 * sweeper's grace, so a dead claim is out of the way by the time the sweeper
 * comes for the run it was on.
 */
const CLAIM_STALE_SECONDS = 600;

/**
 * The least share of transcribed words that must fall inside a recorded
 * window for the clock proof to pass.
 *
 * The windows partition the run, so on a sound recording nearly every word is
 * inside one. A recording recovered from a crash was graded with 44% inside:
 * the file and the stamps disagreed by 22 seconds and every stimulus was
 * scored against the wrong words. Zero inside was the only refusal before.
 */
const CLOCK_MIN_SHARE_IN_WINDOW = 0.5;

/**
 * The least share of words inside windows for a found shift to be trusted.
 * Higher than the plain proof's floor on purpose: a shift is a claim about the
 * whole file, and a weak fit is a wrong claim dressed as a repair.
 */
const CLOCK_ALIGN_MIN_SHARE = 0.8;

/** How far the file's clock may lead the app's before alignment gives up. */
const CLOCK_ALIGN_MAX_OFFSET_MS = 4 * 60 * 60 * 1000;

/**
 * Words with a start at or after `fromMs` and before `toMs`, from a list
 * sorted by start. Two binary searches, so a scan over thousands of candidate
 * shifts stays cheap.
 */
function countStartsBetween(starts: number[], fromMs: number, toMs: number): number {
  let lo = 0, hi = starts.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (starts[mid] < fromMs) lo = mid + 1; else hi = mid; }
  const first = lo;
  hi = starts.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (starts[mid] < toMs) lo = mid + 1; else hi = mid; }
  return lo - first;
}

function shareInside(starts: number[], segments: Segment[], offsetMs: number): number {
  if (!starts.length) return 0;
  let inside = 0;
  for (const seg of segments) inside += countStartsBetween(starts, seg.startMs + offsetMs, seg.endMs + offsetMs);
  return inside / starts.length;
}

/**
 * Where the app's window clock sits inside the file, found from the words.
 *
 * On 2026-09-08 a 66-minute section arrived in a 116-minute file: the recorder
 * had been running for 37 minutes before the run's clock started, the words
 * sat 2,200 seconds later than every window said, and the proof refused the
 * run. The windows partition the run, so the shift that puts the most words
 * inside them is the shift the file actually has. This scans every half
 * second from zero to the observed drift and hands back the best fit, and the
 * caller decides whether the fit is good enough to trust.
 */
function alignClock(words: Word[], segments: Segment[]): { offsetMs: number; share: number } {
  const starts = words.map((w) => w.start * 1000).sort((a, b) => a - b);
  const spanEndMs = Math.max(0, ...segments.map((s) => s.endMs));
  const lastWordMs = starts.length ? starts[starts.length - 1] : 0;
  const maxOffset = Math.min(CLOCK_ALIGN_MAX_OFFSET_MS, Math.max(0, lastWordMs - spanEndMs) + 10 * 60 * 1000);
  let best = { offsetMs: 0, share: shareInside(starts, segments, 0) };
  for (let offset = 500; offset <= maxOffset; offset += 500) {
    const share = shareInside(starts, segments, offset);
    if (share > best.share) best = { offsetMs: offset, share };
  }
  // Refine to the tenth of a second around the best half second.
  for (let offset = best.offsetMs - 450; offset <= best.offsetMs + 450; offset += 100) {
    if (offset < 0) continue;
    const share = shareInside(starts, segments, offset);
    if (share > best.share) best = { offsetMs: offset, share };
  }
  return best;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  /*
   * The claim this request holds on an Attempt's grading, if any.
   *
   * Released in `finally`, whatever happens after it is taken: a grading that
   * returns early, throws, or finishes all let go of the Attempt, and one that
   * dies without reaching `finally` is let go of by the claim going stale.
   */
  let release: (() => Promise<void>) | null = null;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const { assignmentId, force, attempt: askedFor, diagnose, census } = await req.json();
    if (!assignmentId && !diagnose && !census) return json({ error: "assignmentId is required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    /*
     * Who is asking, and one caller that is not a person.
     *
     * The sweeper re-drives runs whose student has long since closed the tab,
     * so it has no user to present. It calls with the service role key, which
     * never leaves the server and already grants everything the READS below
     * do -- so accepting it here widens nothing, it just names the caller the
     * function already trusts. Compared in constant time and checked BEFORE
     * `getUser`, which returns no user for a service-role token and would
     * otherwise reject the sweeper as unauthorized.
     */
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const trusted = sameSecret(`Bearer ${serviceKey}`, auth);

    let uid: string | undefined;
    if (!trusted) {
      // The caller must own the assignment or be an admin; the READS below use
      // the service role, so this check is the access control.
      const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: userData } = await caller.auth.getUser();
      uid = userData?.user?.id;
      if (!uid) return json({ error: "unauthorized" }, 401);
    }

    /*
     * The admin diagnostic: which build, and which judge, with the key proven.
     *
     * "Is it using the Gemini key I added?" has no honest answer from outside
     * without this: secrets cannot be read, and a grade row does not say which
     * backend judged it. So an admin can ask, and the answer includes one
     * one-word call through the same path a real grading takes.
     */
    if (diagnose) {
      if (!trusted) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (!isAdmin) return json({ error: "forbidden" }, 403);
      }
      const backend = Deno.env.get("LOVABLE_API_KEY") ? "lovable-gateway" : "gemini-direct";
      let judgeOk = false;
      let judgeError: string | null = null;
      try {
        const reply = await judge('Reply with exactly this JSON and nothing else: {"ok":true}');
        judgeOk = /"ok"\s*:\s*true/.test(reply);
        if (!judgeOk) judgeError = `unexpected reply: ${reply.slice(0, 120)}`;
      } catch (e) {
        judgeError = (e as Error).message;
      }
      return json({
        build: BUILD,
        grader_version: GRADER_VERSION,
        judge: backend,
        judge_ok: judgeOk,
        judge_error: judgeError,
        transcriber: Deno.env.get("DEEPGRAM_API_KEY") ? "deepgram" : "missing DEEPGRAM_API_KEY",
      });
    }

    /*
     * The census: the standard's own runs, judged by the judge that is live.
     *
     * ADR 0018's band floor is the 10th percentile of Joshua's 71 recordings
     * scored Detail by Detail, and it was validated against `gemini-2.5-flash`
     * on a laptop that held the shaped transcripts and a key. Neither exists
     * on the machine that maintains this now, and the model has since moved.
     * A band measured on one judge and applied by another is not a
     * measurement, so the census has to be re-runnable against whatever judge
     * THIS function is using, through THIS prompt, with THIS key -- which is
     * only possible from inside the function.
     *
     * Admin only. The caller sends the authored items of one section (the
     * same JSON the content lives in); the function fetches the model runs'
     * transcripts for those slugs, cuts the verbatim reads exactly as it does
     * for a student, judges each one with no walkthrough and no line split
     * (the conditions the original census was scored under), and returns one
     * row per stimulus. Nothing is written.
     */
    if (census) {
      if (!trusted) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (!isAdmin) return json({ error: "forbidden" }, 403);
      }
      const cItems = ((census as Record<string, unknown>).items ?? []) as Record<string, unknown>[];
      const sourceSection = String((census as Record<string, unknown>).sourceSection ?? "");
      if (!cItems.length || !sourceSection) return json({ error: "census needs items and sourceSection" }, 400);

      const { data: runs, error: runErr } = await admin
        .from("model_runs")
        .select("slug, transcript_text")
        .eq("source_section", sourceSection)
        .eq("status", "active");
      if (runErr) throw runErr;
      const transcriptBySlug = new Map<string, string>();
      for (const r of (runs ?? []) as { slug: string; transcript_text: string | null }[]) {
        if (r.transcript_text?.trim()) transcriptBySlug.set(r.slug, r.transcript_text);
      }

      const rows = await mapWithConcurrency(cItems, JUDGE_CONCURRENCY, async (item, i) => {
        const slug = String(item.slug ?? "");
        const chunks = (item.chunks ?? []) as { text: string; details: { text: string }[] }[];
        const transcript = transcriptBySlug.get(slug);
        if (!transcript) return { slug, skipped: "no model run transcript" };
        const read = stripVerbatimReads(transcript.split(/\s+/).filter(Boolean), chunks.map((c) => c.text));
        const spoken = read.kept.join(" ").trim();
        const other = cItems[(i + 1) % cItems.length];
        const otherChunks = (other?.chunks ?? []) as { details: { text: string }[] }[];
        const decoys = pickDecoys(otherChunks.flatMap((c) => c.details ?? []).map((d) => d.text));
        const entries = buildJudgeEntries(toDetailsByLine(chunks), decoys);
        try {
          const raw = await judge(
            buildJudgePrompt({
              stimulus: chunks.map((c) => c.text).join(" "),
              entries,
              spoken,
              theRead: (item.the_read as string | null) ?? null,
            }),
          );
          const g = gradeStimulus(entries, parseJudgeReply(raw, entries.map((e) => e.id)));
          return {
            slug,
            percent: g.percent,
            carried: g.carried,
            total: g.total,
            band: g.band,
            decoysCarried: g.decoysCarried.length,
            unjudged: g.unjudged.length,
            readGiven: g.readGiven,
            readMatches: g.readMatches,
            coloured: g.coloured,
            listing: g.listing,
            missed: g.missed,
            readAloudWordsCut: read.cut,
          };
        } catch (e) {
          return { slug, error: (e as Error).message };
        }
      });

      return json({ build: BUILD, judge: Deno.env.get("LOVABLE_API_KEY") ? "lovable-gateway" : "gemini-direct", sourceSection, rows });
    }

    const { data: assignment, error: aErr } = await admin
      .from("activity_assignments")
      .select("id, student_id, items, mode, source_section, time_goal_minutes")
      .eq("id", assignmentId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assignment) return json({ error: "assignment not found" }, 404);
    if (assignment.mode !== "section") return json({ error: "not a section run" }, 400);

    if (!trusted && assignment.student_id !== uid) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    /*
     * Already graded is a success, not a conflict. The client fires this and
     * the sweeper fires it again; the second one must be harmless.
     *
     * Unless the grade on record is a partial one. A section whose judging
     * stage lost some stimuli writes what it has rather than throwing the run
     * away, and that row must not then look finished to the sweeper -- so an
     * incomplete grade is re-driven on sight, without needing `force`.
     */
    const { data: allResponses, error: rErr } = await admin
      .from("activity_item_responses")
      .select("item_order, attempt_no, response_text, rrc")
      .eq("assignment_id", assignmentId)
      .order("item_order");
    if (rErr) throw rErr;
    if (!allResponses?.length) return json({ error: "no responses to grade" }, 409);

    /*
     * The latest Attempt, and only that one.
     *
     * Rows are written as each stimulus finishes, so an abandoned run leaves
     * its stimuli behind and a later sitting adds its own alongside them under
     * a higher `attempt_no`. Grading the lot would score one Report Card across
     * two sittings, with the audio of only the last. The newest Attempt is the
     * run this grade is about.
     */
    const latest = Math.max(...allResponses.map((r) => Number(r.attempt_no ?? 1)));
    const attempt = Number.isFinite(Number(askedFor)) && Number(askedFor) > 0 ? Number(askedFor) : latest;
    const responses = allResponses.filter((r) => Number(r.attempt_no ?? 1) === attempt);
    if (!responses.length) return json({ error: "no responses for that attempt", attempt }, 409);

    /*
     * Already graded is a success, not a conflict. The client fires this and
     * the sweeper fires it again; the second one must be harmless.
     *
     * Checked per ATTEMPT, and therefore only once the attempt is known, which
     * is why it sits below the read rather than above it. Keyed on the
     * assignment alone it answered "has this section ever been graded", so a
     * second sitting was reported as already-graded and never marked -- and if
     * it was marked, it wrote over the first sitting's Report Card. The one
     * this grade is about is the one that has to be absent.
     *
     * Unless the grade on record is a partial one. A section whose judging
     * stage lost some stimuli writes what it has rather than throwing the run
     * away, and that row must not then look finished to the sweeper -- so an
     * incomplete grade is re-driven on sight, without needing `force`.
     */
    const { data: existing } = await admin
      .from("activity_section_grades")
      .select("assignment_id, attempt_no, graded_at, grader_version, section")
      .eq("assignment_id", assignmentId)
      .eq("attempt_no", attempt)
      .maybeSingle();
    const existingIsComplete = (existing?.section as Record<string, unknown> | null)?.complete !== false;
    if (existing && existingIsComplete && !force) {
      const { section: _section, ...summary } = existing;
      return json({ status: "already-graded", ...summary });
    }

    /*
     * Only a whole section is graded.
     *
     * Rows are written as stimuli finish, so a run abandoned at stimulus 3 has
     * rows, and grading them produced a Report Card that read "0%, 2 stimuli,
     * inside the time" and numbered them 1 and 2. The section is the unit of
     * work (ADR 0010); a run that does not cover it is not a run. Refused
     * rather than marked partial, because ADR 0021's partial grade is the judge
     * failing on a complete recording, which is a different thing.
     */
    const expectedSlugs = new Set(
      ((assignment.items ?? []) as Record<string, unknown>[]).map((i) => String(i.slug)),
    );
    const coveredSlugs = new Set(
      responses
        .map((r) => String((r.rrc as Record<string, unknown>)?.slug ?? ""))
        .filter((slug) => expectedSlugs.has(slug)),
    );
    if (expectedSlugs.size > 0 && coveredSlugs.size < expectedSlugs.size) {
      return json(
        {
          error: "this run does not cover the section",
          attempt,
          stimuli_recorded: coveredSlugs.size,
          stimuli_in_section: expectedSlugs.size,
        },
        409,
      );
    }

    /*
     * One grading per Attempt at a time.
     *
     * The runner asks for a grade as she finishes and the Report Card asks
     * again while it waits. A grading takes a minute or more and nothing was on
     * record until it wrote, so the second ask found no grade and ran too: two
     * transcriptions, two sets of verdicts on the same audio, and a card that
     * showed the first while the database kept the second. The claim is one
     * insert, so two asks arriving together cannot both take it. The loser is
     * told a grading is running, which the Report Card treats exactly like an
     * ask it sent: it keeps polling for the row.
     */
    const { data: claimed, error: cErr } = await admin.rpc("claim_section_grading", {
      p_assignment_id: assignmentId,
      p_attempt_no: attempt,
      p_stale_seconds: CLAIM_STALE_SECONDS,
    });
    if (cErr) throw cErr;
    if (!claimed) return json({ status: "grading", attempt, build: BUILD }, 202);
    release = async () => {
      const { error } = await admin.rpc("release_section_grading", {
        p_assignment_id: assignmentId,
        p_attempt_no: attempt,
      });
      // Not fatal: an unreleased claim goes stale on its own.
      if (error) console.error("[grade-rrc-section] could not release the grading claim", error);
    };

    const first = responses[0].rrc as Record<string, unknown>;
    const audioPath = first?.audio_path as string | null;
    if (!audioPath) return json({ error: "this run has no recording" }, 409);

    /*
     * A signed read, good for long enough to transcribe the longest section
     * anyone has recorded and no longer. The bucket is private; the URL is the
     * only thing Deepgram is handed, and it is never stored.
     */
    const { data: signed, error: sErr } = await admin.storage
      .from((first.audio_bucket as string) ?? "drill-recordings")
      .createSignedUrl(audioPath, 15 * 60);
    if (sErr) throw sErr;
    if (!signed?.signedUrl) throw new Error("could not sign a URL for the recording");

    const words = await transcribe(signed.signedUrl);

    /*
     * The clock proof, asserted rather than assumed.
     *
     * `startMs` is measured from the recorder starting; Deepgram's times are
     * measured from the first sample in the file; and Chrome writes WebM
     * containers with unreliable duration metadata. If those clocks disagree,
     * every stimulus is scored against the wrong words and the whole Report
     * Card is quietly wrong rather than loudly broken. So it is recorded, and
     * a run whose windows hold no speech at all refuses to be graded.
     */
    let allSegments = responses.flatMap((r) => ((r.rrc as Record<string, unknown>).audio_segments ?? []) as Segment[]);
    const spanEndMs = Math.max(0, ...allSegments.map((s) => s.endMs));
    const lastWordMs = words.length ? words[words.length - 1].end * 1000 : 0;
    const countInside = (segments: Segment[]) =>
      words.filter((w) => segments.some((s) => w.start * 1000 >= s.startMs && w.start * 1000 < s.endMs)).length;
    let inAnyWindow = countInside(allSegments);

    /*
     * If the windows and the words disagree, look for the shift before
     * refusing. A found shift is applied to every window on every row, so
     * everything downstream (the words per stimulus, dead air, the clip spans
     * a Report Card seeks with) reads the file where the speech actually is.
     * It is written onto the grade so a shifted run is never mistaken for a
     * clean one.
     */
    let alignment: { offset_ms: number; share_before: number; share_after: number } | undefined;
    if (words.length > 0 && inAnyWindow / words.length < CLOCK_ALIGN_MIN_SHARE) {
      const found = alignClock(words, allSegments);
      if (found.offsetMs > 0 && found.share >= CLOCK_ALIGN_MIN_SHARE) {
        alignment = {
          offset_ms: found.offsetMs,
          share_before: Number((inAnyWindow / words.length).toFixed(3)),
          share_after: Number(found.share.toFixed(3)),
        };
        for (const r of responses) {
          const rrc = r.rrc as Record<string, unknown>;
          const segs = (rrc.audio_segments ?? []) as Segment[];
          rrc.audio_segments = segs.map((seg) => ({
            ...seg,
            startMs: seg.startMs + found.offsetMs,
            endMs: seg.endMs + found.offsetMs,
          }));
        }
        allSegments = responses.flatMap((r) => ((r.rrc as Record<string, unknown>).audio_segments ?? []) as Segment[]);
        inAnyWindow = countInside(allSegments);
        console.warn("[grade-rrc-section] window clock shifted to fit the file", { assignmentId, ...alignment });
      }
    }

    const clock = {
      words: words.length,
      words_inside_a_window: inAnyWindow,
      span_end_ms: spanEndMs,
      last_word_ms: Math.round(lastWordMs),
      drift_ms: Math.round(lastWordMs - spanEndMs),
      ...(alignment ? { alignment } : {}),
    };
    if (words.length > 0 && inAnyWindow === 0) {
      return json({ error: "clock mismatch: no transcribed word falls inside any recorded window", clock }, 422);
    }
    if (words.length > 0 && inAnyWindow / words.length < CLOCK_MIN_SHARE_IN_WINDOW) {
      return json(
        { error: "clock mismatch: too few transcribed words fall inside the recorded windows", clock },
        422,
      );
    }

    const items = (assignment.items ?? []) as Record<string, unknown>[];
    const bySlug = new Map(items.map((i) => [String(i.slug), i]));

    /**
     * One stimulus's grade.
     *
     * `ungraded` carries the reason the judge could not be reached or could not
     * be understood, and is absent on every grade that worked. It is the one
     * field a Report Card must not read as a zero: a Detail she did not carry
     * and a Detail nobody asked about look identical in `missed` otherwise.
     */
    type Graded = StimulusGrade & {
      slug: string;
      /** The assignment's authored position, so a missing response row cannot renumber later rows. */
      item_order: number;
      dead_air_seconds: number;
      /** Which of L, I, C or R this stimulus's Read is. Authored, not inferred. */
      the_read_type?: string;
      /**
       * The passage as authored and the Read the key names, carried onto the
       * grade so the Report Card can put her words beside the standard's
       * without a second query it has no way to make.
       */
      stimulus_text?: string;
      the_read?: string;
      /**
       * What the machine heard for this stimulus, and where it sits in the file.
       *
       * Both were computed and thrown away. Seeing the words back is the
       * fastest way to tell a transcription failure from a memory failure, and
       * the fastest way to trust the number; the window is what makes the
       * recording playable one stimulus at a time, which ADR 0020 accepted and
       * nothing built. The trial run proved the seek is exact, so this is a
       * player and an offset rather than an encoding pipeline.
       */
      spoken?: string;
      window_ms?: { start: number; end: number };
      recall_window_ms?: { start: number; end: number };
      /** Words cut as read-aloud before judging, and which chunks she read. */
      read_aloud_words?: number;
      chunks_read_aloud?: number[];
      /** What Reciting was decided on. Absent where there was nothing to measure. */
      reciting_run?: number;
      reciting_bigram?: number;
      ungraded?: string;
    };

    // Rows whose slug is not in the assignment's own snapshot are not this
    // section's work and were skipped by the loop this replaced.
    const gradable = responses.filter((r) =>
      bySlug.has(String((r.rrc as Record<string, unknown>).slug ?? "")),
    );

    /*
     * The standard, so the judge is not marking quality against its own taste.
     *
     * Three of the whole-run judgments -- listing, coloured, colour_specific --
     * are about how good the work is, and until now they were made with no
     * example of good work anywhere in the prompt. The Details say which facts
     * had to survive and The Read says what the argument was doing, but neither
     * says what a correct run SOUNDS like, and that is the part a teacher sets.
     *
     * One query for the whole section rather than one per stimulus, and a
     * failure here is not fatal: a section whose walkthroughs have not been
     * loaded grades exactly as it did before, without the calibration.
     */
    const walkthroughs = new Map<string, string>();
    {
      const { data, error } = await admin
        .from("model_runs")
        .select("slug, walkthrough_md")
        .eq("source_section", assignment.source_section)
        .eq("status", "active");
      if (error) {
        console.error("[rrc] no model runs for calibration", error.message);
      } else {
        for (const r of (data ?? []) as { slug: string; walkthrough_md: string | null }[]) {
          if (r.walkthrough_md?.trim()) walkthroughs.set(r.slug, r.walkthrough_md);
        }
      }
    }

    /*
     * Judged all at once rather than one after another.
     *
     * Each stimulus is independent -- its Details, its windows and its decoys
     * are all in hand before any call is made -- so the only reason this was
     * ever a series was that it was written as a loop. In series it ran past
     * the edge function's wall clock on a 22-stimulus section and returned 504
     * with nothing written, which is how a run that was recorded, uploaded and
     * transcribed correctly still produced no Report Card.
     *
     * A stimulus that fails is caught HERE, inside the map, so it costs its own
     * grade and not the section's. One unreachable judge call used to throw out
     * of the loop, past the write, and lose twenty minutes of a student's work
     * along with the transcription already paid for.
     */
    const stimuli: Graded[] = await mapWithConcurrency(gradable, JUDGE_CONCURRENCY, async (row) => {
      const rrc = row.rrc as Record<string, unknown>;
      const slug = String(rrc.slug ?? "");
      const item = bySlug.get(slug)!;

      const chunks = (item.chunks ?? []) as { text: string; details: { text: string }[] }[];
      const stimulusText = chunks.map((c) => c.text).join(" ");

      const segments = ((rrc.audio_segments ?? []) as Segment[]);

      /*
       * Her words, with the reads cut out of them.
       *
       * The Details were calibrated against runs that go through
       * `student_shaped.py` first, which removes the verbatim reads on the
       * stated assumption that "the student never does: she reads silently".
       * Nothing in the app enforces that assumption, and a student who reads
       * aloud puts the source text into the evidence the judge is shown, where
       * every Detail is then trivially present. She would score higher for
       * doing less, on the very recording that also gets her flagged for
       * Reciting. This is the same cut, on the same side of the same
       * comparison; see `rrcReads.ts` for why it is safe.
       *
       * Only inside the WORKING window. The Recall is from memory by
       * definition, so a word-for-word passage there is a recital and has to
       * survive in order to be caught as one.
       */
      const workingWords = wordsIn(words, segments.filter((s) => s.phase === "working"));
      const recallWords = wordsIn(words, segments.filter((s) => s.phase !== "working"));
      const read = stripVerbatimReads(
        workingWords.map((w) => w.word),
        chunks.map((c) => c.text),
      );
      const spoken = [...read.kept, ...recallWords.map((w) => w.word)].join(" ").trim();

      /*
       * Decoys, and why they are content only.
       *
       * A decoy is a Detail from another stimulus that she cannot have carried,
       * and crediting one means the judge invented words she never said. That
       * only works if the decoy is a fact about the OTHER stimulus. A
       * structural Detail -- "This is the reason given." -- is a fact about
       * arguments, not about a stimulus, and almost any retelling carries it
       * honestly. The trial run's one decoy failure was exactly that, and it
       * was ours: the check reported the judge hallucinating when the judge was
       * right.
       *
       * Drawn from the whole of the next stimulus rather than its first chunk,
       * because a first chunk is often where the structural Details live.
       */
      const idx = items.findIndex((i) => String(i.slug) === slug);
      const other = items[(idx + 1) % items.length] as Record<string, unknown>;
      const otherChunks = (other?.chunks ?? []) as { details: { text: string }[] }[];
      const decoys = pickDecoys(otherChunks.flatMap((c) => c.details ?? []).map((d) => d.text));

      const entries = buildJudgeEntries(toDetailsByLine(chunks), decoys);

      /*
       * Her run cut into the lines she was rephrasing.
       *
       * She reads each line silently and speaks only while looking away, so the
       * cut keys off the silence in front of each spoken line plus the order she
       * works in (`rrcLines.ts`). It is worked out here, after the run, and the
       * drill is untouched by it. Nothing in the score reads it: Coverage stays
       * per stimulus, and this exists so the Report Card can say WHERE a point
       * went missing and play back the seconds it went missing in.
       */
      const lineSpans = linesFromWords(workingWords, chunks.map((c) => c.text));
      const recallText = recallWords.map((w) => w.word).join(" ").trim();

      const nothingCarried = {
        verdicts: {},
        reciting: false,
        recitingReason: "",
        listing: false,
        listingReason: "",
        coloured: false,
        colourSpecific: false,
        readGiven: false,
        readMatches: false,
        readReason: "",
        missingIds: entries.map((e) => e.id),
        bigMisses: [],
        nextTime: "",
        lineVerdicts: {},
      };


      if (!spoken) {
        // Nothing captured in her windows. Zero Coverage is the honest number
        // here only because the words genuinely are not there; it is recorded
        // alongside the clock reading so a systematic failure is visible.
        return {
          slug,
          item_order: Number(row.item_order),
          ...gradeStimulus(entries, nothingCarried, lineSpans),
          the_read_type: (item.the_read_type as string | undefined) ?? undefined,
          stimulus_text: stimulusText,
          the_read: (item.the_read as string | undefined) ?? undefined,
          spoken: "",
          window_ms: span(segments),
          recall_window_ms: span(segments.filter((s) => s.phase === "recalling")),
          dead_air_seconds: 0,
        };
      }

      try {
        const raw = await judge(
          buildJudgePrompt({
            stimulus: stimulusText,
            entries,
            spoken,
            theRead: (item.the_read as string | null) ?? null,
            modelRun: walkthroughs.get(slug) ?? null,
            lines: lineSpans.map((l) => ({ n: l.n, text: l.text, spoken: l.spoken })),
            recall: recallText || null,
          }),
        );
        const grade = gradeStimulus(entries, parseJudgeReply(raw, entries.map((e) => e.id)), lineSpans);


        // Reciting is decided in code, not by the model: it is a measurement,
        // and the reading is kept alongside the verdict so the thresholds can
        // be argued with from real runs rather than reconstructed later.
        const recital = checkReciting(spoken, stimulusText);
        grade.reciting = recital.reciting;

        return {
          slug,
          item_order: Number(row.item_order),
          ...grade,
          the_read_type: (item.the_read_type as string | undefined) ?? undefined,
          stimulus_text: stimulusText,
          the_read: (item.the_read as string | undefined) ?? undefined,
          spoken,
          window_ms: span(segments),
          recall_window_ms: span(segments.filter((s) => s.phase === "recalling")),
          read_aloud_words: read.cut,
          chunks_read_aloud: read.chunksReadAloud,
          reciting_run: recital.run,
          reciting_bigram: recital.bigram,
          dead_air_seconds: deadAir(words, segments.filter((s) => s.phase === "recalling")),
        };
      } catch (e) {
        const reason = (e as Error).message ?? String(e);
        console.error("[grade-rrc-section] stimulus failed", { assignmentId, slug, reason });
        return {
          slug,
          item_order: Number(row.item_order),
          ...gradeStimulus(entries, nothingCarried, lineSpans),
          the_read_type: (item.the_read_type as string | undefined) ?? undefined,
          stimulus_text: stimulusText,
          the_read: (item.the_read as string | undefined) ?? undefined,
          spoken,
          window_ms: span(segments),
          recall_window_ms: span(segments.filter((s) => s.phase === "recalling")),
          dead_air_seconds: deadAir(words, segments.filter((s) => s.phase === "recalling")),
          ungraded: reason,
        };
      }
    });

    /*
     * Which goal this run is scored against, read from the profile and not from
     * the run.
     *
     * The row carries an `accommodation` too, written by her own browser, and
     * it is deliberately not trusted here for the reason ADR 0019 gives about
     * grades: the accommodation picks the goal, so a value the student can set
     * is a passing time she can set. The profile column is admin-writable only
     * and is the answer.
     *
     * `standard` on a failed read, because scoring an accommodated student
     * against the standard goal is the known harm and a missing profile row is
     * not evidence of anything. It is recorded on the grade either way, so a
     * wrong goal is visible rather than silent.
     */
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("lsat_accommodation")
      .eq("class_id", assignment.student_id)
      .maybeSingle();
    if (pErr) console.error("[grade-rrc-section] could not read the accommodation", pErr);
    const accommodation = String(profile?.lsat_accommodation ?? first.accommodation ?? "standard");
    const goalMinutes = Number((assignment.time_goal_minutes as Record<string, number>)?.[accommodation] ?? 25);
    /*
     * How long the section took.
     *
     * Written on the rows only at the end, and a row saved mid-run cannot know
     * it. So it is read from whichever row carries it, and otherwise derived
     * from the last stimulus's own finishing time, which is the same number by
     * construction. A run that crashed before its final write still gets an
     * honest clock instead of a zero.
     */
    const carriedTotal = responses
      .map((r) => Number((r.rrc as Record<string, unknown>).section_total_seconds ?? 0))
      .find((n) => n > 0);
    const lastFinished = Math.max(
      0,
      ...responses.map((r) => Number((r.rrc as Record<string, unknown>).finished_at_seconds ?? 0)),
    );
    const totalSeconds = carriedTotal ?? lastFinished;
    /*
     * How long she was away, and how many times.
     *
     * A section can be paused now, and every time on this card already has the
     * breaks taken out of it -- the runner stops its clock with the recorder,
     * so the file, the index and her time all skip them together. That is the
     * right number to score and the wrong number to report on its own: a
     * twenty-two minute run with ten minutes of pauses in it is a different
     * sitting from a twenty-two minute run, and only one of them is the drill.
     *
     * Both are cumulative on the row, like `finished_at_seconds`, so the run's
     * totals are the largest values written.
     */
    const pausedSeconds = Math.max(
      0,
      ...responses.map((r) => Number((r.rrc as Record<string, unknown>).paused_seconds ?? 0)),
    );
    const pauseCount = Math.max(
      0,
      ...responses.map((r) => Number((r.rrc as Record<string, unknown>).pause_count ?? 0)),
    );
    /*
     * A stimulus the judge never answered for is not a stimulus she scored
     * zero on, and every count below has to know the difference. Counted as a
     * zero it would drag her Coverage down; counted as uncoloured or as a
     * decoy pass it would invent a habit out of our own outage.
     */
    const ungraded = stimuli.filter((s) => s.ungraded);
    const graded = stimuli.filter((s) => s.total > 0 && !s.ungraded);
    const meanCoverage = graded.length
      ? Math.round(graded.reduce((a, s) => a + s.percent, 0) / graded.length)
      : 0;

    /*
     * The goal, and the condition the method puts on it.
     *
     * The spec says the goal counts "only if every stimulus was recalled,
     * coloured, AND given a Read". The grader knew all three -- it counted four
     * uncoloured stimuli on the trial run -- and used none of them, so a
     * student who skipped the colouring and finished early was told she made
     * the goal. That is the drill rewarding the exact shortcut it exists to
     * treat.
     *
     * The raw clock is kept as its own field. "You were inside the time but
     * skipped the colouring on four" and "you were over" are different things
     * to be told, and collapsing them into one boolean is what made this
     * invisible in the first place.
     */
    const uncoloured = graded.filter((s) => !s.coloured).length;
    const noRead = graded.filter((s) => !s.readGiven).length;
    const withinTime = totalSeconds > 0 && totalSeconds <= goalMinutes * 60;

    const section = {
      accommodation,
      /*
       * Where the recording is, carried onto the grade.
       *
       * It has always been on the response rows and the Report Card never had
       * it, so the one thing a student most wants after being told she dropped
       * the word "only" -- hearing herself not say it -- needed a second query
       * she had no reason to know to make. ADR 0020's seek was proved exact on
       * the trial run, so a stimulus is a play button and two offsets.
       */
      audio_bucket: (first.audio_bucket as string | null) ?? null,
      audio_path: audioPath,
      goal_minutes: goalMinutes,
      total_seconds: totalSeconds,
      paused_seconds: pausedSeconds,
      pause_count: pauseCount,
      within_time: withinTime,
      within_goal: withinTime && uncoloured === 0 && noRead === 0,
      mean_coverage: meanCoverage,
      stimuli_graded: graded.length,
      stimuli_in_section: expectedSlugs.size || stimuli.length,
      reciting_count: graded.filter((s) => s.reciting).length,
      listing_count: graded.filter((s) => s.listing).length,
      uncoloured_count: uncoloured,
      /*
       * The Read, measured at last.
       *
       * Authored on all 1,294 stimuli, promised to her twice -- the briefing
       * says "this is the part that gets checked" -- and graded by nothing
       * until now. Coverage answers "did you hold it"; this answers "did you
       * understand it", which is the criterion the method is built around.
       */
      read_given_count: graded.filter((s) => s.readGiven).length,
      read_matched_count: graded.filter((s) => s.readMatches).length,
      no_read_count: noRead,
      /*
       * How much of what she said was reading the text aloud.
       *
       * Cut before judging, because the standard the Details were calibrated
       * against has it cut too. Recorded because a student who reads the whole
       * section aloud is doing a different drill from the one she thinks she is
       * doing, and nothing else in the product would ever say so.
       */
      read_aloud_words: stimuli.reduce((a, s) => a + (s.read_aloud_words ?? 0), 0),
      chunks_read_aloud: stimuli.reduce((a, s) => a + (s.chunks_read_aloud?.length ?? 0), 0),
      // Measured from the audio, not from the judge, so an ungraded stimulus
      // still has an honest reading here.
      worst_dead_air_seconds: Math.max(0, ...stimuli.map((s) => s.dead_air_seconds)),
      dead_air_threshold_seconds: DEAD_AIR_SECONDS,
      decoy_failures: graded.filter((s) => s.decoysCarried.length > 0).length,
      /*
       * Whether every stimulus in this section actually got a judgement.
       *
       * The one flag the sweeper reads. A partial grade is written rather than
       * thrown away -- the recording, the upload and the transcription behind
       * it all worked -- but it must not pass for a finished one, or the run
       * that needs re-driving is the one run nothing will ever look at again.
       */
      complete: ungraded.length === 0,
      ungraded_count: ungraded.length,
      clock,
    };

    const { error: wErr } = await admin.from("activity_section_grades").upsert(
      {
        assignment_id: assignmentId,
        attempt_no: attempt,
        student_id: assignment.student_id,
        source_section: assignment.source_section,
        transcript_engine: ASR_ENGINE,
        transcript_text: words.map((w) => w.word).join(" "),
        grader_version: GRADER_VERSION,
        stimuli,
        section,
        graded_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,attempt_no" },
    );
    if (wErr) throw wErr;

    // Advisory, and written last: nothing derives trust from it (ADR 0019).
    await admin
      .from("activity_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assignmentId);

    return json({
      status: section.complete ? "graded" : "graded-partial",
      attempt,
      stimuli: stimuli.length,
      section,
    });
  } catch (e) {
    console.error("[grade-rrc-section]", e);
    return json({ error: (e as Error).message }, 500);
  } finally {
    if (release) await release();
  }
});
