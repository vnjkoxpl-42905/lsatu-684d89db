# Chart palette — validated, not eyeballed

The color spec for every chart on the analytics and history surfaces.
Every value here was produced by `scripts/validate-chart-palette.mjs` and passes its hard checks
against the real surface it will sit on. **Re-run the validator before changing any value:**

```bash
node scripts/validate-chart-palette.mjs --preset all
node scripts/validate-chart-palette.mjs "#hex,#hex,#hex" --surface dark --pairs all
```

Validated 2026-08-26 against `shell-card` `#121212`.

**Supersedes `plans/analytics-viz-palette.md`**, which was an earlier pass the same day using the
`dataviz` skill's own bundled validator. That file is kept for its reasoning trail (the failed
bronze-harmonised attempt, the series-count ceiling derivation) but its hex values are not
authoritative — these are.

> **The two passes were independent and agreed.** Different validators, different candidate hues,
> same four conclusions: colour carries accuracy rather than family, diverging must be blue↔red
> rather than green↔red, status colours stay out of scales, and the ramp has to stop well before it
> reaches the card. Convergence from two methods is worth more than either alone.
>
> **One methodological caveat.** This validator uses Machado 2009 severity-1.0 matrices for all
> three CVD types. The skill's used a different model and did not flag tritan on blue↔aqua, where
> this one scores ΔE 4.8 and fails. **This validator is the more conservative of the two** — treat a
> tritan-only failure here as "re-step if cheap", not as a blocking defect, since tritanopia affects
> ~0.01% of people. Protan and deutan failures are real and must be fixed.

---

## The governing decision: color carries accuracy, position carries family

The four question-type families (Assumption/Objection, Inference, Match, Other) are **not** assigned
four categorical hues. They are encoded by **position and grouping** — section headings and layout,
exactly as the breakdown table already does it.

Reason: a four-hue categorical set cannot clear the all-pairs CVD floor on a dark surface without
re-stepping into colors that fight the brand. More importantly, hue is the strongest visual channel
available and the thing a student actually needs to read is **accuracy**, not which family a row
belongs to. Spending hue on family would waste the strongest channel on the least important
variable.

So:

| Variable | Channel |
|---|---|
| **Accuracy** (the thing being read) | color — sequential ramp, or diverging against the 85% target |
| **Question-type family** | position + grouping + section heading |
| **Sample size / confidence** | opacity or mark size, never hue |
| **Correct / incorrect state** | status colors + a non-color signal (icon or label) |

---

## 1. Accuracy ramp — sequential

Single hue, light→dark, for continuous magnitude (heatmaps, the type × level matrix, 3D surface
height coloring).

| Step | Hex | OKLCH L | Contrast on `#121212` |
|---|---|---|---|
| 1 (lowest) | `#1d5286` | 0.431 | 2.32:1 |
| 2 | `#1f6cb0` | 0.521 | 3.42:1 |
| 3 | `#2a87d4` | 0.608 | 4.92:1 |
| 4 | `#57a5e4` | 0.699 | 7.05:1 |
| 5 (highest) | `#8cc3ef` | 0.795 | 9.96:1 |

Monotonic lightness ✅ · endpoint ΔE 36.5 ✅ · every step clears the 2:1 ordinal floor ✅

> **A sixth, darker step (`#1b3a5c`) was cut.** It reached only **1.61:1** against the card and
> disappeared into the background — indistinguishable from "no data". On a dark surface the ramp has
> to stop well before black, or "very low accuracy" and "never attempted" become the same pixel.
> That distinction is the whole truthfulness rule.

**Never-attempted is not step 1.** It is not on this ramp at all — see §4.

---

## 2. Accuracy vs target — diverging

For "is this above or below the 85% target", where polarity is the message.

| Pole ← | | Neutral | | → Pole |
|---|---|---|---|---|
| `#f53d5c` | `#c36966` | `#8a7f70` | `#6585a4` | `#2a87d4` |
| below target | | at target | | above target |

Pole separation **33.0** ✅ · protan **18.4** ✅ · deutan **23.4** ✅ · tritan **43.3** ✅
Midpoint chroma 0.026 — properly neutral, reads as "nothing" rather than as a third category.
Steps interpolated in OKLab, not RGB.

> **Deliberately not red→green.** Red↔green is the most CVD-hostile pair in common use and measures
> deutan ΔE **5.7** — see §3. Rose→blue keeps the "bad" pole tied to the shipped
> `state-incorrect` token while making the scale legible to every viewer.

---

## 3. Status colors — and a real defect they carry

The shipped tokens, measured against `#121212`:

| Token | Hex | Contrast | Note |
|---|---|---|---|
| `state-correct` | `#0fb781` | 7.24:1 | |
| `state-incorrect` | `#f53d5c` | 5.09:1 | |
| `status-warning` | `#f59f0a` | 8.78:1 | |
| `accent-bronze` | `#b06a3e` | 4.44:1 | |

Contrast is fine everywhere. The problem is the pair:

```
#0fb781 / #f53d5c    normal 35.3 PASS    protan 20.2 PASS    deutan 5.7 FAIL    tritan 41.9 PASS
```

**Correct-green and incorrect-rose are nearly identical under deuteranopia** (ΔE 5.7 against a floor
of 8), which affects roughly 6% of men. This is the app's core state pair, shown on every drill
reveal.

This is **only** a defect where color is the sole signal. The prescribed mitigation is not to change
the hues — they are correct and well-established — but to guarantee a **non-color companion**
everywhere the pair appears: a check/cross icon, or a text label. An audit of every reveal surface is
tracked separately; findings go in the plan's Phase 0.

**Rule for all new chart work:** correct/incorrect never encoded by fill alone. Icon or label, always.

---

## 4. Never-attempted — the absence color

A question type with zero attempts is **not** a low accuracy value. It gets no ramp color at all.

- **Fill:** none — `transparent`, or the card surface itself
- **Outline:** `#262626` (`shell-border`), 1px, dashed on interactive marks
- **Label:** em dash `—`, never `0%`
- **In 3D:** zero-height *and* unlit — a flat plate on the floor plane, never a short bar (a short
  bar reads as "bad at this", which is a lie)

This is the visual expression of the standing truthfulness rule, and it is the single easiest place
for a chart to start lying.

---

## 5. Low-sample marks

Attempted but below `MIN_SAMPLE` (3, per `mainhubAnalytics.ts`): render the ramp color at **40%
opacity** with the same `#262626` outline, and always print the raw `n correct of m` beside it.
Opacity carries confidence; hue still carries accuracy. Never substitute a different hue for
"uncertain" — that reads as a category.

---

## 6. Reasoning types — the one categorical set

Three values only (Conditional, Causal, Comparative), so a true categorical palette is affordable.

| Reasoning type | Hex | OKLCH L |
|---|---|---|
| Conditional | `#8cc3ef` | 0.795 |
| Causal | `#e8a33b` | 0.765 |
| Comparative | `#12795a` | 0.513 |

All-pairs validated: worst normal-vision ΔE **22.7**, worst CVD ΔE **20.8** — clears the target of 8
by 2.6×.

Two things made this work, and both are worth remembering:

1. **Separate by lightness, not just hue.** The first attempt used three hues all at L≈0.62. Equal
   lightness means that as soon as any CVD collapses the hue axis, all three become the same color.
   Spreading L to 0.795 / 0.765 / 0.513 makes them survive any collapse.
2. **Amber, not orange.** Orange `#d95926` against green scored protan ΔE **6.4** (warn band).
   Shifting to amber `#e8a33b` took the same pair to **20.8**. Orange↔green is a red-green problem
   wearing a different name.

---

## Anti-patterns — do not reintroduce

- ❌ A hue per question-type family (fails all-pairs CVD; wastes the strongest channel on the least
  important variable)
- ❌ Red→green diverging (deutan ΔE 5.7)
- ❌ A ramp step darker than ~2:1 on the card (collapses into "no data")
- ❌ `0%` for never-attempted
- ❌ Correct/incorrect by fill color alone
- ❌ A separate hue to mean "low confidence" (reads as a category; use opacity)
- ❌ Dual-axis charts — two measures of different scale get two charts
- ❌ Rainbow / spectral ramps for magnitude
