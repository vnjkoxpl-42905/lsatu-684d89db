# Spec — Inline per-choice explanations, and a three-tab drill drawer

Status: **locked, not started** · Date: 2026-08-03
Source interview: `~/ai-os/brainstorms/2026-08-03-drill-explanation-inline-redesign.md`

## Goal

Retire both dark overlay sheets in the drill runner. Per-choice explanation content moves **inline, directly under each answer choice**, behind a collapsible disclosure. Question-scoped content moves into the existing white docked drawer, which grows a third tab.

End state: one panel in the runner, zero black overlays, no duplicated Details view.

## Content split

| Content | Home |
|---|---|
| Argument breakdown (Conclusion / Evidence / Evaluate / Goal) | Drawer → **Explanation** tab |
| Correct-answer line, style selector | Drawer → **Explanation** tab |
| Per-choice tag, `N% of students`, that choice's note | **Inline**, under the choice |
| Question metadata, Find Similar | Drawer → **Details** tab |
| Per-question notes | Drawer → **Notes** tab (unchanged) |

## The inline layer

Rendered inside the existing `<li>` per choice in `OfficialQuestionPane.tsx` (currently `<ul className="mt-4 space-y-3.5">`).

Collapsed row, in order: the source **tag chip** verbatim, then `N% of students`, then a disclosure reading **"Why this is correct"** or **"Why this is wrong"** chosen off `isCorrect`. The source's nuance (`Too Weak`, `Weakens, if anything`, `Not an Objection`) stays in the chip — the label only says which way the choice went.

Expanded: the choice's note prose.

Behaviour:
- Disclosures are **independent** — any number open at once, opening one never collapses another, so (A) and the student's own pick can be read side by side.
- On reveal, the **correct choice** and the **student's own pick** start open. The rest start closed.
- The student's pick carries a `YOUR ANSWER` marker.
- Open/closed state **resets on question change**.

### Honouring absence

The never-invent rule from `ExplanationPanel`'s header comment carries over unchanged, and gets stricter — it now applies per choice, not per question:

- A choice with no note renders **no disclosure row at all**. Not an empty one, not a placeholder.
- A missing tag or percentage renders as absent.
- `notesByLetter` may legitimately lack a letter even on a question that has prose. Handle per letter.
- On the ~350 questions with `hasAuthored: false`, the inline layer still renders the green correct row, tags, and percentages — those are real source data. Only prose is missing. The drawer's Explanation tab carries the "no written explanation was published" message and the **Ask Joshua** hand-off.

## Reveal model

Reveal is gated on the existing `autoReveal` flag (`Drill.tsx:242`, `localStorage['lsatu.smartdrill.autoReveal']`).

- **Submit** with `autoReveal` on → the full inline layer appears.
- **Answer** button → reveals the full inline layer at once: green correct row, tags, percentages, disclosures. There is no two-tier reveal.
  - Ungate it. Drop `showAnswerDisabled={!currentAttempted}`.
  - Pressed **pre-attempt**, it shows a confirm: *"This reveals the answer and the question won't be scored. Continue?"* → `Cancel` / `Show me`. On confirm, reveal; the question **is not scored**.
  - Pressed **post-attempt**, it reveals immediately, no confirm.
- **Explanation** button → no longer reveals anything inline. It opens the drawer on the Explanation tab. **Disabled until something is revealed**, so the breakdown cannot leak pre-attempt.
- Revealing does **not** move the drawer. Closed stays closed, open-on-Notes stays on Notes. Reveal only enables the Explanation tab and the Explanation button.

## The drawer

`DrillNotesPanel.tsx` — `DrawerTab` becomes `"notes" | "explanation" | "details"`. Delete the stale comment saying Explanation is intentionally absent.

**Explanation tab** carries what the old panel had minus the choices: the `Correct answer: X` line, the style selector, and the argument breakdown. Both existing rules survive:
- The selector renders only when `styles.length > 1` (~209 of ~3,900 questions, ~5%).
- The "same as Standard" borrow: a non-standard style with no steps means the source said "(same as Standard)", so render Standard's steps labelled `same as Standard`.

**Details tab** additionally hosts **Find Similar**, migrated from the retired menu sheet.

### Style selection is shared state

An `LrStyle` carries **both** `steps` (drawer) and `notesByLetter` (inline). Picking a style must swap both surfaces in the same beat.

`DrillNotesPanel` is mounted **twice** in `OfficialDrillFrame.tsx:127-169` — once for the `md+` push column, once for the sub-`md` overlay. So the active style must live **in `Drill.tsx`** and be passed down, exactly as `activeTab`/`onTabChange` already are. It cannot live inside `DrillNotesPanel` or the two mounts will disagree and the inline layer will read the wrong value.

## Scope — three surfaces

1. **Smart drill** — both `OfficialSmartDrillBar` call sites (`Drill.tsx` ~3180, ~3212). Full treatment. `autoReveal` already exists, defaults on.
2. **Section mode** — `OfficialAnswerNavigator` (`Drill.tsx` ~3261). **The only change is gaining the reveal toggle, default off.** With it off, section mode behaves exactly as it does today: no inline layer, no reveal, nothing. (Joshua stated this three times; treat it as load-bearing.)
3. **Bootcamp capstones** — `LRQuestionModal`, used by `main-conclusion/Capstone`, `main-conclusion/HardSentencesCapstone`, `principle-flaw/InlineQuestionViewer`.

### Bootcamp content precedence

`LRQuestionModal.tsx:297-322` already renders its own per-choice explanations from `inline.explanations ?? bankQuestion.answerChoiceExplanations` (`whyCorrect` / `whyIncorrect`) — Joshua's authored bootcamp copy, not LSAT Lab's.

Resolution, **per choice**: if authored bootcamp copy exists for that letter, it renders. Only letters with none fall through to the LSAT Lab note. Both use the **same collapsible inline component**, so the format is identical everywhere and only the source differs. The bootcamp's separate "Explanations" block is replaced by the inline layer, not kept alongside it.

## Deletions

- `src/components/drill/ExplanationPanel.tsx`
- `src/components/drill/QuestionMenuPanel.tsx` — the **Menu** button now opens the drawer on Details
- `src/components/drill/QuestionMetadataPopover.tsx` — already dead code
- Their imports and mounts in `Drill.tsx` (imports at lines 35-36; mounts ~2833 and ~2855)

## Out of scope

No DB work, no schema change, no re-ingest. `useLrExplanation` is consumed as-is.

## Verification gate

Per `CLAUDE.md`, this is a `src/components/` + `src/pages/` change, so it is not done until viewed running with screenshot or DOM evidence. Minimum matrix:

- Pre-attempt: Answer enabled and showing the confirm, Explanation disabled.
- Post-submit with `autoReveal` on: inline layer present, correct + own pick auto-open, others closed.
- A `hasAuthored: false` question: tags and percentages present, no disclosure rows, drawer offering Ask Joshua.
- A multi-style question: switching style in the drawer swaps the breakdown **and** the inline notes together.
- Section mode with the toggle off: identical to today.
- A bootcamp capstone: authored copy renders, LSAT Lab fills only the gaps.
- Narrow, mid, wide viewports plus the drawer-docked case — the wider responsive gate applies.
