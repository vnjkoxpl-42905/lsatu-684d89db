---
status: accepted
date: 2026-06-13
---

# Answer-feedback colors are themed per bootcamp, but hue-family-locked

Each bootcamp hand-authors its own full palette themed to its subject, including the answer-feedback colors (`correct`, `incorrect`, `try-again`, `selected`, `revealed`). A bootcamp may tune tone (saturation, lightness, warmth) so feedback feels native to its palette, but it may NOT reassign the hue family: `correct` stays green, `incorrect` stays red, `try-again` stays amber/warm, and `selected`/`revealed` stay neutral. Guardrail G6 pins the allowed hue ranges; the §4 Part D checklist enforces it before ship.

## Considered options

- **Globally fixed feedback palette (one locked green/red/amber for every bootcamp).** Rejected: maximally consistent and legible, but feedback chips read as bolted-on app chrome inside a warm, subject-themed canvas. Breaks the north star (warm tactile workbook, "color means something within this bootcamp").
- **Fully free per-bootcamp feedback (any hue).** Rejected: a bootcamp could ship a blue "correct" or an orange "incorrect," destroying the universal learned meaning of the colors and risking accessibility failures for color-vision-deficient students.
- **Themed tone, locked hue family (chosen).** Buys palette cohesion without sacrificing the universal correct=green / incorrect=red signal. Cost: every bootcamp author must respect G6 and cannot fully match an off-family brand color; redundant icon + label cues (§3.5) carry the meaning when tone is muted.

## Consequences

- Reversing to a global palette later means re-theming every shipped bootcamp's feedback tokens, so this is hard to undo once several bootcamps exist.
- The generating agent must validate G6 hue ranges per palette, not assume a shared constant.
- Feedback must never rely on hue alone (icon + label always present) so the tone-flex range stays safe for color-blind users.
