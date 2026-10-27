# RRC: line-by-line marking against the golden standard

The drill itself does not change. What changes is everything after she finishes:
the recording is cut to match what was on screen, every line she rephrased is
marked, and the Report Card shows her work beside the standard.

## The drill this is grading (unchanged)

One stimulus at a time:

1. She reads only the first line, silently. Nothing is said while she is looking
   at the text.
2. She looks away and says that line out loud in her own words, from memory.
3. Back to the text, next line silently, look away, rephrase. One line at a time
   until the last line. The stimulus stays on screen throughout.
4. She presses Space once. The text disappears and she restates the whole
   stimulus out loud from memory.
5. Straight to the next stimulus. No pause, no feedback, nothing judged yet.

The whole section is one run: 20+ stimuli, one unbroken recording, one clock.

## What gets captured

- Everything spoken is transcribed with timestamps.
- Every stretch of speech is tied to the stimulus that was on screen when she
  said it, and within that stimulus to the line she had just read. The
  whole-thing recall after Space is its own stretch.
- Because she reads silently and speaks only while looking away, there is a
  silent gap before every spoken line. The line split keys off those gaps plus
  line order — it never assumes continuous talking.
- So each stimulus holds: her rephrase of each line, her full recall, and the
  audio for each.

## How the split works

No extra key presses, no change to the screen. After the run:

1. The single recording is transcribed with word-level times (already happens).
2. Within each stimulus's on-screen window, speech is broken into utterances at
   the silent gaps, and the utterances are matched in order to that stimulus's
   lines, anchored by each line's own wording.
3. A line she never spoke about is marked skipped, not credited. Two lines
   covered in one breath are attributed to both rather than losing one.
4. Speech after Space is the full recall, kept whole.

Each line ends up with its own start/end offsets into the one recording, which is
what makes per-line playback possible without splitting the file.

## How it is graded

- Nothing is graded during the run. Grading runs once, the moment she submits the
  finished section, and covers every stimulus in that pass.
- Each stimulus is compared against the golden standard already stored for it:
  the standard recording's transcript plus the authored key points.
- The bar is **same points, same quality — not same words**. Phrasing may differ.
  Full marks means every point the standard makes is carried at the same level.
  Saying a line back word for word is not a rephrase and does not count.
- For each stimulus: line by line, what she carried and what she dropped; then
  the same for the full recall; then the big misses named.
- Then one overall verdict for the section: band, coverage, time, pattern note.

## What she sees on the Report Card

Per stimulus, per line: the line as written, its key points, what she said, what
she carried and dropped, and a play button for exactly that stretch of her
recording. Then the full recall marked the same way, with "hear it done right"
from the stored standard. Then the section verdict at the top.

## Answer key check

Before building, an audit of every section in the library: every stimulus has
lines, every line has key points, and a standard recording plus transcript exists
for it. Anything missing is listed for you rather than silently graded as zero.

## Technical notes

- `useSectionRecorder` / `SectionRunner` unchanged; they keep stamping the
  existing `working` / `recalling` windows per stimulus.
- New alignment step in `grade-rrc-section`: cut the Deepgram word stream by
  `rrc.audio_segments`, split the `working` words into utterances on inter-word
  gaps (threshold tuned on real audio, defaulting around 1.2s), then attribute
  utterances to `chunks[]` in order using the existing fuzzy read aligner in
  `_shared/rrcReads.ts` as the anchor, with the judge resolving ambiguity.
- Judge contract in `_shared/rrcGrading.ts` extended: input gains the chunk texts
  and the `model_runs` transcript for that stimulus; output gains per-line
  `{ n, spoken, start_ms, end_ms, points_carried[], points_dropped[], verdict }`,
  a full-recall block of the same shape, and a big-misses note. Written into the
  existing `activity_section_grades.stimuli` jsonb — no schema change.
- Verbatim recitation still fails via the existing reciting check (ADR 0018/0022).
- `SectionReportCard.tsx` gains a per-line block reusing the existing `useClip`
  seek-in-one-file player; ADR 0020 (one recording, many clips) holds.
- New ADR: line attribution is derived after the run from speech gaps and never
  tracked live, so ADR 0013 (she chunks freely) is not contradicted.
- Client invokes grading immediately after the upload resolves; the Report Card
  polls and shows a marking state; the sweeper stays as the closed-tab backstop.
