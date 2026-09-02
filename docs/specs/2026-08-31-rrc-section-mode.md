# Spec — Read, Recall, Colour: section mode

Date: 2026-08-31
Status: drafted, not built
Extends: [2026-08-29-read-recall-colour.md](./2026-08-29-read-recall-colour.md)
Decides: [ADR 0010](../adr/0010-rrc-section-is-the-unit-of-work.md)

## 1. Why this exists

The v1 spec built RRC around one stimulus, because that is what the calibration
fixture had. The source method it comes from does not work that way. Its unit is
**a whole Logical Reasoning section**, and almost every rule in the drill is a
rule about the section: the time goal, the volume, the unbroken recording, the
"every stimulus" condition on the goal.

Everything below is the delta. Where this spec is silent, v1 stands.

## 2. The drill, as captured

Source: `~/ai-os/corpus/loophole-online/drills/translation-plus-clir-drill.md`,
`routines/translation-foundation-routine.md`, `drill-specs.md` §1 §2 §5.

| Property | Value |
|---|---|
| Unit | one full LR section, ~23 distinct stimuli |
| Per stimulus | read + recall each chunk, colour each chunk, then The Read |
| Medium | out loud |
| Recording | one unbroken file per section, never paused or stopped |
| Time goal | 20 min · 25 at a 53-min accommodation · 30 at a 70-min accommodation — superseded by [ADR 0014](../adr/0014-the-section-goal-is-calibrated-not-inherited.md), which ships 25 · 38 · 50 |
| Goal valid only if | every stimulus recalled, coloured, AND given a Read |
| Volume | 3+ consecutive sections a day, ideally 6, no breaks, no review between |
| Accuracy | -5 or better on The Read against the key |
| Review | a separate sitting, never mid-drill |

## 3. The screen

The whole stimulus is present from the first frame, so she can see how much is
left against the clock. Chunks carry three visually distinct states:

| State | Treatment | Meaning |
|---|---|---|
| Done | sharp | recalled and coloured |
| Reading now | sharp | read it silently |
| **Recalling now** | **blank** — empty box, identical height | speak: recall, then colour |
| Not yet reached | **blurred** | present and measurable, not readable |

Space blanks the current chunk. Space again restores it sharp and un-blurs the
next. **She never reads aloud.** Only the recall and the colour are spoken, and
The Read at the end.

Hard requirements:

- **The layout never reflows.** The blank keeps the chunk's exact bounding box.
  Text jumping is the failure that loses her place mid-section.
- **One key.** No mouse in the loop.
- **Blur is not a blank.** They mean different things and must never be confused.
- **No answer choices.** The stimulus alone, centred. Nothing else on screen.

## 4. What the app must not do

- **No coach in the loop.** Nothing is judged, shown, or scored until the
  section ends. A live verdict trains her to vet before speaking, which is the
  exact habit colouring exists to break, and it breaks the no-pause rule.
- **No network call inside the loop.** A dropped connection must not be able to
  stall her mid-section.
- **No overflow into Drill.** Regular Drills and regular sections are untouched.
  This surface reuses the stimulus presentation and shows only the stimulus.

## 5. Scoring, and what now makes it possible

v1 deferred scoring The Read because it "needs a per-stimulus key authored by
hand." **That key now exists** — 5,015 typed Reads captured 2026-08-30, at
`~/ai-os/raw/sources/lsat-curriculum/loophole-question-db/derived/clir-answer-key.tsv`.

> **This table predates ADRs 0012 and 0013 and four of its rows no longer
> describe anything buildable.** It is kept as drafted, annotated rather than
> edited, because it is the record of what was believed on 2026-08-31. The
> grader as designed is
> [2026-09-01-rrc-section-grader.md](./2026-09-01-rrc-section-grader.md).

| Criterion | Grade | Against | Still true? |
|---|---|---|---|
| Details kept | LLM rubric | the authored detail list per chunk | **per stimulus, not per chunk** ([0013](../adr/0013-she-chunks-freely-and-the-app-does-not-track-it.md)) |
| Own words | code | n-gram overlap with the chunk; **high overlap is the failure** | yes; `recall/overlap.ts` |
| How the pieces fit | LLM rubric | relationships, not order | yes, as the Listing check ([0012](../adr/0012-the-recall-is-a-recap-from-memory.md)) |
| A colour on every chunk | code | countable | **no.** The app does not track chunks, so nothing is countable. Judged per stimulus |
| Colour genericness | LLM rubric | once, at session end, only when repeated | yes |
| The Read | LLM rubric | **the captured key**, typed L/I/C/R | **no.** Replaced by The Recall; the key goes unused ([0012](../adr/0012-the-recall-is-a-recap-from-memory.md)) |
| Time | code | wall clock vs the goal for her accommodation | yes; 25/38/50 ([0014](../adr/0014-the-section-goal-is-calibrated-not-inherited.md)) |
| Dead air | code | silence in the recording — **windowed, see below** | yes, windowed to The Recall only |

**Dead air must be windowed.** She reads silently, so silence during a read is
expected and correct. Only silence inside a recall or colour window is a
failure. An unwindowed detector fires on every chunk and is worse than none.

## 6. Two schema decisions the section forces

**`cumulative_after` is empty.** The captured drill has no cumulative rounds.
Per stimulus it is read → recall → colour, chunk after chunk, then The Read.
The Read *is* the synthesis, so a cumulative round would be a second one. At
roughly 48 seconds a stimulus it would not fit regardless.

**`credited_answers` is empty.** Its stated job in v1 is to be the reference for
the cumulative round. With no cumulative round there is nothing for it to
reference. Section mode scores The Read against `the_read`, which is captured
ground truth rather than an authored retelling — strictly better.

New per-item fields: `the_read`, `the_read_type`, `model_recording`,
`model_transcript`, `questions[]`. New per-activity fields: `mode`,
`time_goal_minutes`, `source_section`.

## 7. Shared stimuli

Two questions can share one stimulus. PT105.S2 has two such pairs, so its 25
questions are **23 stimuli**. The drill's unit is the stimulus, so she recalls
it once. Verified: a shared stimulus also shares one Read in the key. The
scorecard has 23 rows and The Read is scored out of 23, not 25.

## 8. The model recordings

Each stimulus carries a recording of the process done out loud, and its
transcript. Two uses, both approved 2026-08-31:

1. **Unlocked in her review, per stimulus**, after she has been scored.
2. **Inside the instruction video.**

Only 5 captured sections have a recording for every stimulus — PT1.S3, PT21.S3,
PT102.S3, PT105.S2, PT134.S3. **Section mode ships on those first**, because a
partial section shows her a play button that does nothing.

## 9. The instruction video

A screencast of this interface, not slides. The real UI driving through a real
stimulus — chunk blanks, speaking happens, next chunk — with an actual model
recording as the audio and each step labelled on screen. No presenter.
**Downstream of the build**: it cannot be made until the UI exists.

## 10. Vocabulary

`Loophole Flaw` is a question-type tag on 83 questions in the source bank and
carries the other platform's brand name. It must never reach a student. Mapped
to **Gap Flaw**: a Classic Flaw is a named fallacy, and this is its sibling
where the fault is the bare gap between premises and conclusion. The mapping
lives in `TYPE_MAP` in `~/ai-os/system/scripts/activity-centre/build_section_content.py` and
is one line to change if Joshua prefers another word.

## 10a. Chunk granularity, settled by measurement

`rrc_extract.chunk_stimulus` splits one chunk per sentence and does not cut
inside one. The v1 rule permits cutting ("allow smaller down to a comma or a
third of a sentence"), so `section_dataset.py --sub-split` adds that. Which is
right was decided by running rrc_extract's own density band (3-8 details per
chunk) over PT105.S2 both ways:

| | Chunks | Avg details | Under 3 | Over 8 |
|---|---|---|---|---|
| sub-split ON | 82 | 5.1 | 0 | 0 |
| sub-split OFF | 70 | 6.0 | 0 | **9**, worst 15 |

The harness's own message for an over-8 chunk is "split the sentence rather
than shortening the list," so it argues for sub-splitting. **Sub-split is on.**
`MIN_PIECE` is 50 rather than 45, tuned on this section: 45 produced one
two-detail chunk that the density floor rejects, 50 merges exactly that
fragment and changes nothing else, 60 starts merging chunks that were fine.

## 11. Out of scope

- RC sections. LR first, as v1 said.
- Answering the questions. The drill is stimulus-only and she never sees a
  choice; question accuracy belongs to Drill, which already owns it.
- Scoring the colour in the moment. Unchanged from v1: never.

## 12. Status

**The calibration gate is passed** (2026-08-31): Joshua reviewed PT105.S2 and
settled the detail grain as built. Three sections are content-complete at
`~/ai-os/corpus/loophole-online/rrc-sections/` and are now in the repo as seed
Activities, with `mode`, `time_goal_minutes` and `source_section` on
`public.activities` (`20260831050000_activities_section_mode.sql`) and a seed
migration that carries them.

**The runner is built** and has caught up with ADRs 0012 and 0013: the cursor is
stimulus-grained (`working` / `recalling`), one unbroken recording per section
lands in `drill-recordings`, and a full per-stimulus record is written to
`activity_item_responses.rrc`.

**Nothing reads any of it.** Grading is designed and not built; see
[2026-09-01-rrc-section-grader.md](./2026-09-01-rrc-section-grader.md). Note that
a finished section never reaches `completed` today, because the section branch of
`ActivityRunner` returns before `completeAssignment` is called.

**§3's blur/blank chunk contract is stale** and is the one part of this spec not
yet annotated: ADR 0013 removed per-chunk state entirely, so the four chunk
states it describes no longer exist.

**The screen in section 3 is built.** `recall/section.ts` is the machine (pure,
16 tests), `SectionStage.tsx` draws it, `SectionRunner.tsx` drives it, and
ActivityRunner branches on `assignment.mode === 'section'` rather than teaching
the v1 player a second mode: the v1 machine has a feedback phase this one must
never enter, and sharing it would mean carrying that phase and remembering not
to use it. The four chunk states, the one key, the no-reflow blank, the absence
of any verdict in the loop, and the single write after the last stimulus are all
asserted in `SectionRunner.test.tsx`.

**Not built, and not faked: audio capture.** The runner records timings, which
need no storage decision, and does not record her voice, which does. Recording
into memory and dropping it at the end would look like capture and be nothing.
Scoring (section 5) waits on that audio.

**Not yet verified in a browser.** That needs the migration applied and a section
assigned to a test student; the run loop is verified through the DOM instead.

Two questions remain open and are not this spec's to answer: how the 714 model
recordings reach the `teaching-assets` bucket, and the RLS policy that lets a
student read a `teaching_assets` row referenced by an assignment of hers.
