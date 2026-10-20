# RC Training immersive exercise verification

Date: 2026-10-20. Scope: local redesign of `/reading-center/rc-recall`.

## Release verified on 2026-10-20

Joshua subsequently authorized pushing to main and publication. Source/test commit [`a52b3ff5570be1653d0fa7b82b44f6f496599d06`](https://github.com/vnjkoxpl-42905/lsatu-684d89db/commit/a52b3ff5570be1653d0fa7b82b44f6f496599d06) contains nine RC files, excluding verification fixtures and backend changes. Safe-push typecheck passed; main and Lovable `latest_commit_sha` matched this exact SHA before free deployment `afc5033a-fefd-4cc0-93fa-608799b6db81`.

Direct public HTTP readback verified that the root changed from `/assets/index-BfHhQJLQ.js` to `/assets/index-CUSnvITg.js`. The new root and its imported `index-C2OH3RSc.js` and `index-FkLOZP26.js` all returned HTTP 200. The last chunk contains the exact approved instruction **Explain what you just read in your own words.**, `rct-waveform-slot`, and `rct-exercise-actions`.

These checks establish public frontend publication. Signed-in production recording saves and feedback remain unverified. The implementation record below preserves its pre-release local status and verification boundaries.

**Status: local implementation ready.** Final parent verification passed after fixing the 320 px long-paragraph focus scroll jump and short landscape height. The hidden heading now uses relative positioning and focus prevents scrolling; content scroll resets at transitions. This redesign is uncommitted and unpublished, separate from the older `549620f7` release.

## Evidence and limits

The local harness renders the actual `ContinuousRcRecallRunner`, recorder hook, waveform, and feedback component with the Reading Center light theme. Microphone permission and recording use browser hardware input. No fake microphone flags, synthetic audio, `getUserMedia` replacement, or simulated waveform amplitude were used. A completed fixture exercise produced a real 28,966-byte recording blob.

Only backend persistence and feedback responses are fixtures. The harness blocks production requests and stores backend rows and uploaded blobs in memory. Fixture feedback is explicitly labeled. These checks establish local UI behavior and recording integration; they do not establish signed-in production saves, storage policies, production grading, or deployment. Remote signed recording playback is outside this harness.

The recall instruction remains exactly: **Explain what you just read in your own words.**

## Observed state coverage

| Scenario | Observed local result | Evidence |
| --- | --- | --- |
| Reading and recall | Real exercise components inspected on desktop and mobile. Paragraph focus, aligned controls, paragraph progress, and actual-input waveform exercised. | `rc-immersive-reading-desktop.png`, `rc-immersive-reading-mobile.png`, `rc-immersive-recall-desktop.png`, `rc-immersive-recall-mobile.png` |
| Setup and microphone errors | Final mobile refinement keeps Start exercise and permission-error retry in the same primary-action frame as reading. Existing microphone setup wording remains; Start has no false Space shortcut. Errors stay inside the scrollable content. | [Mobile setup](rc-immersive-setup-mobile.png), [Permission denied](rc-immersive-permission-denied-mobile.png) |
| Pause | Desktop and mobile overlays show context and elapsed time. Recording resumes through the explicit action. | `rc-immersive-pause-desktop.png`, `rc-immersive-pause-mobile.png` |
| Saving and completion | Saving stage, completion, and feedback processing followed by ready feedback exercised against local responses. | `rc-immersive-saving.png`, `rc-immersive-complete-mobile.png`, `rc-immersive-feedback-processing.png`, `rc-immersive-feedback-ready-desktop.png`, `rc-immersive-feedback-ready-mobile.png` |
| Paragraph and passage transitions | Advanced to another paragraph and another selected passage. | `rc-immersive-reading-second.png`, `rc-immersive-next-passage.png` |
| Finalization failure | Deliberate local save failure presented a retry; retry completed the save. | `rc-immersive-save-failure.png` |
| Audio upload failure | Deliberate local upload failure retained the real blob; retry succeeded with exactly one capture and one uploaded blob. | `rc-immersive-upload-failure.png` |
| Save and leave failure | First pause-overlay save failed; retry saved and exited. | `rc-immersive-pause-save-retry.png` |
| Finish early | Explicitly ended attempt stored `completed: false`. | `rc-immersive-finish-early.png` |
| Interrupted recording | Stopping the real native MediaRecorder triggered the interrupted state and disabled advancement and Resume. | `rc-immersive-interrupted-mobile.png` |
| Denied permission | Chromium denied actual microphone permission; the exercise showed its permission error. | `rc-immersive-permission-denied-mobile.png` |
| Resume and reduced motion | Restored paragraph 2 at 1:15; reduced-motion inspection found no animation and effectively zero transition duration. | `rc-immersive-resumed-reduced-motion.png` |

Width-specific reading and recall captures exist for 320, 390, 768, 960, and 1440 px as `rc-immersive-reading-WIDTH.png` and `rc-immersive-recall-WIDTH.png`. Final desktop/mobile reading, recall, mobile pause and completion captures were refreshed after fixes.

Final DOM readback confirmed the primary action had the same x/y/width/height in reading and recall at every viewport below. There was no document overflow or root scroll jump (`scrollY: 0`).

| Viewport | Primary action x, y | Width × height |
| --- | --- | --- |
| 320 × 900 | 116, 828 | 184 × 48 |
| 390 × 844 | 186.4, 772 | 184 × 48 |
| 768 × 900 | 525.6, 820 | 204 × 48 |
| 960 × 900 | 708, 820 | 204 × 48 |
| 1440 × 900 | 952, 820 | 204 × 48 |
| 844 × 390 landscape | 597.8, 310.4 | 204 × 48 |

The saving heading retained the same y position, 298.1, before and during saving. Final denied-permission verification used Chromium `Browser.setPermission` with the actual browser context returning denied and the exercise displaying the blocked message. Restored paragraph 2 remained at 1:15 with animation disabled under reduced motion.

The final setup refinement was also browser-verified at 390 × 844: setup, reading, and permission-denied actions all measured x 186.4, y 772, width 184, height 48. The refreshed full suite, typecheck, build, and postbuild passed after this refinement.

## Automated checks

After all fixes: 771 of 771 tests passed across 26 files; final typecheck exited 0; final production build and postbuild exited 0.

## Final acceptance

- [x] Parent confirms the 320 px long-content focus and document scroll fix.
- [x] Final narrow, mid, wide, docked-width and landscape layout readback confirmed after fixes.
- [x] Final relevant automated checks confirmed after fixes.
- [x] Parent marks local implementation ready.

The 21st.dev skill was read, but its MCP tools were unavailable. Implementation used existing project components. The apparent MCP backend diff was identified as a Vite-generated stub containing a machine-local import and restored to HEAD after the final build. No backend changes remain in this redesign.

The local verification was completed before commit or publication. The dated release section above records the subsequently authorized push and verified frontend publication; production persistence remains unverified.
