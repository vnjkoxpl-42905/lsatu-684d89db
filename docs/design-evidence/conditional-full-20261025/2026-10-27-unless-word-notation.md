# Lesson 3.1 word notation and detail pass

Joshua approved short words crossed out for negation on the page and film, a whole-lesson consistency review, and interface polish on 2026-10-27. Everything remains local and uncommitted.

## Changes

- Defined Played and Rains as complete statements before using them. Store, admission and timing examples define Opens, Arrives, Admitted, Ticket and Complete in their own context.
- Replaced slash-letter notation with one word token component. A visible strike means NOT. Inline tokens expose a hidden spoken “not”; formulas expose their full English conditional as an accessible image name.
- Corrected the hero's claim that every translation starts with “if not.” Negating an existing negative gives a positive.
- Removed causal overstatement from the first meaning question and gave wrong answers repair hints before revealing the result.
- Kept both translations visible, added clear selected states and check marks, restored 48px choice targets, and added visible keyboard focus and hover states.
- Refined formula sizes, aligned paired examples, constrained prose measure, improved table/readback spacing, replaced thick comparison accent borders with hairlines, and preserved a 16:9 film at phone widths.
- Expanded the OR example back into complete statements. Until retains “by then” and “yet”; a completed inspection still does not guarantee immediate opening.
- Film now uses Rains, Played, Opens and Arrives with horizontal strikes. Existing narration and captions are unchanged. The cancellation caption is explicitly limited to what this rule says. Opening title is visible at time zero; kicker is 28px.

## Verification

- Conditional suite: **620/620 passed**, 46 files, serial run with 60-second test timeout. See `unless-tests-20261027.log`.
- Final affected-file rerun: **27/27 passed**. See `unless-focused-tests-20261027.log`.
- Final TypeScript check passed. See `unless-typecheck-20261027.log`.
- Production build passed, including content/index checks and no-canonical-content scan. Existing bundle-size, Tailwind ambiguity and noise asset warnings remain.
- Browser: all lesson sections visually inspected at 375px. Measured document width 375px, article 343px, no formula overflow; choice targets 48px. At 768px article 540px and paired examples stack. At 980px article 680px and pairs align in two columns. At 1280px article 860px. No horizontal document overflow in these measurements.
- Browser interaction: both choices, keyboard focus/activation, all four quiz questions through 100% completion, wrong/retry states for unless and except. Unit tests additionally cover meaning-question hint/reset/focus, negation answer, and video-error written fallback.
- Reduced-motion emulation: transitions 0s and quiz animation none. No browser console errors.
- Independent read-only source review found no further actionable bugs. This is local-preview evidence, not signed-in production acceptance or testing on physical phones.

## Film evidence

Actual MP4 frames inspected at 0, 10, 14, 20, 29, 48, 62 and 70 seconds, covering all six scenes. Contact sheet: `C:/Users/Joshu/dev/ai-os-projects/conditional-full-course-video-20261025/exception-language/review-contact-sheet.jpg`.

73.633333 seconds, 1920×1080, 30fps, AAC. MP4 SHA-256: `931dbe3bb9a8381b6e788065194fe2b1c0879e0c8e90f930ab6d29a6611e56e9`. Render/app MP4, poster and VTT hashes match. HyperFrames check passes with zero craft/layout/overflow warnings. Four contrast samples warn during the outgoing scene fade at 36.809s; stable frames were visually checked. No narration provider calls.

## Screenshots

- `unless-words-desktop.png`: both translations, selected state and focus.
- `unless-words-phone.png`: hero and first question at 375px.

No commit, push, database write, deployment or publication was performed. Existing unrelated staged and unstaged work was preserved.

## All accepted Claude findings implemented, 2026-10-27

Joshua subsequently authorized every accepted correction. This section supersedes the initial film hash and test count above for the revised local implementation.

- Added Played/Rains definitions in the sentence scene before either chip, retained the existing pick-scene key, and added the same definitions in the open-facts scene. The sentence-scene key starts at 12.679s; first Played chip starts at 14.185s.
- Moved the store sentence earlier: fully visible at 50.515s. Opens/Arrives definitions are fully visible at 50.865s. The first crossed-out Opens chip starts at 51.363s. Definitions remain visible with tokens; the explanation was moved to y580 to preserve space.
- Broadened notation checks to slash/tilde before any letter, case-insensitively. Checks cover the rendered article, formula accessible names, authored lesson/quiz data and actual film transcript. Provenance path metadata is excluded because directory separators are not teaching notation. A new regression test brings the suite to 621 tests.
- Prefixed all lesson-specific fc-u rules with fc-unless. Removed duplicate viewport stacking; the content-width container query is now the single stacking rule. Widened English readbacks to their grid column, removing the final-word wrap in the desktop screenshot.

Verification: **621/621 tests passed in 46 files**, final typecheck passed and production build passed. The built dist MP4 hash matches the app public MP4 exactly. Logs: `unless-review-fixes-tests-20261027.log`, `unless-review-fixes-typecheck-20261027.log`, `unless-review-fixes-build-20261027.log`.

Browser checks after CSS corrections: 375px document/article 375/343px; 768px 768/540px; 980px 980/680px; 1280px 1280/860px. No formula overflow. Stacked at 375 and 768; paired at 980 and 1280. At desktop both readbacks have the same top and 54px reserved height, with max-width none. Choice targets remain 48px; keyboard selection/focus works; reduced-motion transition is 0s; no console errors. New images: `unless-review-fixes-desktop.png`, `unless-review-fixes-phone.png`. Measurements: `unless-review-fixes-layout.json`.

Final film remains 73.633333 seconds, 1920x1080, 30fps, AAC. Narration and captions unchanged; no provider calls. Final MP4 SHA256: `b6c79bac6783a3de6383ef154886c5c068c24f9407043a15f0e79aec6341619e`. Source-render/app MP4, JPG and VTT match. The build output MP4 also matches. HyperFrames check passes with zero craft/layout warnings; the four pre-existing fade contrast samples at 36.809s remain.

Actual final MP4 frames before/at/after first chip: main 14.166667, 14.233333 and 14.8 seconds; store 51.333333, 51.4 and 52.0 seconds. Both keys are stable and readable before their tokens enter, without overlap. Boundary contact sheet: `C:/Users/Joshu/dev/ai-os-projects/conditional-full-course-video-20261025/exception-language/review-label-timing.jpg`. All six scenes: `review-contact-sheet.jpg` in the same directory. Timing, frame paths and hashes: `label-timing-verification.json` in that directory. These are sampled-frame checks, not a claim of continuous film/audio playback.

Fresh Claude final inspection follows against these exact corrected files. The earlier inspection does not cover these later edits.
