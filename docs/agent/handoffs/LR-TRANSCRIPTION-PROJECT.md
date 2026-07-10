# Project: Transcribe every LR section, PT101–159

Goal: every Logical Reasoning section from PrepTest 101 through PrepTest 159 has its authored LSAT Lab written explanations transcribed verbatim into ONE organized markdown file per test at `Explanations/PT<NNN>-explanations.md`.

Process is codified in the `lsat-lab-transcribe` skill (`.claude/skills/lsat-lab-transcribe/`). Run it per test. One file per test (never per-question files). Skip video-only questions (log them). Pull question type from the Question Details panel. Percentages verbatim from the badges. See [[explanation-file-layout]].

## Order
Working downward: 159 (done) → 158 (done) → 157 → ... → 101.

## Status log
- **PT159** — DONE (this covers both LR sections, labeled S1 + S3, from set questionsetid=318723). 13 authored questions transcribed into `Explanations/PT159-explanations.md`; the rest were video-only and logged in `docs/agent/handoffs/PT159-TRANSCRIPTION-PROGRESS.md`. S2 (RC) intentionally skipped (LR only).
- **PT158** — DONE. Set `questionsetid=318749` is LR-ONLY and holds a THIRD LR section: 76 items = S2 Q1-25 + S3 Q1-25 + S4 Q1-26 (S4 is 26 questions). All 76 were authored with all three written styles (Standard / Brief / Another Way); zero video-only skips. Transcribed into `Explanations/PT158-explanations.md` (228 style blocks). Per-question log in `docs/agent/handoffs/PT158-TRANSCRIPTION-PROGRESS.md`.
- **PT157** — NEXT. Need the PT157 LR question-set URL/questionsetid from Joshua (or have the tab open). Then run `lsat-lab-transcribe`.
- **PT156 → PT101** — pending.

## Notes learned on PT159
- A single 50-question LSAT Lab set usually holds BOTH LR sections (e.g. S1 Q1-25 then S3 Q1-25). Watch the bottom-left `PrepTest · S# · Q#` label and split sections in the file accordingly.
- Most LR questions on PT159 were video-only (no authored written explanation). Expect the same pattern: only a subset per test will have written explanations. That is fine; transcribe those, log the skips.
- LR only for this project. Do not do Reading Comp.
- Each test gets its own `PT<NNN>-TRANSCRIPTION-PROGRESS.md` running log (done/skipped per question) so an interrupted run resumes cleanly.

## Notes learned on PT158
- Unlike PT159, EVERY question was authored (all 3 written styles present) — no video-only skips. Do not assume the sparse pattern holds per test.
- A set can hold THREE LR sections, not just two (PT158 = S2 + S3 + S4, with S4 running to Q26). Read the bottom-left label each item; do not assume 25/section or that item 51+ is Reading Comp.
- This session the explanation-style control was a DROPDOWN (button "Explanation style"), not a segmented toggle. After each Next, the first click on the dropdown collapses the drawer; recover with the Show-explanations toggle, then reopen the dropdown. Dropdown option y-coords shift with stimulus length — screenshot to place clicks, and always verify the persisted style from the text (long formal = Standard, short = Brief, casual analogies = Another Way).
- Some styles' extracted prose renders em dashes as `--`; normalize to `—` on append. Reproduce ASCII conditional/quantifier diagrams (S4 Q12, Q14, Q17, Q25, Q26 had them) inside fenced code blocks.
