# RRC: line-by-line marking against the answer key

The drill itself does not change. She still reads the whole stimulus, works
through it line by line out loud, then presses Space once to hide it and say the
whole thing back. One unbroken recording, one clock, nothing judged until the end.

What changes is everything after she finishes: the recording gets cut up to match
what was on screen, every line she rephrased gets marked against the answer key
for that line, and the Report Card shows the two side by side.

## What she gets at the end

For each question in the section:

- **Line by line.** The line as written, the key points that line contains, what
  she actually said about it, which points she carried and which she dropped, and
  a play button that plays exactly that stretch of her recording.
- **The whole thing.** Her full recall with the text off screen, marked against
  the whole answer key, plus "hear it done right" from the recording of the same
  stimulus already stored as the standard.
- **A short verdict** on how close the whole question came to the standard, with
  the big misses named rather than a wall of detail.

Section header stays as it is: overall band, coverage, time, pattern note.

## How the line split works

No extra key presses and no change to the screen — the split is worked out after
the fact from the one recording:

1. The recording is transcribed with word-level times (this already happens).
2. The words spoken while the text was on screen are matched to the lines of that
   stimulus, in order, so each line gets the stretch of speech that belongs to it.
   Order is fixed (she works top to bottom) and every line's own text is known, so
   the match is anchored, not a guess.
3. A line she never spoke about is marked as skipped rather than being credited.
4. The words spoken after she pressed Space are the whole-thing recall, unchanged.

Each line then carries its own start/end offsets into the single recording, which
is what makes per-line playback possible without ever splitting the file.

## Grading

- One AI marking pass per question, covering all of its lines plus the full recall
  in a single call, against the authored key points and the stored standard
  recording for that stimulus. Judgement is "close enough in her own words", not
  word matching, and reciting the line back verbatim still counts as a miss.
- Marking runs the moment she submits the finished section, not on a timer. The
  Report Card opens on a "marking your section" state and fills in as soon as the
  pass returns. The existing nightly sweeper stays as a backstop for a closed tab.

## Answer key check

Before building, an audit of every section in the library: every stimulus has
lines, every line has key points, and a standard recording exists for it. Anything
missing is listed for you rather than silently graded as zero.

## Technical notes

- `useSectionRecorder` / `SectionRunner` unchanged apart from continuing to stamp
  the existing `working` / `recalling` boundaries per stimulus.
- New alignment step in `grade-rrc-section`: cut the Deepgram word stream by
  `rrc.audio_segments`, then attribute the `working` words to `chunks[]` via the
  judge call; write `lines[]` into the existing `activity_section_grades.stimuli`
  jsonb (no schema change).
- Judge contract in `_shared/rrcGrading.ts` extended: input gains the chunk texts
  and the `model_runs` transcript for the stimulus; output gains per-chunk
  `{ n, spoken, start_ms, end_ms, details_caught[], details_missed[], verdict }`
  and a whole-stimulus closeness note.
- `SectionReportCard.tsx` gains a per-line block reusing the existing `useClip`
  seek-in-one-file player; ADR 0020 (one recording, many clips) still holds.
- New ADR recording that line attribution is derived after the run and never
  tracked live, so ADR 0013 (she chunks freely) is not contradicted.
- Client invokes grading immediately after the upload resolves and the Report Card
  polls; sweeper untouched.
