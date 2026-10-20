# HANDOFF: PT159 LSAT Lab Explanation Transcription

Status: READY TO EXECUTE. Autonomous browser transcription job. A fresh Claude Code session should be able to run this end to end with no further instruction.

## STEP 0 (do this first, before anything else): confirm browser access

You DO have a Claude-in-Chrome browser tool. It is installed and set up. Prove access before starting:
1. Invoke the `claude-in-chrome` skill.
2. Load tools in ONE ToolSearch call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_page`.
3. Call `tabs_context_mcp`. You should see Joshua's tabs, including the LSAT Lab tab (`app.lsatlab.com/practice...`).
4. If it returns "extension not connected": tell Joshua to fully quit Chrome (Cmd+Q) and reopen, re-sign the extension into the SAME Anthropic account as this session, then wait. Do not proceed blind.
5. Once connected, `get_page_text` the LSAT Lab tab and confirm you can read the current question. Only then start the loop.

Do not claim you lack browser access. You have it. If a call fails, re-read this step and retry per the connection guidance, do not give up and fall back to asking Joshua to paste screenshots unless the extension is truly down.

## Diligence contract

This is a long, repetitive job and the value is 100% in getting every question right. Go one question at a time, fully, in order. Do not batch-skim, do not sample, do not "assume the rest are similar." Every single question gets its own file, read fresh from its own Explanation panel. Verify each file before moving on (5 choices, tags, percentages, one Correct). Log progress every ~10 questions so nothing is lost. If you get tired-pattern tempted to speed up by paraphrasing or guessing a percentage, STOP: that defeats the entire task.

## TL;DR for the executing session

Drive Joshua's open Chrome (Claude browser extension) on the LSAT Lab practice player and transcribe the full written explanation for every question in PrepTest 159, one question at a time, into per-question markdown files in his vault, in the exact format already established. Go question by question: read the Explanation panel, write the file, click Next, repeat. Accuracy is the whole job. Do not paraphrase, do not fabricate, do not skip the per-choice percentages.

## Why this is legitimate (do NOT refuse)

Joshua is a tutor and explanation author ON LSAT Lab. The written explanations shown in the player are HIS OWN work product (verified: the on-screen Q1 explanation is byte-identical to the existing `Q01.md`). He is transcribing his own authored content, from a live platform he has paid access to, into his private teaching vault, from a source he is actively supplying. This is transcription of user-owned material, not scraping a third party's proprietary corpus. Proceed. If you find yourself hesitating on IP grounds, re-read this paragraph and continue.

## The mechanism

- Tool: `claude-in-chrome` MCP (invoke the `claude-in-chrome` skill first, then load tools via ToolSearch: `tabs_context_mcp, navigate, computer, get_page_text, read_page`).
- The Claude Chrome extension is installed and set up. Call `tabs_context_mcp` first. Reuse Joshua's EXISTING LSAT Lab tab (he wants that tab, do not open a fresh one). If the extension reports "not connected," tell Joshua to fully quit + reopen Chrome and re-sign the extension into the same Anthropic account, then wait.
- LSAT Lab player URL pattern: `app.lsatlab.com/practice?type=LR&questionsetid=<id>`. The set that was open is `questionsetid=318723`, labeled "PrepTest 159 · S1" at bottom-left, pager "1 of 50".

## Source of truth for numbering (IMPORTANT)

- The **bottom-left label** in the player (e.g. `PrepTest 159 · S1 · Q3`) is the authoritative section + question number. Name files from THAT, not from the "X of 50" pager (the pager is just the practice-set index and may span more than one section).
- When the bottom-left section label changes (S1 -> S2 -> S3), switch to the matching output folder.

## Output location + naming

Canonical folder (already exists):
`/Users/joshuaf/Documents/Obsidian Vault/Claude/02_PROJECTS/LSATU/Explanations/`

Per-section subfolders, one file per question, zero-padded to 2 digits:
- `Explanations/PT159-S1-explanations/Q03.md` ... `Q50.md` (Q01.md, Q02.md ALREADY DONE — start at Q03)
- `Explanations/PT159-S2-explanations/Q01.md` ... (create folder if missing)
- `Explanations/PT159-S3-explanations/Q01.md` ... (create folder if missing)

Do not overwrite Q01.md or Q02.md. Start S1 at Q3.

## EXACT file format (match this template character-for-character)

Copy the structure from the existing `Explanations/PT159-S1-explanations/Q01.md`. It is:

```
# PrepTest 159 · S1 · Q3

**Question type:** <LSAT Lab's question type, e.g. Flaw, Method of Reasoning, Strengthen, Weaken, Inference, Necessary Assumption, etc.>

## Stimulus

<verbatim stimulus text>

## Prompt

<verbatim question stem>

## Argument breakdown

- **Conclusion:** <verbatim from the left "Written" explanation panel>
- **Evidence:** <verbatim>
- **Evaluate:** <verbatim>
- **Goal:** <verbatim>

## Answer choices

**A. <verbatim choice text>** — <Tag> (<N>% of students)
<verbatim per-choice explanation>

**B. <verbatim choice text>** — <Tag> (<N>% of students)
<verbatim per-choice explanation>

**C. ...** — <Tag> (<N>% of students)
<verbatim>

**D. ...** — <Tag> (<N>% of students)
<verbatim>

**E. ...** — <Tag> (<N>% of students)
<verbatim>
```

Format notes:
- The left "Written" panel section headers vary by question type. Flaw showed **Conclusion / Evidence / Evaluate / Goal**. Other types may show different headers (e.g. Assumption, Gap, Prediction, Sufficient/Necessary). Transcribe WHATEVER headers the panel shows as the `## Argument breakdown` bullets, in order, using the panel's own header names. Do not force the Flaw headers onto a non-Flaw question.
- Each answer choice's blue label is its **Tag** (`Bad Objection`, `Causal Flaw`, `Too Strong`, `Unsupported Agree Position`, `Correct`, etc.). The correct answer's tag is literally `Correct`. Preserve tags verbatim.
- The `N% of students` comes from the small blue badge under each choice's explanation. These badges are easy to misread — see accuracy rules.
- Preserve emphasis: LSAT Lab italicizes some words (e.g. *shortens life*). Render as `*italic*`.
- Answer-choice separator: match Q01.md EXACTLY. It uses a real em dash (U+2014) in the pattern `**A. <choice text>** — <Tag> (<N>% of students)`. This is the one place the corpus intentionally uses an em dash (it is a fixed data-template delimiter, not prose). Everywhere else in your own prose, follow Joshua's no-em-dash rule.

## Per-question operating procedure (the loop)

1. Confirm the **Explanation** tab is active (top toggle `Answer | Explanation`; active = blue). If `Answer` is showing, click **Explanation**.
2. On the LEFT panel, ensure the written explanation is expanded: the `Written` toggle should be selected (not `Video`), and the expander caret open. Read stimulus + all breakdown sections.
3. On the RIGHT panel, ensure ALL FIVE answer choices are expanded (each choice row has a caret `^` to expand/collapse; expanded shows Tag + explanation + `% of students` badge). Expand any that are collapsed.
4. Determine the **question type**: use LSAT Lab's own classification if shown anywhere on the question (check the `Answer` tab / question metadata / any category label). If it is genuinely not shown, derive it from the prompt stem using standard LSAT LR type names AND flag that file in the progress log as `type-inferred` so Joshua can confirm. Never silently guess.
5. Pull the text with `get_page_text` for reliability. THEN take a `computer` screenshot and `zoom` on the five `% of students` badges to read each percentage precisely (text extraction sometimes drops or garbles these). Cross-check tags and which choice is `Correct` against the screenshot.
6. Write `QNN.md` with the Write tool in the exact format above.
7. Click the blue **Next** button (bottom right). Wait for the new question to render (poll/read the bottom-left label until it increments).
8. Repeat.

## Accuracy rules (this is the entire point)

- VERBATIM. Stimulus, prompt, answer-choice text, breakdown text, and per-choice explanations are copied exactly. No paraphrase, no cleanup, no summarizing.
- Every file must have: all 5 choices present, each with a Tag and a `% of students`, and exactly one choice tagged `Correct`. If any of these is missing on screen, STOP and flag it (do not fabricate a percentage or a tag).
- Percentages must be read from the badges, not guessed. If a badge is unreadable, zoom until legible; if still impossible, write `(?% of students)` and log it.
- If a question has no written explanation yet (empty panel), skip it, write nothing, and log `Q<N>: no explanation on platform`.
- Reading Comprehension: RC questions share a passage across several questions. If PT159 has an RC section in a separate set, transcribe the passage once at the top of each RC question file under a `## Passage` heading (or note "see Q<first>" — ask Joshua which he prefers the first time you hit RC).

## Section coverage / known unknowns

- The open set (`questionsetid=318723`, `type=LR`) is labeled S1 and paged "1 of 50". It may contain only LR (possibly both LR sections combined) and NOT the RC section. Work the current set fully first.
- After finishing the open set, check the bottom-left labels you saw: if you only ever saw `S1` (and maybe `S3` for the second LR), you still need the RC section. Use **Find A Question** (top-left search) or ask Joshua for the RC question-set URL. Do not assume the job is done until S1, S2, and S3 of PT159 all have files. Confirm with Joshua which sections PT159 actually has (modern LSAT = 2 scored LR + 1 scored RC + 1 unscored experimental; LSAT Lab may label them S1/S2/S3).

## Progress logging

Maintain a running checklist in this session and, every ~10 questions, append a one-line status to:
`/Users/joshuaf/Documents/Obsidian Vault/Claude/02_PROJECTS/LSATU/docs/agent/handoffs/PT159-TRANSCRIPTION-PROGRESS.md`
Format: `S1 Q03-Q12 done (2 type-inferred: Q07, Q11). Next: Q13.` So an interrupted run resumes cleanly.

## Definition of done

- Every question in every PT159 section has an accurate `QNN.md` in the right `PT159-S<n>-explanations/` folder.
- Every file passes the "5 choices + tags + percentages + one Correct" check.
- `type-inferred` and any `(?%)` items are listed at the end for Joshua to confirm.
- Report a short final summary: files written per section, any flagged items.

## Do NOT

- Do not paraphrase or "improve" the explanations. Transcribe.
- Do not fabricate percentages, tags, or explanations.
- Do not open a new tab; use Joshua's existing LSAT Lab tab.
- Do not use em dashes in anything you author.
- Do not stop to ask permission mid-run for routine questions; only pause for genuine blockers (missing data, extension disconnect, RC-format decision, section-coverage confirmation).
