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
