# 0017 — The grader hears the run through the same ear as the standard

Date: 2026-09-01
Status: accepted
Amended: 2026-09-04 (see "Amendment: the title was a claim the code did not honour")
Extends [0013](./0013-she-chunks-freely-and-the-app-does-not-track-it.md).

## Context

A finished section leaves two recordings of what she said, and they are not
equivalent.

The first is the audio: one unbroken file per section, `getUserMedia` into a
`MediaRecorder` started once on mount and stopped once at the end
(`useSectionRecorder.ts`), uploaded to `drill-recordings` at
`<student_id>/<assignment_id>.webm`. Nothing in the app reads it back.

The second is text: `useSectionTranscript.ts` runs the browser's
`SpeechRecognition` continuously through the section and slices it by the same
phase boundaries, and that slice is what lands in
`activity_item_responses.response_text` and `rrc.transcript_segments`, tagged
`transcript_source: "browser-speech"`.

The cheap move is to grade the text that is already there. Three things rule it
out.

`SpeechRecognition` is a Chrome interface. In Safari and Firefox it does not
exist, `said` is empty, and the writer stores `response_text: ""` with
`transcript_source: null` (it stored `null` until ADR 0027, and a null in a
NOT NULL column meant the row was never saved at all). The section still
records audio, still writes its row, and produces no text to grade — a silent,
browser-dependent hole rather than an error.

It carries no usable timing. Dead air is a graded criterion and it is only
meaningful inside The Recall, where silence is unambiguously a failure rather
than a silent read. Measuring it needs word-level timestamps.

And it is a different ear from the one that read the standard. The 1,294
Details were authored and calibrated against Joshua's own runs, and those runs
were re-transcribed on Deepgram Nova-3 on 2026-09-01 precisely because the local
Whisper model paraphrased away the hesitations and false starts that are the
content. Grading a student on a weaker transcript than the reference does not
make the grader lenient; it makes it wrong in one direction, dropping her words
before any judgement is made and charging the loss to her Coverage.

## Decision

**The graded transcript is produced server-side by Deepgram Nova-3 from the
uploaded recording.** The same engine that read the standard reads the run.

**The browser transcript stays, and is never graded.** It costs nothing, it is
the only text that exists if the upload fails, and it is useful as a diagnostic
when a Coverage score is disputed. It is stored as what it is, and the grade
records which transcript it was computed from.

**Segmentation is not an audio problem.** `rrc.audio_segments` already carries
`{slug, order, phase, startMs, endMs}` for every `working` and `recalling`
window, written from the two presses of the Space key. Deepgram's word
timestamps are cut against those offsets. Nothing has to infer stimulus
boundaries from the audio, which is the whole reason ADR 0013's second press
exists.

## Consequences

**One new secret.** `DEEPGRAM_API_KEY` in the edge function environment. It is
the first ASR dependency the app has had; every LLM call still goes through
`gemini-proxy`, and this does not change that.

**Grading is asynchronous and the Report Card has a pending state.** A 25-minute
section is one transcription plus roughly 25 judgement calls, one per stimulus.
It does not complete inside the request that finishes the section, and it must
not be tied to the tab staying open.

**Cost is not a constraint.** The whole 714-file corpus transcribed for $6.62.
A section is about $0.11.

**The offset alignment must be verified, not assumed.** Chrome's `MediaRecorder`
is known to write WebM containers with unreliable duration metadata, and
`startMs` is measured from the recorder starting rather than from the first
sample landing in the file. If the two clocks disagree, every stimulus boundary
shifts and Coverage is computed against the wrong span. The first thing the
grader proves on real audio is that a known utterance lands inside the window
that claims it.

**The corpus is the grader's regression suite.** 713 model runs, put through
`student_shaped.py` to remove the verbatim reads the student never speaks, are
runs known to be correct with a known Coverage. A change to the judging prompt
is checked by re-scoring a sample of them and confirming the distribution has
not moved. Evidence and method: `corpus/loophole-online/rrc-sections/coverage-baseline.md`.

## Alternatives considered

**Grade the browser transcript, fall back to Deepgram when it is empty.**
Cheapest, and it makes the score depend on which browser she opened. Two
students doing identical runs would get different Coverage, and the difference
would be invisible to both of them and to Joshua.

**Transcribe in the browser with a local Whisper build.** Rejected on the
finding that produced the re-transcription in the first place: the small local
model paraphrases, and paraphrase is exactly the signal Coverage reads.

**Have the grader listen to the audio directly with a multimodal model.**
Tempting, and it removes a step. Rejected because it removes the artefact: a
transcript is inspectable, diffable, replayable against a changed prompt, and
quotable back to a student who disputes a mark. An audio-native judgement is
none of those.

---

## Amendment: the title was a claim the code did not honour

Date: 2026-09-04

This ADR's title says the grader hears the run through the same ear as the
standard. Until 2026-09-04 that was true of the transcription engine and of
nothing else in the chain.

Same engine, and then two different tokenisations and two different read
strippers. The standard's transcripts went through `student_shaped.py` and its
fuzzy aligner, on `[a-z0-9']` tokens. The run went through `rrcReads.ts` and an
exact eight-word run, on Deepgram's punctuated tokens compared against
`[a-z0-9]` ones. The 2026-09-03 audit measured what that cost: 38 of 87 chunks
found on the standard's own recording, where the corpus aligner finds 86.

The engine was the asymmetry this ADR could see, because it was the one with a
name. The rest of the ear was two implementations that were never compared to
each other.

**The scope is now the whole ear, not the engine.** ADR 0024's amendment ports
the corpus aligner into the grader and states where it deliberately departs from
it and why. This ADR's requirement is the one that generalises past that port:

> A step that shapes what the judge is shown must be the same step on both
> sides of the comparison, and where it cannot be — where the two sides are
> genuinely asking different questions — the difference is measured against the
> corpus and written down, not left to be discovered by an audit.

**The two remaining known differences**, both recorded in 0024:

- The tolerance is 0.80 in the grader and 0.55 in the corpus tool. Deliberate,
  measured, and the reason is that the grader is asked whether a read happened
  at all while the corpus tool is told that one did.
- `rrcOverlap.words` still splits contractions where the alignment's
  `readWords` keeps them whole. Deliberate: ADR 0022's reciting thresholds were
  calibrated on the former's output.

**What is still unverified.** That the two ears now agree is measured on the
stripper's own output — words cut and chunks found — and not yet on a grade.
The section mean the audit compared, grader 97% against a census 94%, moves only
when this is deployed and the standard's run is re-graded. That measurement is
owed to 0024.
