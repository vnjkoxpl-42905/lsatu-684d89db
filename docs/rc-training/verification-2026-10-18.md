# RC Training acceptance

RC Training combines instructions, a demonstration and practice in one Reading Center destination. The searchable list includes all 320 bank passages and 80 complete sections. Single passage is the default. Full section uses the same paragraph routine. Clock choices are No clock (default) and Show elapsed time, with no time limit.

The list leads the entry page. Detailed instructions have their own route, `/reading-center/rc-recall/instructions`. During practice the global sidebar is removed. The short guide can be hidden and automatically collapses after the first paragraph. Publication/source-date labels are suppressed in the exercise display; canonical passage wording remains unchanged.

## Recording and grading behavior

Start exercise prepares one continuous recording before showing the reading text. Space marks the start of hidden-text recall; a second Space marks its end and shows the check text. The microphone stays active while reading, recalling and checking. Save my place and leave, early ending and completion stop the capture and upload it privately. Resume starts a new capture without replacing old audio or recall windows. Earlier checkpoints retain their original runner.

Only timestamped hidden-recall words reach the judge. Full recording ASR is cached once per capture. Canonical source IDs supply exact evidence. Every fixed source unit must receive a verdict: kept2, partial1, missing0 or changed0. The server computes meaning points and percentage; the model cannot invent its own denominator. Unclear speech is ungraded. Feedback and source/transcript evidence persist and reopen from history without new provider calls.

## Automated verification

- Reading Center suite: **853 tests across48 files passed**.
- Typecheck passed. Production build and the postbuild canonical-content leak check passed before the final small silent-copy/mobile-spacing revision; final build is being repeated for release.
- Grader:14 pure Vitest tests and2 Deno endpoint tests passed, including full-bank segmentation parity, canonical source/ID validation, exact denominator, no grading before completion, shared-ASR concurrency, transcript reuse and read/check exclusion.
- Recorder checks cover permission cancellation, late permission after unmount, interrupted audio, cross-tab locks, device backup failures, immutable marker retry, upload failure and recovery.

## Signed-in live backend and Chrome proof

All backend migrations were applied through Lovable Cloud: `drizzle/migrations/0033` through `0036`. The grader deployed with `verify_jwt=true`, build `2026-10-18-rc-grader-2`. Managed Cloud uses UUID ownership without an auth/profile FK and native private-bucket creation. Capture transcripts are service-only. No existing records were deleted or replaced.

- Initial persistence/audio/privacy acceptance:20 checks passed.
- Numeric grading controls: accurate paraphrase100%; substantial omissions33%; changed claims0%. Cached ASR was reused across grader revisions.
- Continuous control: perfect reading/checking around omitted recall still scored33%; the graded transcript contained only the recalled words. Actual revision2 calls:1ASR+4judges, within the approved five-call budget. Cached requests left rows unchanged.
- Twelve live capture checks passed, including automatic saved-status propagation, immutable windows/captures and denied non-owner audio.
- Actual Chrome single-passage completion: attempt `a9bb9fee-cb9b-429e-b1c4-85f37230b913`,8 saved spoken recalls,2 saved captures after a development-refresh recovery, valid windows,68 active seconds, zero AI grading of test-room audio.
- Actual Chrome full-section completion: attempt `2aae37e8-7c3d-4223-890c-5c4b691bd7d9`, canonical passage IDs `[14,15,16,18]`,19 saved spoken recalls across counts `[3,8,4,4]`, one saved capture, valid windows,63 active seconds, zero AI grading of test-room audio.
- Chrome reading and checking visibly retained the recording indicator across every passage transition; completion stopped it. Guide collapse and sidebar restoration were observed.
- Responsive matrix390/650/768/1000/1440 CSS pixels: no horizontal overflow; practice sidebar absent and controls at least44px high. The650px case represents a narrow docked content panel. Final mobile-spacing readback is pending.

Detailed sanitized receipts are in the adjacent backend, grader-v2 and hardware readback JSON files. Dedicated test records are retained as append-only history. A second non-admin student and no-entitlement live identity were unavailable; denial paths also have handler tests and policy review.

## Rendered demonstration

The60-second HyperFrames film uses the LR Recall visual style and demonstrates continuous recording, exact controls and end feedback. H2641920x1080,30fps,1800frames, no audio; MP4/poster/VTT are embedded with native playback controls and a written alternative. Runtime/layout/motion checks passed and contrast passed101/101 checks. Eight decoded frames were inspected. Final MP4 SHA256: `0a006fbbe80066e71a66935e8a4b1761bbb7f6161e41397839563a165b46597c`.

The earlier HyperFrames CLI global skill-refresh side effect remains recorded in the sibling project's `docs/skill-refresh-side-effect.md`; no speculative restoration was attempted.

## Frontend release status

Frontend merge/publication is pending final playback, responsive readback and release checks. Publication must match Lovable's merged commit SHA and be proven through the changed live assets and signed-in UI.
