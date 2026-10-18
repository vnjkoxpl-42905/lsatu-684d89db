# LR drill builder refinement

Requested 2026-10-18. The current design contract is in [the LR setup brief](../../implementation-plans/2026-09-26-lr-drill-setup.md). This page records evidence rather than introducing another product plan.

## Why the original felt unfinished

- The Your set rail described the entire question bank before an exact drill existed. Dense type/difficulty/history counts competed with the question count and primary action.
- Guaranteed, raw question IDs and Inspect described implementation rather than the student's task. Preview rows omitted section identity and used compressed difficulty labels.
- The untimed-mode paragraph repeated across summary, mobile tray and dialog. The fixed mobile tray crowded the classroom frame.
- Thirty-pixel bold headings, bold helper text and bright dividers gave many elements equal emphasis. The search pill did not match the adjacent selectors.

Reference: Joshua's four attached production screenshots and the signed-in Codex-browser builder on 2026-10-18. The actual host rendered Outfit 700 at 30px/36px for the setup heading. The production route was opened without starting a drill or altering answers.

## Intended hierarchy and preserved behavior

The default task is filters, question count, then Preview drill. Add specific questions is optional; advanced filters remain available. A compact summary describes the requested drill and selected conditions, with exact contents available after preview. View questions and Start drill have distinct actions. One concise timing/reveal explanation is sufficient per surface.

Keep the existing dark classroom surface and Outfit family. Use a restrained type/spacing scale, aligned controls, consistent radius and visible focus/selected/disabled/error states. No new gradients or shadows. Preserve all selection and frozen-preview contracts, read-only previews, ownership checks, and canonical source/key data. RC is outside this visual change.

## Verification

Codex-browser verification used the running development builder in its classroom wrapper at 320, 768, 1024, 1440 and 650 CSS pixels. All five had no document overflow. The optional question table scrolls inside its own region; mobile search inputs render at 16px. The final wide layout keeps the optional question disclosure directly below the filters.

Verified preview creation moves focus to View questions, Escape returns focus there, and Edit questions moves focus into the newly opened search field. Expanded previews show readable source references, stimulus, stem and five ungraded choices. Empty searches show No questions match this search. No Start, Save, answer or production mutation was performed.

SavedSets was rendered through the isolated synthetic fixture in e2e/lr-saved-fixture. It has no account credentials or backend access; mutations reject. Verified the renamed action, expanded question body and unavailable-question fallback without exposing raw IDs.

The picker suite passed 20 tests, including atomic parsing, preview invalidation, exact launch behavior and focus recovery. SavedSets passed 2 tests. Independent code review found the Edit questions focus issue, which was repaired and checked in the browser. Final integration checks and PR status are recorded in the release PR. Physical devices and screen-reader speech were not tested.

Screenshots: [phone](final-320.jpg), [tablet](final-768.jpg), [desktop](final-1440.jpg), [docked browser](final-650.jpg), [saved question preview](saved-preview.jpg). These are development and synthetic-fixture evidence, not a claim of publication.
