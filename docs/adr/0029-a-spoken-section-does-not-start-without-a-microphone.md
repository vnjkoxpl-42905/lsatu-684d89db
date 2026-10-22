# 0029: A spoken section does not start without a microphone

Date: 2026-09-04
Status: accepted
Reverses part of the recorder's original intent; see Context.

## Context

`useSectionRecorder` was written so that a refused or missing microphone would
not stop the drill, on the reasoning that the section is still a valid sitting
if she is recording on a handheld device. The runner therefore counted its ready
beat to zero under the heading "Recording now" while the footer said "No
microphone. The drill still runs, but nothing is being recorded", and handed her
a full 26-stimulus section.

The grader refuses a run with no recording. There is no path by which audio
captured on a handheld reaches this assignment. So the reasoning no longer
holds: what the beat was counting into was twenty-five unrepeatable minutes of
spoken work that nothing in the system can ever mark, with no way to ask for the
microphone again and no way to stop before the clock started.

The beat was also unguarded in a second way. `getUserMedia` raises a permission
prompt the student has to answer, and answering it can take longer than three
seconds, so the section could begin while the microphone had said nothing at
all.

## Decision

The ready beat waits for the microphone to answer, and holds if the answer is
no.

While it holds, the screen says "No microphone", names the consequence -- this
drill is spoken, so there is nothing to mark at the end -- and offers both ways
forward: ask again, or leave. Nothing has started and no clock has run, so
leaving costs her nothing. Asking again re-requests permission, which is safe
here because it happens before any recording exists; restarting a recorder
mid-section remains forbidden.

The heading never claims to be recording when nothing is.

## Consequences

A student without a working microphone cannot run a Read, Recall, Colour
section. That is the point: she could not produce a gradable one before either,
and now she finds out in the first three seconds rather than after twenty-five
minutes.

The recorder's own refused-microphone path still exists and still reports the
fault. What changed is that the runner treats that report as a gate rather than
as a caption.

Every test of the section runner now grants a microphone, because a run without
one no longer reaches the loop.

## Alternatives considered

**Let her continue without a recording, and say so louder.** Rejected. The
loudest possible warning still ends in twenty-five minutes of work and no Report
Card, and the honest version of that warning is a door rather than a caption.

**Offer a "run it anyway" escape.** Rejected for the same reason. An escape that
leads only to a refused grade is a trap with a button on it.

**Keep counting while the permission prompt is open.** Rejected: it is the case
where the section is most likely to start into nothing, because a student
reading a browser dialog is not watching the beat.
