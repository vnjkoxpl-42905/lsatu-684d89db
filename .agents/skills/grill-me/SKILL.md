---
name: grill-me
description: Interview the user relentlessly about a plan, design, or topic, checkpointing every answer to a brainstorm file so nothing is lost. Use when the user wants to stress-test a plan, get grilled on a design, run a brainstorm or discovery session, extract what's in their head into a doc, or says "grill me". For "grill with docs", use the grill-with-docs skill instead.
---

# Grill Me

Matt Pocock's `grilling` interview, plus two things it does not do: everything is checkpointed to a file on disk, and questions arrive as popups instead of plain text.

**Call the Skill tool with "grilling" first, and follow it exactly.** That skill owns the interview method: the design tree, the frontier, working in rounds, carrying a recommended answer on every question, finding facts yourself rather than asking. Do not restate, summarise, or second-guess any of it here. It is kept byte-identical to upstream so it can be updated by overwrite, and everything below is an overlay on top of it, never a replacement for it.

Two overlays, and nothing else.

## Overlay 1: the capture file

Long interviews fill up context. If you hold answers only in your head you will eventually misremember, conflate, or drop one. The file, not your context, is the source of truth. Never make the user ask you to save progress.

**Before the first round:**

1. Create `brainstorms/{YYYY-MM-DD}-{topic-slug}.md` (create `brainstorms/` if it doesn't exist). Every capture lives there. One predictable home, regardless of topic. Do NOT scatter captures into project folders. If the session later produces a polished deliverable (a plan, a map, a spec), that artifact can move into the relevant `projects/` folder, but the raw capture always stays in `brainstorms/`.
   - Get today's date with `date +%F` if you don't already know it.
2. Write the header immediately: title, date, the goal of the session, and an empty "Open flags" section.
3. Tell the user where you're saving, in one line. Then ask round 1.
   - **If Joshua did not clearly ask to be grilled** (you reached for this skill yourself off something vague like "help me think through X"), say so in that same line and name the file before you write it: *"Grilling you on this and saving to brainstorms/....md — say stop if you just wanted an answer."* He should never discover a capture file he did not know was being written.

**After every round of answers, before you ask the next one:**

- Append an entry per question: the question topic, the key facts and decisions from their answer (in their words where the wording matters), and any flags.
- Update or correct earlier entries if a later answer changes them.
- Only then recompute the frontier and ask.

Never let two rounds go by unwritten. If context is lost at any moment, the file already holds everything said so far.

**When the user can't answer something**, record it as a flag with the name of who *can* answer it, and move on. Don't stall.

**Structure:**

```
# {Topic}: Brainstorm / Discovery Notes
Date: {date} · Goal: {one line}

## Summary / key decisions
(running synthesis, updated as you go)

## Q&A log
### Round 1
#### Q1 — {topic}
- Asked: {question}
- Captured: {facts, decisions, in their words where it matters}
- Flags: {open item -> owner}
...

## Open flags (pending input)
- {item} -> {who can answer}
```

## Overlay 2: deliver each round as a popup

`grilling` says to ask the whole frontier in one round. It formats that round as numbered text. Do it as a popup instead, wherever the round fits one.

- If the round is **4 questions or fewer** and each has a small enumerable set of answers, fire the whole round as a **single `AskUserQuestion` call** containing all of them. The tool takes up to 4 questions at once, so one round is one popup.
  - Put your **recommended answer** first, labeled `"... (Recommended)"`.
  - Add 1-3 mutually exclusive alternatives you can actually picture the user picking. Don't pad to 4 with filler; a genuine binary is fine.
  - The tool auto-adds "Other" as the free-text escape hatch, so an answer that doesn't fit your options is never lost.
  - Use `preview` when the options are something to look at rather than read (layout mockups, code snippets, config variants).
- If the round is **wider than 4**, split it: the 4 most load-bearing questions go in the popup, the rest follow in `grilling`'s numbered text format in the same message. Never drop a frontier question just because the popup is full, and never trickle them out one at a time.
- If the answers are genuinely open-ended (a name, a number with no sensible buckets), use `grilling`'s text format for those questions. Don't force a bad multiple choice.

## At the end

- Read the whole capture file back for contradictions or gaps, and reconcile them.
- Give the user a short recap: what's captured, what's still flagged, and the suggested next step.

## Docs mode

If Joshua says **"grill with docs"**, that is the `grill-with-docs` skill, not this one. Invoke it. It runs `grilling` + `domain-modeling`, writes a `CONTEXT.md` glossary and ADRs, and keeps no brainstorm file. Do not paraphrase its formats here.

## Provenance

`grilling`, `grill-with-docs` and `domain-modeling` are Matt Pocock's ([github.com/mattpocock/skills](https://github.com/mattpocock/skills), MIT), kept byte-identical to upstream. The brainstorms folder and the checkpoint-every-answer rule are Nate Herk's modification of Matt's original `grill-me`. The `AskUserQuestion` delivery is Joshua's. Keep the additions in this file only, so upstream stays overwritable.
