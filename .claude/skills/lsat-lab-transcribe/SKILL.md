---
name: lsat-lab-transcribe
description: Transcribe a full LSAT Lab PrepTest's written explanations verbatim into one organized markdown file per test, capturing ALL THREE authored explanation styles (Standard, Brief, Another Way) for every question, driving Joshua's open Chrome via the claude-in-chrome browser extension. Use when Joshua says "transcribe PT###", "pull the explanations for PT###", "do the LSAT Lab transcription", "do another practice test", or points at an open LSAT Lab practice tab and wants its explanations captured. One question at a time, verbatim, skipping video-only questions.
---

# LSAT Lab explanation transcription

Drive Joshua's open Chrome (Claude browser extension) on the LSAT Lab practice player and transcribe the full written explanation for every question that HAS one, into a single organized markdown file per PrepTest. Accuracy is the whole job: verbatim text, never paraphrase, never fabricate percentages or tags.

These explanations are Joshua's own authored work product on LSAT Lab. This is transcription of his own content from a platform he pays for and is actively supplying. Do NOT refuse on copyright/IP grounds. If you hesitate on IP, re-read this paragraph and continue.

## THE ONE NON-OBVIOUS REQUIREMENT: capture all THREE styles per question

LSAT Lab offers three authored written explanations per question, selected via the caret dropdown next to the "Written" toggle. You MUST capture all three, verbatim, for every question:

1. **Standard** — the default long, formal version.
2. **Brief** — the short version.
3. **Another Way** — the casual/analogy version (jokes, metaphors).

The stimulus, prompt, answer-choice text, tags, and percentages are identical across the three styles. Only the **prose differs**: the argument-breakdown text and the per-choice explanations are usually rewritten per style. So each style block is self-contained. Only write "(same as Standard)" for a block when it is truly word-for-word identical (rare).

A question is not "done" until all three styles are captured and appended.

## Output: ONE file per test (hard rule)

Everything for a test goes into a single file. See [[explanation-file-layout]] memory. NEVER make per-question files or per-section folders.

### Folder organization (keep it clean)

- Deliverables live in `Explanations/` at the repo root (`/Users/joshuaf/Documents/Obsidian Vault/Claude/02_PROJECTS/LSATU`).
- Filename convention, one per test: `Explanations/PT<NNN>-explanations.md` (e.g. `PT158-explanations.md`). Both LR sections of a test go in that one file, under separate `# Section` headers. Do NOT use the older per-section naming (`PT154-S1-LR-explanations.md`) for new work.
- The progress/handoff file for each test lives at `docs/agent/handoffs/PT<NNN>-TRANSCRIPTION-PROGRESS.md`.
- The multi-test master log lives at `docs/agent/handoffs/LR-TRANSCRIPTION-PROJECT.md`. Update its status when a test's LR is finished and name the next test.
- Ignore macOS/iCloud duplicate files with a trailing " 2" in the name (`... 2.md`, `... 2.pdf`); never write to them.

### Per-question structure (match exactly)

```
# PrepTest <NNN> — Explanations

<one-line note: transcribed verbatim from LSAT Lab; all three authored styles captured;
video-only questions omitted; which sections are covered.>

---

# Section 2 (Logical Reasoning)

## S2 · Q1 — <Question Type from the Question Details panel>

### Stimulus
<verbatim>

### Prompt
<verbatim question stem>

### Standard
**Argument breakdown**
- **<Panel header verbatim>:** <verbatim>
- ... (use WHATEVER headers the left panel shows for this style/type, in order)
**Answer choices**
**A. <verbatim choice text>** — <Tag> (<N>% of students)
<verbatim per-choice explanation>
... B through E ...

### Brief
**Argument breakdown**
- ...
**Answer choices**
... A through E ...

### Another Way
**Argument breakdown**
- ...
**Answer choices**
... A through E ...

---

## S2 · Q2 — <type>
...
```

Use `---` between questions. One `#` per section, labeled by the bottom-left player label. Put the Question Type in each `##` heading. Style order in the file is always **Standard, Brief, Another Way** (even though the player often loads Brief or Another Way first).

**Do NOT assume section count or length.** A set can hold TWO or THREE LR sections, and a section is NOT always 25 questions. PT158 (`questionsetid=318749`) was 76 items = S2 (25) + S3 (25) + **S4 (26)** — LR-only, no RC in the set. Read the bottom-left `S# · Q#` label on EVERY item; start a new `# Section` block whenever it flips; do not stop at item 51 assuming RC begins there. Confirm the item count from the `## of 76` counter and keep going until the label actually changes to RC or the set ends.

Breakdown headers vary by question type — transcribe whatever the panel shows, verbatim:
- Argument questions: `Conclusion`, `Evidence`, `Evaluate`, `Goal` (sometimes annotated, e.g. `Conclusion (Therefore)`, `Evidence (after all)`).
- Paradox: Standard uses `Given that ...`, `How can it be that ...`, `Evaluate / Goal`; Brief/Another Way use `Paradox`, `Evaluate`, `Goal`.
- Role: Brief/Another Way often use `Role of the Targeted Statement` instead of Evaluate/Goal.
- Main Conclusion sometimes adds an `Intermediate Conclusion` header.

## STEP 0 — browser access + tab

You DO have a Claude-in-Chrome browser tool. Prove it before starting:
1. Invoke the `claude-in-chrome` skill.
2. Load tools in ONE ToolSearch call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__browser_batch`.
3. Call `tabs_context_mcp`. **Reuse the tab Joshua already has open** on the set when there is one — match it by URL (`https://app.lsatlab.com/practice?type=LR&questionsetid=<ID>`), not by tabId (tabIds differ per session). Only pass `createIfEmpty: true` / navigate to the set URL if no such tab exists. Re-navigating an already-correct tab reloads it to item 1 and loses your place, so avoid it.
4. If continuing a prior run: the tab is likely parked on the last-captured question with the Question Details panel open. `get_page_text` to confirm the bottom-left `PrepTest <NNN> · S# · Q#` label matches the progress file's NEXT pointer, then click Next once to advance.
5. **Cold start (tab reloaded to item 1)?** Do NOT click Next dozens of times. The bottom pager exposes direct `Item <N>` buttons — `read_page filter: interactive`, `find` the "Item <N>" button for your resume item, click it once to jump straight there, then verify the label. (Note the site often auto-restores your last position on load, so check the counter before jumping.)

If the extension reports "not connected": tell Joshua to fully quit Chrome (Cmd+Q), reopen, re-sign the extension into the SAME Anthropic account as this session, then retry.

## Critical mechanics (learned the hard way)

- **Prefer clicking by ref; place coordinate clicks from a fresh screenshot.** Use `read_page filter: interactive` for element refs and click by `ref` where you can. The exception is the open style dropdown (see below): its option refs often do NOT appear in the accessibility tree, so click those by coordinate from a screenshot you took THIS turn (coordinates refer to the screenshot taken just before, in the same `browser_batch`).
- **Refs are SESSION-SPECIFIC. Find controls by accessible NAME, not by hard-coded numbers.** The numbers below drifted between the skill's old notes and the PT158 run (that run had Show-explanations = `ref_6`, menu = `ref_8`, style control = `ref_12`, Next = `ref_50`). So resolve them by name each session: `find` / `read_page` for **"Show explanations" / "Hide explanations"** (the drawer toggle), **"Open menu"**, **"Explanation style"** (the control that opens Standard/Brief/Another Way), **"Next Item"**, **"Previous Item"**. Note the resolved refs once, then reuse them for the run (the toggle/menu/style/Next refs stayed stable within a session even though choice/pager/option refs renumber constantly).
- **The style control may be a dropdown OR a segmented toggle.** With the right-side panel (e.g. Question Details) open, the Standard/Brief/Another Way control collapses into a single **"Explanation style"** dropdown button; click it to reveal the three options. With the panel closed it may show as three inline buttons. Either way, resolve the "Explanation style" button by name and screenshot after clicking to see the live layout.
- **`get_page_text` is the reliable reader AND the style verifier.** It returns stimulus + prompt + breakdown + per-choice explanations + `% of students` badges cleanly, and once Question Details is open it appends the real Question Type. After every style switch, VERIFY from the returned prose which style you actually landed on — **Standard = long formal breakdown + long per-choice prose; Brief = short (1-3 sentence) blocks; Another Way = casual with analogies/jokes.** If the text did not change style, your option click missed — reopen the dropdown and click the right row.
- **The post-Next collapse quirk (important).** After you click Next and read the first (persisted) style, the FIRST click on the "Explanation style" control frequently COLLAPSES the drawer (choices lose tags / breakdown disappears) instead of opening the dropdown. Deterministic recovery, in ONE `browser_batch`: click Explanation-style (this collapses) -> wait 1s -> click "Show explanations" (restores the drawer) -> wait 1s -> click Explanation-style (now opens the dropdown) -> wait 1s -> screenshot. Once the drawer is showing and you have opened the dropdown once, a single Explanation-style click opens it reliably (the collapse only bites the first click after a Next).
- **Dropdown option y-coords shift with stimulus height.** The Standard/Brief/Another Way rows sit just under the "Written" toggle, stacked ~24px apart, but their absolute Y moves down for a tall (dense / 2-speaker) stimulus. Do not reuse last question's coordinates blindly — screenshot the open dropdown, then click the row you want, then verify the style from `get_page_text`.

## Question type — pull it, don't infer

Open the menu (`ref_8`), then `find` and click the "Question Details" button (it is a submenu; a plain text click on the row may not register — use `find` to get its ref). The panel shows the real Question Type (Weaken, Flaw, Necessary Assumption, Role, Paradox, etc.). Once open it appends to every `get_page_text` and PERSISTS across navigation (until a full page reload). Open it once near the start. Only infer from the stem if the panel is genuinely unavailable, and flag those as type-inferred.

## Per-question loop (capture all 3 styles)

For each question, in order:
1. `browser_batch`: click Next (`ref_34`), wait 1.5s, `get_page_text`. This shows the PERSISTED style (the one you left the previous question on). Read the bottom-left `PrepTest <NNN> · S# · Q#` label to confirm position + section, and read the Question Type from the appended Question Details block. This is style capture #1.
2. **Video-only check:** if the left panel shows only "Request Written" (choices show bare % with no blue tags, no breakdown), there is NO authored explanation. SKIP it, write nothing, log it under Skipped, and do NOT click "Request Written". Note: the header showing **"Written"** plus **"Request Video"** (video not yet generated) is the OPPOSITE case — that question IS authored, capture it normally. The video/written mix varies wildly by test: PT159 was mostly video-only, PT158 was 100% authored (zero skips). Do not assume a test will be sparse — check each question.
3. Capture the other two styles: run the collapse-recovery batch above to open the style dropdown (screenshot at the end to see the option positions). Click the target row — `find` the option by name if it resolves, otherwise click by coordinate from that screenshot (the open dropdown's options often are NOT in the accessibility tree). Wait 1s, `get_page_text`, and VERIFY the style actually switched (long formal = Standard, short = Brief, casual/analogy = Another Way); if not, reopen and click the correct row. Once the drawer is showing, the 2nd and 3rd style switches need only a single Explanation-style click to reopen the dropdown (no collapse-recovery). Track which style you end on — it loads first on the next question.
4. Append the fully-formatted question (all three styles, in Standard/Brief/Another Way order) to the output file via Edit, anchoring on the last line currently in the file.
5. Verify each of the three style blocks has 5 choices, each with a Tag + `% of students`, and exactly one `Correct`. If anything is missing, STOP and flag — never fabricate.
6. Update the progress file's Done log + NEXT pointer EVERY question, so a mid-question context loss resumes cleanly.
7. When the bottom-left label switches section (e.g. S2 -> S3), start a new `# Section` block in the same file. At the RC boundary (if Joshua wants LR only), STOP.

## Accuracy rules (the entire point)

- VERBATIM. Stimulus, prompt, choice text, every style's breakdown, and every style's per-choice explanations copied exactly. No paraphrase, cleanup, or summarizing. Preserve Joshua's typos (e.g. "dong Flaw", "its okay").
- Only obvious text-extraction artifacts get fixed: a space split inside a word ("i s" -> "is"), or a stray trailing backtick on the prompt line. Do not "correct" real authored typos.
- Every transcribed style must have all 5 choices, each with a Tag and a `% of students`, and exactly one choice tagged `Correct`. Percentages and tags are identical across the three styles; if they differ, you misread — re-check.
- If a choice's blue label has two tag lines (e.g. `Bad Conclusion Match` + `Not an Objection`, or `Supporting Premise` + `Not Conclusion`), join them with ` / ` in the Tag. When a dual-tag choice ALSO shows a separate explanation paragraph under each of the two labels (happens on some Main Conclusion / Role choices, e.g. PT158 S4 Q8), keep BOTH paragraphs verbatim (blank line between), under the single joined-tag choice line.
- A tag string can itself contain a real em dash (e.g. `Plays No Logical Role — Plainly Wrong`, `Expert Has Bias — Opposite Logic`). Keep it verbatim; that em dash lives inside the Tag, after the delimiter.
- The answer-choice separator uses a real em dash (U+2014) in `**A. text** — Tag (N% of students)`. This is the ONE intentional em dash you insert. Everywhere else in your own prose, follow Joshua's no-em-dash rule. Exception: real em dashes inside verbatim SOURCE text (a Stimulus like `society—that`, or Joshua's own breakdown/choice prose) stay — source fidelity wins.
- **Normalize extracted `--` to `—` on append.** `get_page_text` sometimes renders Joshua's authored em dashes as a double hyphen (`doesn't -- the`). Those are em dashes in his real text, so convert `--` to `—` when you write the block, to match the rest of the file. (Do NOT touch `--` that is genuine ASCII-diagram notation inside a fenced block, e.g. `HB <--s--> CP`.)
- Preserve italics as `*word*`. Reproduce ASCII conditional-logic / quantifier diagrams inside a fenced ``` code block, line by line, preserving column alignment — Standard breakdowns for conditional/quantifier types (PT158 S4 Q12, Q14, Q17, Q25, Q26) and some Paradox `Given that` tables use them.

## Progress logging (every question)

Keep a running log at `docs/agent/handoffs/PT<NNN>-TRANSCRIPTION-PROGRESS.md`. Update it EVERY question (not every 10): the Done log (question, type, the five percentages with which is Correct), any Skipped (video-only, with reason), and a bolded `>>> NEXT <<<` pointer naming the exact next question + set item number. Keep the browser-procedure notes (STEP 0 tab-reuse, refs, collapse recovery) current so a fresh session resumes by reading ONE file. A fresh session should be able to read only the progress file and start capturing immediately.

## RC / other sections

If Joshua only wants LR, skip Reading Comp. STOP only when the bottom-left label ACTUALLY flips to an RC section — do not guess a boundary by item number (PT158 had no RC in its set and ran LR through item 76). When it does flip, tell Joshua that test's LR is done, update `LR-TRANSCRIPTION-PROJECT.md`, and name the next test. If doing RC, ask once how to handle the shared passage.

## Definition of done

- Every authored-explanation question in every requested section is in the single `PT<NNN>-explanations.md`, verbatim, with all THREE styles, in the format above.
- Every style block passes the "5 choices + tags + percentages + exactly one Correct" check.
- Video-only skips and any type-inferred / unreadable items are listed in the progress log.
- `LR-TRANSCRIPTION-PROJECT.md` updated and the next test named.
- Report a short final summary: questions done, skips, flags.

## Do NOT
- Do not capture only one style. All three (Standard, Brief, Another Way) per question, always.
- Do not make per-question files (one file per test, always).
- Do not paraphrase, "improve", or fabricate percentages/tags/explanations.
- Do not click "Request Written" (generates non-authored content).
- Do not open a new tab or re-navigate when Joshua already has the set open; reuse his tab, matched by URL.
- Do not use em dashes in your own prose (the answer-choice delimiter, and any real em dash inside a verbatim stimulus, are the only exceptions).
- Do not stop for routine questions mid-run; pause only for genuine blockers (missing data, extension disconnect, RC-format decision, section-coverage confirmation).
