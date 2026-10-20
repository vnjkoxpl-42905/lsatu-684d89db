# RC Training Experience — Brainstorm / Discovery Notes
Date: 2026-10-20 · Goal: Define the exact learning objective, intended emotional/design experience, and interaction principles for LSAT U's paragraph-by-paragraph RC Recall drill before redesign or implementation.

## Summary / key decisions
No user design decisions recorded yet. Awaiting Round 1.

## Verified context (source inspection; not user decisions)
- Latest RC Training implementation inspected in the connected GitHub repository main branch: `src/features/reading-center/rc-recall/ContinuousRcRecallRunner.tsx`, `ContinuousRcRecallRunner.css`, `RcRecordingWaveform.tsx`, and related recording/sequence code.
- Current flow: read a paragraph visibly while capturing audio, hide text for spoken recall, continue to the next paragraph; save recordings and obtain feedback on hidden-text recall at completion.
- Pause stops the microphone recorder and active timer; Resume is provided in a modal alongside elapsed time, Save and leave, Finish early and instructions.
- Supplied screenshots show a detached left-aligned Recall paragraph button, a large separation between header and reading content, and no obvious persistent recording indicator while reading.
- Local laptop project checkout is on `codex/rc-quality`; its Reading Center folder lacks the newer `rc-recall` subfolder, so do not mistake local checkout for the latest implementation.
- Relevant design language: focused reader, disciplined spacing, clear action hierarchy, reliable recording state, restrained aesthetic; preserve functional behavior during any future redesign.

## Design tree / interview frontier
1. Primary student learning outcome (what success means).
2. Intended experiential register or vibe while reading and recalling.
3. Degree and style of on-screen guidance and recording reassurance.
Downstream choices after those settle: reader architecture and control placement; pause behavior and recovery; detailed recording/feedback treatment; responsive experience.

## Q&A log
### Round 1 — Awaiting answers
Q1 — Primary learning outcome.
Q2 — Desired experience and tone.
Q3 — On-screen guidance and recording presence.

## Open flags (pending input)
- Student learning objective and desired trade-offs -> user.
- Mood/visual direction and level of guidance -> user.
- Pause and hidden-recording screenshots for precise visual verification -> user, optional.
- Whether current deployed page precisely matches connected GitHub main at a given commit -> browser/deploy inspection.
