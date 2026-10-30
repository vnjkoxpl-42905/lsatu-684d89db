# RRC section grading — the end-of-section scorecard: Brainstorm / Discovery Notes
Date: 2026-09-01 · Goal: settle every open decision needed to BUILD the full grading pass for Read, Recall, Colour section mode, so a finished section produces a complete scorecard with nothing judged, shown, or scored mid-drill.
Mode: **docs mode** (glossary challenged, ADRs written as decisions crystallise)

Predecessor capture: [[2026-08-31-rrc-section-mode-and-grading]] — read in full before Q1. Everything it decided is treated as settled and is NOT re-asked.

## Locked before the interview (from Joshua, today)
1. **Full scorecard.** All eight criteria of spec §5, not a subset.
2. **Grading runs strictly after the last stimulus.** *"Only grade at the end of the section. There should be no delay or pausing during the actual section component... there's no grading or review until they see it all at the end."*
3. **The drill never stops.** *"It shouldn't stop the drill at any point, so it's actually just one after another."*
4. **Everything in one place at the end.** *"I want you to have all of the drills and scores at the final point."*

## Already settled by the 2026-08-31 capture (do not re-ask)
- Unit of work = one full LR section (ADR 0010).
- The live per-chunk coach leaves the loop in section mode (Q2). Already implemented: `SectionRunner` never calls `useRecallCoach`.
- Audio + transcript + timings all retained (Q3).
- She reads silently; only recall, colour and The Read are spoken (Q4) — so ANY verbatim run in the transcript is unambiguous evidence of reciting.
- Dead air must be windowed: silence in a read window is correct, silence in a recall/colour window is the failure (Q4).
- Review shape = per-stimulus scorecard + section summary (Q6). Per stimulus: details kept vs missed · own words vs recited · a colour on every chunk · her Read beside the key's. Section header: time vs her goal · Read accuracy out of ~23 · one pattern note.
- Model recordings unlock per stimulus in her review (Q7).
- `-5 or better` is READ accuracy, not question accuracy: at most 5 bad Reads across the section.

## What exists in code today (verified 2026-09-01)
| Criterion (spec §5) | Machinery | State |
|---|---|---|
| Details kept | `supabase/functions/activity-coach` (numbered `ideas[]` in, `covered[]` out) + `recall/useRecallCoach.ts` | **Exists, wrapped for RRC already** |
| Own words | `recall/overlap.ts` — `longestSharedRun`, `bigramOverlap` | **Exists, tested** |
| How the pieces fit | — | Not built |
| Colour on every chunk | — | Not built; needs recall/colour separated within one spoken turn |
| Colour genericness | — | Not built |
| The Read | ground truth present: `the_read`, `the_read_type` (L/I/C/R) on every item | Scorer not built |
| Time | `rrc.section_total_seconds`, `goal_minutes`, `accommodation` written on every row | **Data exists**, no comparison rendered |
| Dead air (windowed) | `rrc.audio_segments` ms offsets per portion + one unbroken file | **Windows exist**, no silence detection |

Her words are stored two ways per portion: `rrc.transcript_segments` (best-effort browser SpeechRecognition) and `rrc.audio_segments` (ms offsets into the one uploaded file). `SectionRunner.tsx:379-386` states the audio is the record "a proper transcription runs against later" and that a blank transcript must read as "not captured", never as silence.

**Nothing anywhere reads `activity_item_responses` back for a section.** That is the gap.

## Glossary collisions found before Q1 (docs mode)
Source: `projects/lsatu/src/features/activity-centre/CONTEXT.md`.
1. **"Grade" is explicitly on the avoid list** for **Verdict** (`correct`/`partial`/`incorrect`), and **"grader" is on the avoid list** for **Coach**. Joshua's ask is literally "grade her at the end". A section-level result is a new concept the glossary has no word for — flagged on 2026-08-31, still unresolved.
2. **"Scorecard" is undefined but already in use** for the MCQ Drill results screen (`PracticeSetResults.tsx`, ADR 0011, `GuidedDrillStart.tsx`). Reusing it for the RRC section review would overload it across two engines the glossary works hard to keep apart.
3. **A Verdict is per-response and three-valued.** A recall is neither correct nor incorrect — it is a set of details that did or did not survive (`useRecallCoach.ts:45-47`). Section mode needs a result type the glossary does not have.

## Summary / key decisions
(running synthesis, updated as we go)

## Q&A log

## Open flags (pending input)
- Carried from 2026-08-31, still open: the 714 MP3s into `teaching-assets`; RLS for student read of an assigned asset; confirm or replace "Gap Flaw"; which of the remaining eligible sections to build next.
- The microphone path has never run with a real microphone. Auto-advance, recording upload and live transcription are unverified end to end.
