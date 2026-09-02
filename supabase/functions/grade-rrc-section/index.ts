import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import {
  buildJudgeEntries,
  buildJudgePrompt,
  gradeStimulus,
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

interface Word { word: string; start: number; end: number; punctuated?: string }
interface Segment { slug: string; order: number; phase: string; startMs: number; endMs: number }

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

    // Who is asking. The caller must own the assignment or be an admin; the
    // READS below use the service role, so this check is the access control.
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await caller.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { data: assignment, error: aErr } = await admin
      .from("activity_assignments")
      .select("id, student_id, items, mode, source_section, time_goal_minutes")
      .eq("id", assignmentId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assignment) return json({ error: "assignment not found" }, 404);
    if (assignment.mode !== "section") return json({ error: "not a section run" }, 400);

    if (assignment.student_id !== uid) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    // Already graded is a success, not a conflict. The client fires this and a
    // sweeper fires it again; the second one must be harmless.
    const { data: existing } = await admin
      .from("activity_section_grades")
      .select("assignment_id, graded_at, grader_version")
      .eq("assignment_id", assignmentId)
      .maybeSingle();
    if (existing && !force) return json({ status: "already-graded", ...existing });

    const { data: responses, error: rErr } = await admin
      .from("activity_item_responses")
      .select("item_order, response_text, rrc")
      .eq("assignment_id", assignmentId)
      .order("item_order");
    if (rErr) throw rErr;
    if (!responses?.length) return json({ error: "no responses to grade" }, 409);

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

    const stimuli: (StimulusGrade & { slug: string; dead_air_seconds: number })[] = [];
    for (const row of responses) {
      const rrc = row.rrc as Record<string, unknown>;
      const slug = String(rrc.slug ?? "");
      const item = bySlug.get(slug);
      if (!item) continue;

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

      if (!spoken) {
        // Nothing captured in her windows. Zero Coverage is the honest number
        // here only because the words genuinely are not there; it is recorded
        // alongside the clock reading so a systematic failure is visible.
        stimuli.push({
          slug,
          ...gradeStimulus(entries, { verdicts: {}, reciting: false, recitingReason: "", listing: false, listingReason: "", coloured: false, colourSpecific: false, missingIds: entries.map((e) => e.id) }),
          dead_air_seconds: 0,
        });
        continue;
      }

      const raw = await judge(buildJudgePrompt({ stimulus: stimulusText, entries, spoken }));
      const grade = gradeStimulus(entries, parseJudgeReply(raw, entries.map((e) => e.id)));

      // Reciting is decided in code, not by the model: it is a measurement.
      const run = longestSharedRun(spoken, stimulusText);
      const bigram = bigramOverlap(spoken, stimulusText);
      grade.reciting = run >= RECITING_RUN || bigram >= RECITING_BIGRAM;

      stimuli.push({
        slug,
        ...grade,
        dead_air_seconds: deadAir(words, segments.filter((s) => s.phase === "recalling")),
      });
    }

    const accommodation = String(first.accommodation ?? "standard");
    const goalMinutes = Number((assignment.time_goal_minutes as Record<string, number>)?.[accommodation] ?? 25);
    const totalSeconds = Number(first.section_total_seconds ?? 0);
    const graded = stimuli.filter((s) => s.total > 0);
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
      reciting_count: stimuli.filter((s) => s.reciting).length,
      listing_count: stimuli.filter((s) => s.listing).length,
      uncoloured_count: stimuli.filter((s) => !s.coloured).length,
      worst_dead_air_seconds: Math.max(0, ...stimuli.map((s) => s.dead_air_seconds)),
      dead_air_threshold_seconds: DEAD_AIR_SECONDS,
      decoy_failures: stimuli.filter((s) => s.decoysCarried.length > 0).length,
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

    return json({ status: "graded", stimuli: stimuli.length, section });
  } catch (e) {
    console.error("[grade-rrc-section]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
