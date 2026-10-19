# PT157 transcription — kickoff prompt (paste into a fresh conversation)

Open the PT157 LR set in Chrome (Claude extension signed into this same account) first, then paste everything below the line.

---

Run the `lsat-lab-transcribe` skill for **PrepTest 157, Logical Reasoning only**. My PT157 set is ALREADY open in my Chrome (Claude browser extension). It is **one set containing BOTH LR sections back-to-back** (e.g. S1/S2 or S2/S3, Q1-25 then Q1-25). Do NOT re-derive anything from old chats.

Before touching the browser, read these three files top to bottom and follow them exactly:
1. `.claude/skills/lsat-lab-transcribe/SKILL.md` — the full procedure (updated after the PT158 run; mechanics notes are current).
2. `docs/agent/handoffs/LR-TRANSCRIPTION-PROJECT.md` — the multi-test master log; PT157 is the current NEXT.
3. `docs/agent/handoffs/PT158-TRANSCRIPTION-PROGRESS.md` — reference only, to mirror the exact output format and Done-log style.

Then:
- STEP 0: invoke `claude-in-chrome`, load the tools in one ToolSearch, and **reuse my already-open PT157 tab by matching the `app.lsatlab.com/practice?...` URL** — do not open a new tab or re-navigate (that reloads to item 1 and loses my place). Confirm the bottom-left `PrepTest 157 · S# · Q#` label before starting.
- **Click the "Explanation" toggle/tab to reveal the FULL written explanation** (not the collapsed Answer view). Make sure the whole explanation is showing before you read, and capture EVERY explanation available there. Open the Question Details panel once so the real Question Type appends to every read.
- Capture **all three written styles (Standard, Brief, Another Way), verbatim** for every authored question into a single file `Explanations/PT157-explanations.md`. Both LR sections go in that ONE file under separate `# Section` headers. Skip video-only questions (log them). Read the `S# · Q#` label every item; start a new section block when it flips; stop only at a real RC boundary or the end of the set (don't assume a fixed item count).
- Keep a running `docs/agent/handoffs/PT157-TRANSCRIPTION-PROGRESS.md`, updated **every question** (Done log with the five percentages + which is Correct, any skips, and a `>>> NEXT <<<` pointer), so an interrupted run resumes from one file.
- Watch the known quirks from the skill: the post-Next dropdown collapse (recover with Show-explanations then reopen), verify each style from the returned prose before appending, normalize extracted `--` to `—`, fence ASCII logic diagrams, join dual tag-lines with ` / `.

**Context budget (important):** this is a long, token-heavy run. When your context is getting loaded (roughly 60-70% full, or if you feel responses slowing), STOP at a clean question boundary, make sure the progress file's `>>> NEXT <<<` pointer is accurate, and TELL ME so I can start a fresh conversation and paste a resume prompt. Do not push context to the limit and risk a messy mid-question cutoff.

When the whole set is done, verify with a grep (question count and 3x style blocks), update `LR-TRANSCRIPTION-PROJECT.md` (mark PT157 done, name PT156 next), and give me a short summary.
