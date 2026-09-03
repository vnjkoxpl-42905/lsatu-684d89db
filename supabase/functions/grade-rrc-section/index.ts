import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import {
  buildJudgeEntries,
  buildJudgePrompt,
  gradeStimulus,
  mapWithConcurrency,
  parseJudgeReply,
  toDetails,
  type StimulusGrade,
} from "../_shared/rrcGrading.ts";
import { bigramOverlap, longestSharedRun } from "../_shared/rrcOverlap.ts";

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
const ASR_ENGINE = "deepgram/nova-3";

/**
 * Reciting thresholds.
 *
 * Own-words is the one text comparison in RRC that means what it looks like:
 * she is retelling a sentence she just read, so the vocabulary genuinely is
 * shared and high overlap is the failure rather than the success. A long
 * verbatim run is the stronger signal; the bigram share catches a run that is
 * merely close throughout.
 */
const RECITING_RUN = 12;
const RECITING_BIGRAM = 0.5;

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

async function transcribe(audio: ArrayBuffer, contentType: string): Promise<Word[]> {
  const key = Deno.env.get("DEEPGRAM_API_KEY");
  if (!key) throw new Error("DEEPGRAM_API_KEY is not configured");
  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-3&punctuate=true&smart_format=true",
    {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": contentType },
      body: audio,
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
  // Prefer a direct Gemini key when one is configured. The gateway is the app's
  // single LLM chokepoint and stays the default, but it is metered by Lovable
  // credits, and a grader that stops working when those run out is a grader
  // that stops working in the middle of a student's section.
  const direct = Deno.env.get("GEMINI_API_KEY");
  if (direct) {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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

  const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
  if (!gatewayKey) throw new Error("no judge backend: set GEMINI_API_KEY or LOVABLE_API_KEY");
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${gatewayKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`gateway ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body?.choices?.[0]?.message?.content ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const { assignmentId, force } = await req.json();
    if (!assignmentId) return json({ error: "assignmentId is required" }, 400);

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
    const { data: existing } = await admin
      .from("activity_section_grades")
      .select("assignment_id, graded_at, grader_version, section")
      .eq("assignment_id", assignmentId)
      .maybeSingle();
    const existingIsComplete = (existing?.section as Record<string, unknown> | null)?.complete !== false;
    if (existing && existingIsComplete && !force) {
      const { section: _section, ...summary } = existing;
      return json({ status: "already-graded", ...summary });
    }

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
    const attempt = Math.max(...allResponses.map((r) => Number(r.attempt_no ?? 1)));
    const responses = allResponses.filter((r) => Number(r.attempt_no ?? 1) === attempt);

    const first = responses[0].rrc as Record<string, unknown>;
    const audioPath = first?.audio_path as string | null;
    if (!audioPath) return json({ error: "this run has no recording" }, 409);

    const { data: file, error: dErr } = await admin.storage
      .from((first.audio_bucket as string) ?? "drill-recordings")
      .download(audioPath);
    if (dErr) throw dErr;

    const bytes = await file.arrayBuffer();
    const words = await transcribe(bytes, audioPath.endsWith(".m4a") ? "audio/mp4" : "audio/webm");

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
    const allSegments = responses.flatMap((r) => ((r.rrc as Record<string, unknown>).audio_segments ?? []) as Segment[]);
    const spanEndMs = Math.max(0, ...allSegments.map((s) => s.endMs));
    const lastWordMs = words.length ? words[words.length - 1].end * 1000 : 0;
    const inAnyWindow = words.filter((w) => allSegments.some((s) => w.start * 1000 >= s.startMs && w.start * 1000 < s.endMs)).length;
    const clock = {
      words: words.length,
      words_inside_a_window: inAnyWindow,
      span_end_ms: spanEndMs,
      last_word_ms: Math.round(lastWordMs),
      drift_ms: Math.round(lastWordMs - spanEndMs),
    };
    if (words.length > 0 && inAnyWindow === 0) {
      return json({ error: "clock mismatch: no transcribed word falls inside any recorded window", clock }, 422);
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
    type Graded = StimulusGrade & { slug: string; dead_air_seconds: number; ungraded?: string };

    // Rows whose slug is not in the assignment's own snapshot are not this
    // section's work and were skipped by the loop this replaced.
    const gradable = responses.filter((r) =>
      bySlug.has(String((r.rrc as Record<string, unknown>).slug ?? "")),
    );

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
      const detailTexts = chunks.flatMap((c) => c.details.map((d) => d.text));
      const stimulusText = chunks.map((c) => c.text).join(" ");

      const segments = ((rrc.audio_segments ?? []) as Segment[]);
      const spokenWords = wordsIn(words, segments);
      const spoken = spokenWords.map((w) => w.word).join(" ").trim();

      // Decoys from the next stimulus in the same section: nearest in subject
      // matter, and therefore the hardest for a judge to reject on vibes.
      const idx = items.findIndex((i) => String(i.slug) === slug);
      const other = items[(idx + 1) % items.length] as Record<string, unknown>;
      const otherChunks = (other?.chunks ?? []) as { details: { text: string }[] }[];
      const decoys = (otherChunks[0]?.details ?? []).slice(0, 2).map((d) => d.text);

      const entries = buildJudgeEntries(toDetails(detailTexts), decoys);
      const nothingCarried = {
        verdicts: {},
        reciting: false,
        recitingReason: "",
        listing: false,
        listingReason: "",
        coloured: false,
        colourSpecific: false,
        missingIds: entries.map((e) => e.id),
      };

      if (!spoken) {
        // Nothing captured in her windows. Zero Coverage is the honest number
        // here only because the words genuinely are not there; it is recorded
        // alongside the clock reading so a systematic failure is visible.
        return { slug, ...gradeStimulus(entries, nothingCarried), dead_air_seconds: 0 };
      }

      try {
        const raw = await judge(buildJudgePrompt({ stimulus: stimulusText, entries, spoken }));
        const grade = gradeStimulus(entries, parseJudgeReply(raw, entries.map((e) => e.id)));

        // Reciting is decided in code, not by the model: it is a measurement.
        const run = longestSharedRun(spoken, stimulusText);
        const bigram = bigramOverlap(spoken, stimulusText);
        grade.reciting = run >= RECITING_RUN || bigram >= RECITING_BIGRAM;

        return {
          slug,
          ...grade,
          dead_air_seconds: deadAir(words, segments.filter((s) => s.phase === "recalling")),
        };
      } catch (e) {
        const reason = (e as Error).message ?? String(e);
        console.error("[grade-rrc-section] stimulus failed", { assignmentId, slug, reason });
        return {
          slug,
          ...gradeStimulus(entries, nothingCarried),
          dead_air_seconds: deadAir(words, segments.filter((s) => s.phase === "recalling")),
          ungraded: reason,
        };
      }
    });

    const accommodation = String(first.accommodation ?? "standard");
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

    const section = {
      accommodation,
      goal_minutes: goalMinutes,
      total_seconds: totalSeconds,
      within_goal: totalSeconds > 0 && totalSeconds <= goalMinutes * 60,
      mean_coverage: meanCoverage,
      stimuli_graded: graded.length,
      reciting_count: graded.filter((s) => s.reciting).length,
      listing_count: graded.filter((s) => s.listing).length,
      uncoloured_count: graded.filter((s) => !s.coloured).length,
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
        student_id: assignment.student_id,
        source_section: assignment.source_section,
        transcript_engine: ASR_ENGINE,
        transcript_text: words.map((w) => w.word).join(" "),
        grader_version: GRADER_VERSION,
        stimuli,
        section,
        graded_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id" },
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
  }
});
