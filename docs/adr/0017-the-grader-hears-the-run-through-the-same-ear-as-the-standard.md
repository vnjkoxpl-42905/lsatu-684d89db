# 0017 — The grader hears the run through the same ear as the standard

Date: 2026-09-01
Status: accepted
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
