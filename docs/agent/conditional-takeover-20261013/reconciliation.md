# Conditional work reconciliation, 2026-10-13

## Why the histories diverged

Both sessions continued independently from `64792cc5`. Codex pushed repair `7dce7199`, then integrated current main and corrected the push gate, ending at `639190ac`. Claude later produced `877273c8` and `54c7fecb` from the earlier base. Its normal push was rejected because the PR branch already contained Codex's changes. There was no rollback of the PR.

Claude then tried to combine the histories in `lsatu-conditional-merge`. That attempt had 24 conflicting files. Its agent partly resolved them, then stopped at the session limit. The partial merge was never successfully built, tested or independently reviewed. It remains preserved; this reconciliation was reconstructed in a separate checkout.

Exact later Claude session: `fcf871e0-bec1-4050-afcb-31aaf7c75f07`, last recorded event 2026-10-13 20:50:17 Toronto. Its seven referenced agent transcripts were inspected. The earlier original takeover session was `9e2e52ef-70a6-4763-a599-5a2d1b96a303`. No direct message was sent to either Claude chat.

## Which output was stronger

Codex's committed version was the stronger verified functional baseline. It had completed all 12 drills in a local browser, checked persistence/reload and completion, and passed typecheck, build and a responsive sweep. Claude's additional commits contained useful preservation and instructional refinements, but did not justify replacing that baseline wholesale.

| Area | Retained combination |
| --- | --- |
| Historical work | Claude's granular migration and full previous-run archives, with Codex's content signatures and honest completion rules. |
| Worksheet symbols | Complete semantic conditions and exact highlighted text; NOT denies the complete condition. Original source items/provenance remain unchanged. |
| Answer disclosure | Models follow written readback or deliberate help; later objective work does not get its answer from earlier feedback. |
| Completion | Codex's explicit worksheet self-review, validated mixed completion and independent follow-ups for distinct mistakes. |
| Lessons | Codex's persistent sibling interactions and continuous indicator flow, with selected Claude copy improvements. |
| Foundation practice | Codex's two-miss Show me and honest first score, plus Claude's prior-run preservation and restart control. |
| Walkthroughs | Claude's unopened/manual-start and replay controls, plus Codex's visible boundaries between adjacent highlighted conditions. |
| Account boundaries | Readiness gates, keyed course scope and scoped legacy migration; no signed-in fallback to another account's standalone work. |

Taking Claude wholesale would remove some help, persistence and completion safeguards. Taking Codex wholesale would miss useful history migration and feedback/walkthrough refinements. The result is a selective reconciliation, not a claim that either provider is universally better.

## What the Codex review actually did

Round 1 genuinely inspected `64792cc5..877273c8` and returned REVISE with seven findings: destructive worksheet invalidation, cross-account staged answers, omitted timing, lost modality in symbols, restored scores without responses, premature contrapositive disclosure, and eviction of completed-run history. Claude committed follow-up fixes in `54c7fecb`.

Round 2 inspected nothing. Its shell failed before execution, the alternate reader was unavailable, and its GitHub request returned 404. Claude acknowledged that failure. It is not a second approval. Those Codex review calls also were not direct contact with this coordinating chat.

Both runs requested Codex with `gpt-6-astra`, high effort. The artifacts did not record an observed model, so the actual model execution is not independently established from that metadata.

## Verification of the combined version

- Final combined regression run: **35 files, 421 tests passed**. Earlier stale-copy assertions and one invalid legacy fixture were repaired without weakening the underlying behavior checks.
- App typecheck passed. Production build/content guards passed; final integration checks are recorded after bringing the review branch up to date with main.
- New full responsive browser sweep: **150 checks passed** at 375/640/900/1440 pixels, plus default-token samples, with no document overflow or clipped controls.
- Browser replay of two forward-production and two contrapositive worksheet items passed wrong-answer hints/Show me, saved drafts after reload, symbol/diagram operations, writing and final self-review. This is additional coverage; the earlier parent run completed all 12 drills and 243 main questions.
- Source originals, all 133 IDs, source paths and hashes match the verified parent exactly.
- Independent source review found an additional migration defect: old incomplete modal highlights could keep their passed status after the grading key tightened. Restore now rechecks those highlights, archives the old attempt and clears dependent passed stages while retaining earlier work and drafts. Its regression passed.

Signed-in production persistence, publication and physical-device acceptance remain separate. No production merge, deployment, assignment, paid provider call or new media was performed. Teaching copy remains provisional for Joshua's editorial review.
