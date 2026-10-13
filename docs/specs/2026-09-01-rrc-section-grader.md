# Spec — Read, Recall, Colour: the grader

Date: 2026-09-01
Status: designed, not built
Extends: [2026-08-31-rrc-section-mode.md](./2026-08-31-rrc-section-mode.md)
Decides: [ADR 0017](../adr/0017-the-grader-hears-the-run-through-the-same-ear-as-the-standard.md) · [ADR 0018](../adr/0018-full-coverage-is-not-a-hundred-percent.md) · [ADR 0019](../adr/0019-a-grade-the-student-can-write-is-not-a-grade.md)

## 1. What this is

The section runner is built and writes a complete record of a run. Nothing reads
it. A student finishes 23 stimuli, sees "Your Report Card comes next"
(`SectionRunner.tsx:388`), and is returned to the activity intro screen. This
spec is the other half: what turns that record into a Report Card.

It grades one finished section, server-side, after she stops. Nothing here runs
during the drill, and §4 of the section-mode spec still holds without amendment:
no coach in the loop, no verdict before the end.

## 2. What already exists, exactly

Everything the grader needs is written today. This is the inventory, because the
design depends on not re-deriving any of it.

**The audio.** One unbroken file per section. `useSectionRecorder.ts` starts a
`MediaRecorder` once on mount and stops it once at the end; restarting mid-run is
forbidden outright. Uploaded to the private `drill-recordings` bucket at
`<student_id>/<assignment_id>.{webm|m4a}` (`SectionRunner.tsx:294-302`). Student
and admin can read and write their own; **nobody has a delete policy**, which is
deliberate.

**The segmentation.** `mark()` records `{slug, order, phase, startMs, endMs}` at
every phase boundary, where phase is `working` or `recalling` (`section.ts:37`).
These come from the two presses of Space that ADR 0013 specified, so stimulus
boundaries are known exactly and never have to be inferred from the audio.

**The record.** One `activity_item_responses` row per stimulus, all written after
the last one, carrying `rrc` jsonb with `audio_bucket`, `audio_path`,
`audio_duration_ms`, `audio_segments`, `elapsed_seconds`, `working_seconds`,
`recall_seconds`, `section_total_seconds`, `accommodation`, `goal_minutes`, and
`transcript_segments` from the browser. `verdict` is never set. The table has
owner-or-admin SELECT and owner INSERT and **no UPDATE or DELETE policy at all**.

**The content.** The assignment's `items` snapshot carries, per stimulus, its
`chunks[]` each with `details[]`. Three sections exist: 426, 419 and 449 Details
across 22, 23 and 26 stimuli.

**The standard.** `public.model_runs`, 714 rows, Joshua's own run of every
stimulus, transcript as a column and audio in the private `model-runs` bucket.
No student can read it.

**The LLM path.** Every model call in the app goes through
`supabase/functions/gemini-proxy`, an OpenAI-compatible pass-through to the
Lovable AI Gateway on `LOVABLE_API_KEY`. There is no Anthropic or OpenAI key in
the project and no shared LLM helper; each function inlines its own fetch.

**What does not exist.** No grading code of any kind for sections. No Report
Card, no results screen, nothing that reads `drill-recordings`, nothing that
reads `model_runs`. And a finished section never reaches `completed`: the section
branch of `ActivityRunner` returns before `completeAssignment` is called, so
every RRC run ever done is still `in_progress`.

## 3. Stale contracts this supersedes

Two rows of the section-mode spec's §5 scoring table cannot be built as written,
both because ADR 0013 removed chunk tracking after that table was drafted.

**"A colour on every chunk — code — countable" is not countable.** The app does
not know which chunk she was on, so it cannot count colours per chunk. Replaced
by a per-stimulus judgement: whether she reacted to the stimulus at all, and
whether the reaction was specific to it. That is an LLM call and it is folded
into the same one that scores Coverage.

**"The Read — LLM rubric — against the captured key" is not scored at all.**
ADR 0012 replaced the takeaway with The Recall. `the_read` and `the_read_type`
stay in the content, read by nothing, as that ADR records.

Section-mode spec §3 also still documents the blur/blank chunk contract that ADR
0013 deleted. Out of scope here and flagged in §10.

## 4. The pipeline

Six stages, one edge function, triggered once per finished section.

**0 — Trigger.** The client calls `grade-rrc-section` with the assignment id
after the recording upload resolves, and does not wait for it. A sweeper
re-drives any assignment that has section responses and no grade row after ten
minutes, on the pattern `single-session-sweeper` already establishes. The client
call is an optimisation; the sweeper is the guarantee. A closed tab must never
cost a Report Card.

**1 — Transcribe.** Download the object from `drill-recordings` with the service
role, POST to Deepgram Nova-3 with word-level timestamps. Same engine that
produced the standard, for the reasons in ADR 0017. Store the transcript so the
run is replayable against a changed prompt without paying again.

**2 — Segment.** Cut the word stream by `rrc.audio_segments`. Each stimulus
yields two spans: `working` (her Reading Recalls and Colouring In, text on
screen) and `recalling` (The Recall, text gone). Coverage reads both together,
per ADR 0013; dead air reads only `recalling`.

**Before anything else is trusted, prove the clocks agree.** `startMs` is
measured from the recorder starting, Deepgram's times from the first sample in
the file, and Chrome's WebM duration metadata is unreliable. Assert that the
first stimulus's `working` span contains speech and that the last `recalling`
span ends before the file does. If they disagree the whole grade is wrong by a
constant offset and every stimulus is scored against the wrong words.

**3 — Judge.** One model call per stimulus through `gemini-proxy`. All of that
stimulus's Details in one call, which is 22 to 26 calls per section rather than
426 individual ones. Contract in §5.

**4 — Measure.** The code-graded criteria in §6. No model involved.

**5 — Write.** One `activity_section_grades` row, service role, plus
`status = 'completed'` and `completed_at` on the assignment, which nothing sets
today.

## 5. The judge contract

**Input per call:** the stimulus text, the Details with their `kind`, and what
she said (the `working` and `recalling` spans concatenated, in order).

**Three questions, not one.** ADR 0018 classifies each Detail `content` (1,133),
`structure` (137) or `modality` (24), and the judge is asked a different thing
for each:

- `content` — did she state this fact? Her own words, any order, any phrasing.
- `structure` — is this relationship present in how she told it? "This is a
  contrast." is carried by "Glass is different from steel, though". It does not
  need naming.
- `modality` — did her qualifier survive? "This is hedged as probable." is
  carried by a "probably" and lost by a flat assertion.

The classification is produced by
`system/scripts/activity-centre/classify_details.py` and travels with the
content, so the grader reads a `kind` rather than deciding one.

**The stimulus is context, not evidence.** The judge sees it so it knows what a
Detail refers to, and is told explicitly that the verdict is about her words
alone. The failure mode is the judge reasoning "the stimulus says this, so she
must have meant it", and it is the only way this call can be wrong in the
direction that flatters her.

**Decoys catch that failure per run.** Two Details from a different stimulus in
the same section are mixed into each call and must come back missed. A carried
decoy flags the stimulus for review rather than silently inflating Coverage.
Two extra judgements on twenty is a rounding error against the call's cost.

**Output:** a verdict per Detail, plus the two named failure modes from ADR
0012 — Reciting and Listing — as booleans with a one-line reason, and whether
she coloured the stimulus and whether the colour was specific to it.

**Model:** `google/gemini-2.5-flash` through the proxy, matching
`activity-coach`. The calls are independent and should run concurrently.

## 6. What code grades, not the model

**Reciting.** `longestSharedRun` and `bigramOverlap` already exist in
`recall/overlap.ts`, written for exactly this and currently used only by the v1
runner. Compare what she said against the stimulus text. High overlap is the
failure. Its own header makes the point that own-words comparison is the one
text comparison in RRC that means what it looks like, because the vocabulary
genuinely is shared.

**Time.** `rrc.section_total_seconds` against `rrc.goal_minutes[accommodation]`,
both already stored. The goal is 25 / 38 / 50 per ADR 0014.

**Dead air.** Only inside `recalling` spans. Silence during `working` is her
reading and is correct; the section-mode spec already warned that an unwindowed
detector fires on every chunk and is worse than none. With word timestamps this
is a gap threshold over one span.

**Completeness of the run.** Whether every stimulus has both spans. A section
abandoned midway writes nothing today, so a partial record means something went
wrong rather than that she stopped.

## 7. The Report Card

Per ADR 0018, each stimulus shows a **band**, not a percentage racing an
unreachable 100:

| Band | Coverage |
|---|---|
| At the standard | 86% and above |
| Nearly there | 72–85% |
| Thin | 55–71% |
| Lost it | below 55% |

Only the top boundary is measured (the 10th percentile of a 71-run census of
correct runs). The three below it are provisional until student runs exist.

Beside the band, the Details she dropped, quoted as authored. A student can be
at the standard and still be shown what she lost; those are different questions
and both get answered, which is what stops the top band reading as nothing left
to learn.

Then the section as a whole: time against her goal, Reciting and Listing tips
where they fired, and her own recording playable per stimulus.

**Joshua's model run is not unlocked in v1.** ADR 0015 flagged the trap and ADR
0019 supplies the honest input for it later — the existence of a grade row,
which she cannot write, rather than `status`, which she can. Wiring the playback
is a separate change.

## 8. Schema

```sql
create table public.activity_section_grades (
  assignment_id uuid primary key references public.activity_assignments(id) on delete cascade,
  student_id uuid not null,
  source_section text not null,
  transcript_engine text not null,          -- 'deepgram/nova-3'
  transcript_text text,
  graded_at timestamptz not null default now(),
  grader_version smallint not null,
  stimuli jsonb not null,                   -- per stimulus: coverage, band, missed[], flags
  section jsonb not null                    -- time, dead air, reciting, listing, decoy failures
);
```

Student SELECT on `student_id = auth.uid()`, admin SELECT, and **no student
INSERT, UPDATE or DELETE**. The grader writes with the service role from inside
the function. `grader_version` is what makes a re-grade after a prompt change
legible rather than mysterious.

## 9. Build order

1. `activity_section_grades` migration. Applied in Lovable, as ADR 0015's were.
2. `DEEPGRAM_API_KEY` as an edge function secret.
3. The `grade-rrc-section` function, stages 1 and 2 only, asserting the clock
   alignment on one real recording and writing nothing. This is the step most
   likely to be wrong and the cheapest to prove.
4. Stages 3 to 5, scored first against `student_shaped.py` output from the
   corpus rather than a student, because those runs have a known answer.
5. Re-run the ADR 0018 census with the built grader and confirm the 86% floor
   holds. The 71 scored runs are the expected answer; a grader that puts them
   somewhere else is wrong before any student sees it.
6. The Report Card screen.
7. The sweeper.

## 10. Out of scope

- Unlocking playback of Joshua's model run (ADR 0015's trap; needs §8's grade row).
- Closing the student-writable `activity_assignments.score` hole (ADR 0019).
- The answer-key leak: `items` already ships every Detail and `the_read` to her browser.
- Section-mode spec §3's deleted blur/blank contract, still documented there.
- Re-grading a run after content changes. `grader_version` makes it possible; nothing does it.
