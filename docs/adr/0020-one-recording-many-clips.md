# 0020 — One recording, many clips

Date: 2026-09-02
Status: accepted
Extends [0013](./0013-she-chunks-freely-and-the-app-does-not-track-it.md).

## Context

The Report Card lets her play back what she said, and the useful grain is one
player per stimulus: she wants to hear how she recalled *that* argument, not to
scrub through twenty-five minutes looking for it.

The obvious way to produce twenty-six clips is to record twenty-six times. It is
also the one thing the drill forbids outright. The source method's rule is a
single unbroken take that is never paused and never stopped, and the runner
enforces it: the recorder starts once on mount and stops once at the end, with a
comment saying restarting mid-section is the one thing the drill forbids.

The rule is not ceremony. Stopping and starting a `MediaRecorder` drops audio at
every boundary, so twenty-six restarts means twenty-six small holes in exactly
the places her recall begins. One failed restart loses every stimulus after it.
And a student who hears the microphone cycle between stimuli starts performing
for it, which is the self-editing the drill exists to break.

## Decision

**Record once. Cut afterwards.**

The microphone runs unbroken for the whole section, exactly as now. When she
finishes, the single file is cut into one **Clip** per stimulus using the
millisecond marks the runner already writes to `rrc.audio_segments`, and the
Report Card shows one player per stimulus.

**A Clip is per stimulus, never per question.** Two questions can share a
stimulus: PT105.S2 has twenty-five questions and twenty-three stimuli. She read
that stimulus once and recorded it once, so cutting per question would hand her
the same audio twice under two labels and imply she did the work twice.

**The marks are the cut, and they are already trustworthy.** They come from the
two presses of the Space key that [0013](./0013-she-chunks-freely-and-the-app-does-not-track-it.md)
introduced, not from listening to the audio. Nothing has to infer where a
stimulus began.

## Consequences

**The unbroken-take rule survives contact with a feature that appeared to need
breaking it.** That is the whole point of writing this down: the next person to
want per-stimulus audio will reach for per-stimulus recording, and it will look
like the simpler design right up until the drill is quietly ruined.

**One upload, not twenty-six.** Storage, the bucket policy and the grader are
untouched. The grader already segments the same file by the same marks, so the
Report Card and the score are cut from one artefact rather than two that could
disagree.

**Cutting has to happen somewhere, and it is not free.** Either the player seeks
within one file using the offsets, or the file is split server-side into stored
clips. Seeking is the cheaper of the two and needs no new storage; splitting is
the more robust and survives a browser that seeks badly in a WebM container.
This ADR does not settle which, because the answer depends on how a real
recording behaves, and no student has yet made one.

**A Clip is only as good as the clock.** If the recorder's millisecond marks and
the audio's own timeline disagree, every Clip is offset and she hears the wrong
stimulus. That is the same alignment the grader depends on, so the two are
proved together or not at all.

## Alternatives considered

**Record one file per stimulus.** The direct route to the feature, and rejected
on the rule it breaks. Twenty-six restarts, twenty-six chances to drop audio,
and a microphone that visibly cycles while she is being asked not to perform.

**Keep the single recording and give her one player for the whole section.**
What the design said before this. It is less work and it is worse: at
twenty-five minutes she will not go looking, so the playback is present and
unused, which is the same as absent but with storage attached.

**No playback at all.** Offered in this session and declined. The argument for it
was that she is not the audience for her own hesitations. The argument against
is better: hearing herself drop the word "only" is the fastest way to believe
she dropped it.
