# Gate 4 — Module 1 Lessons 1.1–1.12 Batch Review Hand-off

> **Updated 2026-04-30:** Joshua greenlit batch authoring for Lessons 1.2–1.12. All 12 lessons (1.1 through 1.12) are now live. Lesson 1.13 (capstone) is still gated on G2.CALIBRATION content sourcing. Review the full M1 lesson body in one pass.

**Status:** Vertical slice shipped 2026-04-30. Awaiting Joshua's review. Per-lesson template locks at this review.

## How to run

```bash
cd /Users/joshuaf/Documents/Claude/02_PROJECTS/main-conclusion-bootcamp
npm run dev          # Vite at http://127.0.0.1:5173/
# OR (already running in background)
# Open http://127.0.0.1:5173/lessons/1.1
```

Type-check + build verification:

```bash
npm run typecheck    # tsc --noEmit, expect 0 errors
npm run build        # vite build, expect green
```

## What to review

### 1. The page itself — `/lessons/1.1`

Eight architectural layers, all live:

1. **Route** — `/lessons/1.1`, mounted via React Router v6 nested route (`/lessons/:lessonId`). Header carries the source-backed slot `data-lesson-id="MC-LSN-1.1"`.
2. **Register-2 prose** — serif body (system serif), 1.7 line-height, max 64ch measure. Voice verbatim: HARK A SIMPLE ARGUMENT (in the hook), cake-on-blocks metaphor, claimy judgments, very interesting life, hot-mess-on-the-floor.
3. **Guided example** — Monica claimed dinosaurs (lifted from logicalreasoningfoundation prototype) renders inline as an `example` block.
4. **Checkpoint question** — three-option radio group asking which sentence is the conclusion. Verdict reveals inline on selection (no scoring, per pedagogical-flow rule).
5. **Named-tool callout** — inline `[[NT-Upside-Down-Argument]]Upside Down Argument[[/]]` in the closing paragraph; clickable; opens RightDrawer with the lexicon entry.
6. **RightDrawer reference** — bottom-of-page chips for `MC-REF-2.B` (2-Part Conclusion Check) and `MC-REF-2.A` (Indicator Vault) open in-place; ESC closes; no URL change. Matches architecture-plan.md §9.
7. **CakeOnBlocks SVG** — marquee visual. Tap a block → it slides out with 220ms eased transform → cake falls (rotated, opacity 0.55) → tap again to restore. Accessible via `<button aria-pressed>` overlays.
8. **Persistence write** — on lesson view, a `lesson_progress` row lands in IndexedDB. On "Mark complete," `module_progress.completed_lessons` updates and `unlockNext('/lessons/1.1')` adds `/lessons/1.2` to `unlocked_routes`. Verifiable in DevTools → Application → IndexedDB → mc-bootcamp.

### 2. Voice fidelity — verbatim spot-check

Read the prose and confirm none of these have been "cleaned up":

- `Hark, a simple argument.` (hook line)
- `you live a very interesting life in this example`
- `Conclusions are a little ridiculous like that too.`
- `it would turn into a hot mess on the floor`
- `claimy judgments` (the exact phrase)
- `the most salvageable question type ever` — *not in this lesson*; used in 1.4 per the once-per-module cap (G1.5 frequency cap)

If anything was tightened or paraphrased, flag — Rule 14 + Rule 11 say preserve verbatim.

### 3. Visual identity — Aspiring Gold + dark navy

- `--accent: #E8D08B` is the only warm color in v1.
- Dark surfaces: `#05070a` (bg), `#0b1120` (bg-2), `#12151e` (surface), `#1a1e2b` (surface-elev).
- Role colors are only on argument-structure surfaces (the cake/blocks SVG). Not on chrome.
- 1px borders; `rounded-3` (8px) cards; `rounded-5` (14px) prose containers.
- Outfit (sans), JetBrains Mono (mono), system serif (long-form prose).

If any surface feels generic-SaaS, mark it. Rule 7 + handoff §1 reject it.

### 4. Module-ordering enforcement — `/simulator/*`

Visit `/simulator/bank` (or any simulator subroute). Expected: `<LockedState>` renders with "Blocker: MC-DRL-3.4" and a CTA to `/drills/3.4`. Confirms G2.DRL-3.4 architectural gate works end-to-end.

### 5. Source-Backed Slot Rule (handoff §6)

- Lesson page header carries `data-lesson-id="MC-LSN-1.1"`.
- Right drawer named-tool body carries `data-named-tool-id="NT-..."`.
- Right drawer reference body carries `data-reference-id="MC-REF-..."`.
- Source citations rendered at the bottom of every lesson.

## What's NOT in this slice (intentional)

Per Joshua's directive — no production code on Modules 2–6 until Lesson 1.1 review locks:

- Lessons 1.2 through 1.13 (placeholder pages route to `Lesson.tsx` but `lessons.generated.json` only has Lesson 1.1).
- Modules 2–6 surfaces — render `<Placeholder>` to keep the router green.
- AI Tutor drawer (M6 surface).
- R&R recorder (M3 drill).
- Trap Master deep dives (M4).
- Cluster decomposer (M5).
- The full `scripts/import-content.ts` pipeline (smoke-test stub authored; pdfjs-dist + vision-model OCR to be wired when Module 4 needs it).

## Per-lesson template that locks at this review

If Lesson 1.1 ships clean, the template that locks for lessons 1.2–1.13 is:

```ts
// src/data/lessons.generated.json[N]
{
  id: 'MC-LSN-1.N',
  number: '1.N',
  title: <serif display>,
  hook: <serif italic, ink-soft>,
  prose_blocks: [
    { kind: 'p',           text: <register-2 prose; inline [[NT-]] tool callouts allowed> },
    { kind: 'callout',     label, body: <html-allowed> },
    { kind: 'example',     tag, body: <html-allowed> },
    { kind: 'visual-spec', component: <component-name>, caption },
  ],
  named_tool_callouts: [{ tool_id, appears_in_paragraph }],
  reference_callouts:  [{ reference_id, label }],
  checkpoint: { prompt, options: [{ id, text, correct, reveal }] },
  sources: [verbatim citation strings],
}
```

Plus the rendering pipeline in `src/modules/lessons/Lesson.tsx`. New lessons add a row to `lessons.generated.json` and a content file; the renderer is already general.

## Open inputs (deferred, do not block Lesson 1.1 review)

- **G1.4** — Causation Station + Abstraction URLs. If you provide them now, surface refinement happens at Lesson 1.2+; Lesson 1.1's structure stays.
- **G3.UX-RESEARCH** — UX Deep Research packet. If it lands, integrate at Lesson 1.2+.
- **Mr. Tannisch stimulus** (parked from Step 1.5 smoke test). Surface to me at Module 4 build start if you intend it for v1; otherwise it stays Table B.

## Reviewer checklist — full M1 batch (suggested)

**Lesson 1.1 (per-lesson template lock):**
- [ ] Run `npm run dev`. Open `http://127.0.0.1:5173/lessons/1.1`. Read end-to-end.
- [ ] Tap a block in CakeOnBlocks. Confirm spring/fall animation + caption update + accessible focus ring.
- [ ] Click the inline `NT-Upside-Down-Argument` callout. Confirm RightDrawer slides in, ESC closes, no URL change.
- [ ] Click "2-Part Conclusion Check →" chip. Confirm RightDrawer renders the `MC-REF-2.B` placeholder.
- [ ] Pick each checkpoint option. Confirm correct/incorrect reveal voice matches Joshua's register.
- [ ] Mark the lesson complete. Open DevTools → Application → IndexedDB → mc-bootcamp → `module_progress`. Confirm `MC-LSN-1.1` is in `completed_lessons` and `/lessons/1.2` is in `unlocked_routes`.
- [ ] Visit `/simulator/bank`. Confirm `LockedState` renders with the right blocker hint.
- [ ] Verify voice: nothing tightened, nothing paraphrased, no generic-editor smoothing.
- [ ] Verify visual: dark navy + Aspiring Gold + 1px borders + serif prose. No SaaS gradients, no hero, no confetti.

**Lessons 1.2–1.12 (batch):**
- [ ] Walk `/lessons/1.2` through `/lessons/1.12` in order. Confirm progressive unlock (each lesson unlocks the next on Mark Complete).
- [ ] **1.2 — Premises and conclusions**: Monica example preserved verbatim; checkpoint tests "accept the premises" rule.
- [ ] **1.3 — Indicator words**: 6 categories present in callout; FABS + 2-Part Check both inline-callout-able; checkpoint distinguishes pivot from premise indicator.
- [ ] **1.4 — The most salvageable**: VP-most-salvageable + VP-most-lovable + VP-dont-over-complicate all present (frequency cap respected: this is the one place they appear in M1); Upside Down Argument named here.
- [ ] **1.5 — First-sentence stash**: vision-test stimulus verbatim from MCFIRST Q1; checkpoint tests opinion-language as the first-sentence-conclusion signal.
- [ ] **1.6 — Rebuttal stash**: tomato/fruit example preserved verbatim with full structure breakdown; pronoun warning forwards to 1.10.
- [ ] **1.7 — Intermediate vs multi-premise**: EV cars three-stage scaffold + stegosaurus interrogation both verbatim; 3-rule diagnostic in callout; Stegosaurus Interrogation named.
- [ ] **1.8 — Trojan Horse**: William/Harry dialog + all-nighter paper both verbatim; concession warning structure; Trojan Horse + Concession Decoder both named.
- [ ] **1.9 — Five types of conclusions**: all five examples (eating-meat, Eddie/arsonist, tomato, millennials/Gen-Z, Miguel pie) preserved.
- [ ] **1.10 — Pre-phrase**: gun-laws example verbatim with naive vs replaced read; 5-step protocol callout; Pre-Phrase Goal named.
- [ ] **1.11 — 2-Part Check**: tornado syntax-equivalence verbatim; three classic traps callout (Premise / Last Claim / Intermediate Conclusion); 2-Part Check named.
- [ ] **1.12 — Trap landscape**: 7 traits in callout; Trap Master named; checkpoint targets a real Trait 5 trap (extraterrestrial-life policy distractor).
- [ ] Voice spot-check across the batch: Register 2 (whimsical, metaphor-led) for prose; Register 1 (decisive, procedural) for callouts. Cake-on-blocks, claimy judgments, hot mess on the floor, beautiful starships voice — preserved across all 12.
- [ ] Source citations: every lesson lists S/A-tier source files verbatim at the footer.

**Cross-cutting checks (unchanged from Lesson 1.1):**
- [ ] Type-check + build green: `npm run typecheck && npm run build`.
- [ ] Module ordering: `/simulator/*` still LockedState until Drill 3.4 ships.
- [ ] Persistence: Mark Complete on each lesson advances `unlocked_routes` and `completed_lessons` in IndexedDB.

## Hand-off questions

- Is the per-lesson template (`prose_blocks` schema + 8-layer renderer) the right shape to lock?
- Is the inline `[[NT-Foo]]label[[/]]` markup syntax acceptable for named-tool callouts in lesson prose?
- Voice spot-check: does Lesson 1.1's prose pass your bar?
- Visual spot-check: does the CakeOnBlocks visual match the LR Field Manual's Gap Simulator energy?
- Pacing: is the checkpoint after the prose (vs interleaved mid-lesson) the right placement, or should checkpoints appear after each major concept block?
