# RC left passage finder verification, 2026-10-29

Local branch: `codex/rc-left-finder-20261029`. Baseline: `9b1eec11bde0746f899c34ec9b5d42630395bfe8`.

## What changed

The left lookup now combines title/topic search, exact addresses, and a browsable PrepTest/section/passage index. A recessed three-slot address plate makes the scope visible. The charcoal index has grouped number plates and warm ruled-paper metadata cards, with separate highlighted and committed states. Phones use a Radix modal sheet with focus return. Short CSS transitions and a reduced-motion override avoid a new animation dependency.

Durable source:

- `src/features/rc/components/RcPassageFinder.tsx`: interaction, combobox, portal and phone sheet.
- `src/features/rc/rcPassageFinder.css`: scoped surfaces, depth, typography, focus and motion.
- `src/features/rc/lib/rcPassageFinder.ts`: sanitized metadata index, parsing, matching and authoritative address resolution.
- The corresponding component/helper tests cover the new behavior.
- `RcHubSurface.tsx` changes only the finder import and left lookup JSX. `RcHubSurface.test.tsx` adapts existing address tests to the finder.
- `start-rc-builder-preview.mjs` and `rc-builder-preview.tsx` expose the actual component at port 8119, with the real static question bank and synthetic backend.

The existing right builder JSX, state handlers, `drillSettings`, `rc.css`, and `rcBuilderRefinement.css` remain unchanged. The diff retains `.rc-direct-lookup` and `data-motion-id="rc-setup-lookup"`, which existing layout rules need. No dependency, backend, or publication change is intended.

## Resources actually used

The coordinator and resource researcher inspected the shared design hub, Taste v2 provenance, relevant Emil design-engineering/interaction/motion guidance, Impeccable, React Bits source examples and GSAP/scroll-craft routes. Selected ideas informed a native implementation; GSAP and React Bits components were not installed or copied.

Actual viewed references included Raycast's dark command surface, a photographed library card cabinet, Philip C. Davis's command-palette example, and saved Mobbin Air/Uber Eats stills. The cabinet informed recessed bays and label plates; the command references informed grouping, active state and secondary metadata. Firecrawl/Tavily text research is archived separately. Connected Mobbin search required a paid plan and was not accessed beyond that gate. Reference artwork was not embedded in the product.

Evidence and original brief: `C:/Users/Joshu/dev/ai-os/design/reviews/rc-passage-search-20261029/`.

## Authorship and review boundaries

All current Claude communication uses the headless runner at `C:/Users/Joshu/dev/ai-os/.agents/skills/claudex-loop/scripts/runner.py`, never browser chat. The earlier cloud High concept was not exported as durable High source. This is a native React implementation informed by that direction, not a claimed cloud export.

The headless Claude build requested Opus 5.5 High but timed out after 1800 seconds without a completion response. Its saved draft was recovered and independently tested by the coordinator. That failed run remains failed: `C:/Users/Joshu/AppData/Local/Temp/claudex-ptgjeb5k`.

The fresh Codex CLI inspection failed before review launch on MCP discovery. No CLI approval exists for that attempt: `C:/Users/Joshu/AppData/Local/Temp/claudex-ebbc8hps`. A separate read-only Codex agent inspected all nine intended source/test/harness files and found no material source defect, while flagging short-viewport placement for runtime checking. It did not run proofs.

The coordinator reproduced and fixed popup overflow, then became a contributing builder. A fresh headless Claude inspection observed `claude-opus-5-5`, with High effort requested, and returned REVISE: `C:/Users/Joshu/AppData/Local/Temp/claudex-bfp_ab3o/result.json`. Claude disclosed self-authorship of its earlier draft. Only the Codex-authored changes were independent cross-provider review.

Accepted dispositions:

- F1: remeasure on parent renders and ResizeObserver notifications, with stable placement equality to avoid render loops.
- F2: upward panels use an anchored bottom edge and bottom transform origin, rather than subtracting an assumed maximum height.
- F3: preserve the Vite-generated Windows MCP stub as a temporary diagnostic and restore the tracked baseline after the final build.
- F4: this report supplies the missing durable handoff.
- F5: label words without numbers remain text searches; mixed `pt 140 science` removes address-label tokens from text terms.
- F6: keep a phone live region outside the sheet and avoid remounting status text when a committed address changes. The modal retains its internal live region while other content is hidden.

Final reinspection result is recorded in the coordinator evidence folder after completion. No unconditional perfection or exhaustive accessibility claim is made.

Final reinspection attempt stopped on a Claude first-party 429 `usage_limit_reached`, with no valid final verdict. The native response reports a 10:40 AM America/Toronto reset. Artifact: `C:/Users/Joshu/AppData/Local/Temp/claudex-bg61_d13`. The request remained Opus 5.5 High; no model fallback or browser communication was used. Final Opus approval is pending. Host checks below establish local behavior only.

## Coordinator-run proofs

- `npm run typecheck`: passed after placement/reflow/parser fixes.
- `npx vitest run src/features/rc/components/RcPassageFinder.test.tsx src/features/rc/lib/rcPassageFinder.test.ts src/features/rc/components/RcHubSurface.test.tsx src/features/rc/components/RcSavedSetsPanel.test.tsx src/features/rc/lib/rcBuilderSummary.test.ts --reporter=json --outputFile=C:/Users/Joshu/AppData/Local/Temp/rc-left-finder-final-tests.json`: **228 passed, zero failed**. The new placement fixture initially failed because this test environment lacks a DOMRect constructor; explicit bounds fixed the fixture, without weakening its placement assertions.
- ESLint for the four new component/helper source/test files: zero errors or warnings. The earlier combined hub check had five existing hook warnings, zero errors.
- `npm run build`: final pass succeeded in 1m52s and postbuild verified 769 output files. Log: `C:/Users/Joshu/AppData/Local/Temp/rc-left-finder-final-build.log`. Existing bundle-size, unresolved noise.png and Tailwind warnings remain outside this change.
- `git diff --check`: passed before final documentation; repeated at handoff.

## Browser checks actually performed

CUA inspected the real React surface at `http://127.0.0.1:8119/docs/verification/rc-builder-preview.html?builder=automatic&bank=real`.

- Named desktop combobox; valid `140 4 1` selects Sam Gilliam. Invalid `140 3 1` explains that PT 140's RC section is 4. Text `mirror` finds Explaining Mirror Images. Mixed `pt 140 science` finds that same authoritative passage.
- PT 101 exposes both real RC sections 1 and 4. Partial committed selection disables Review until a passage is chosen.
- Arrow/Enter selection, Escape dismissal, phone search focus and return to the trigger were exercised.
- Reviewed passage PT 136 S1 P2, temporarily chose another address, cleared it, and reviewed again: the original passage was restored. Explicit Start created synthetic session passage ID 260, with no recorded exposure. Search/browse did not start a session or reveal passage text.
- Measured CSS widths 320, 390 and 768, plus desktop and a 447px-high desktop viewport. No document horizontal overflow at those measured sizes. The upward popup stayed within the short viewport, with its bottom adjacent to the trigger after correction.
- Dark 320px sheet inspected. Runtime reduced-motion emulation changed the panel animation from 190ms to zero and instrument transitions to 0.01ms. Temporary emulation was cleared.
- Sampled computed text/background contrast: panel primary 14.97:1; panel quiet 6.84:1; paper title 14.32:1; paper metadata 6.49:1. These are sampled pairs, not an exhaustive contrast audit.
- Saved desktop evidence: `C:/Users/Joshu/dev/ai-os/design/reviews/rc-passage-search-20261029/final-desktop-search.jpg`.

## Limits

Local synthetic backend only. No live signed-in production check, physical phone or screen-reader session, iOS keyboard/visual-viewport validation, cross-browser run, or frame-time motion profiling. Phone geometry and interaction were checked, but automated phone screenshots had zoom/clipping artifacts and are not presentation proof. No claim of exact screenshot pixel parity for the right side; its source and styles are preserved instead. No commit, push, merge or publication.
