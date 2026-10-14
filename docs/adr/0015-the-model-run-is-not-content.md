# 0015 — The Model Run is reference data, not content

Date: 2026-09-01
Status: accepted
Extends [0010](./0010-rrc-section-is-the-unit-of-work.md).

## Context

Every section item carried two strings: `model_recording: "audio/PT105_S2_Q1.mp3"`
and `model_transcript: "transcripts/PT105_S2_Q1.txt"`. Both are rootless. They
resolve against one folder on one Mac and against nothing that deploys. Nothing
in the app read either, so this was latent rather than broken, but the grader
that is coming is server-side and cannot read that disk.

The transcripts are the priority for truth. They are the record of the drill done
correctly and the standard the 1,294 authored Details were calibrated against, so
grading depends on them in a way it does not depend on the audio.

The obvious fix is to inline the transcript text beside `the_read`, which is
already carried as text. One verified fact rules it out. `getStudentAssignment`
selects `*` from `activity_assignments`, whose student policy is
`student_id = auth.uid()`, and Postgres row-level security filters rows rather
than columns. Everything in `items` reaches her browser. That is already true of
the Details, of `the_read`, and of `correct_answer`, which is a separate problem
this ADR does not fix; it must not also become true of his verbatim recall of
every stimulus in the section she is about to run.

## Decision

**The Model Run is reference data with its own home.** `public.model_runs`, one
row per captured stimulus, holding the transcript as a column and the recording
as a `(bucket, path, sha256)` pointer into a private `model-runs` bucket.

**An item joins to it on the slug it already has.** `PT105_S2_Q1` is the
capture's own identifier and is already the item's `slug`, so there is no new
key and nothing to keep in step. Both path fields come out of `items` entirely.

**Their absence is enforced by the fixture test**, not left as a convention. The
build still refuses to assemble a section unless both halves exist on disk; it
just no longer ships their names.

**Writes are admin, not service-role.** There is no service-role key outside
Lovable, so a service-role-only table could be loaded only by pasting 621
transcripts into a browser SQL editor. Admin insert/update policies let
`load_model_runs.py` load it over PostgREST with the admin JWT already in
`~/ai-os/.env`, and keep 2.6MB of his spoken keys out of this repository's git
history, which a seed migration would not.

**Versioned, because re-transcription is coming.** 93 of the 714 recordings are
still untranscribed and the rest were produced by one Whisper pass. A better pass
writes `version = 2` and archives the old row rather than overwriting the text a
section's Details were calibrated against. A partial unique index keeps exactly
one active row per slug.

## Consequences

**The transcript is unreachable by a student by construction.** `model_runs` has
no policy granting `authenticated` select. That absence is the security property,
and it is durable in a way a column exclusion is not.

**The 1.1GB upload is no longer blocked on a credential.** It was recorded as
blocked on a service role key. With admin write policies it needs the two
migrations applied and nothing else.

**Two migrations have to be applied before anything loads.** They ship in the
repo; applying them is a step in Lovable, not a push.

**A future playback gate must not trust `activity_assignments.status`.** Students
hold UPDATE on their own assignment row, so the obvious rule for unlocking his
recording after she finishes, "her status is completed", is a boolean she can
set herself. Whatever unlocks playback has to be derived from work she actually
submitted.

**The seed shrinks slightly** and the three sections were rebuilt and re-seeded.

## Alternatives considered

**Inline `model_transcript_text` in `items`.** Rejected on the leak above. It
would also duplicate into every per-student assignment snapshot and add ~128KB
to the seed for data no client should hold.

**Transcript as a text object in the bucket beside the MP3.** One artefact, one
mechanism, and superficially tidier. Rejected because grading a section would
become 23 storage round trips for 46KB that a single indexed query returns, and
because a bucket object carries no constraint, no hash pairing, and no version.

**Bundle the transcripts into the grader function.** Fastest at run time and no
schema at all. Rejected because a transcript correction would become a redeploy,
and because it puts the corpus permanently inside the deploy artifact.

**A separate calibration-evidence table recording which Details were signed off
against which transcript.** The right instinct, and the drift it worries about is
real. Left in the brain repo as committed build evidence rather than built into
production Postgres, which would carry ~1,294 rows per generation that nothing at
run time is allowed to read.
