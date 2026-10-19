# Guided-entry review log

Codex coordinates/builds; Claude independently reviews. Requested and observed model `claude-opus-5-5`, effort low. This is the new instructions-first, mandatory-recording and passage-progress scope requested after PR225; prior approval is not reused as approval of this new implementation. Maximum two narrow migration review rounds and two final inspection rounds. Full responses remain in external runner artifacts.

## Narrow migration review, round 1

REVISE: `C:/Users/Joshu/AppData/Local/Temp/rc-guided-entry-review-20261018/claudex-dszdjahc/result.json`.

- PP-1 medium: accepted need for explicit completion-before-finalization proof. The actual runner integration awaits acknowledged passage completion before advancing, retaining failed timing intent for exact retry. Keep finished attempts sealed rather than allowing retroactive progress. Add/check ordering regression; the first reviewer did not inspect runner integration.
- PP-2 low: owner-only direct writes are deliberately accepted. SECURITY INVOKER plus owner RLS and trigger guards apply equally to direct writes and RPC. This is self-reported practice metadata; a SECURITY DEFINER RPC accepting the same valid values would not prove effort. No delete access; completion/identity remain immutable.
- PP-3 low: accepted. Read the owned attempt FOR SHARE inside the RPC so finalization cannot race the transactional progress save. Both portable and managed drafts must match.

No migration deployment, hosted-build diagnosis through the paid agent, or provider calls are authorized by this review. Fresh Lovable approval is required before credit-spending deployment/diagnosis. Prior grading-call budgets are exhausted. Runtime RLS/persistence and final UI/video acceptance remain separate checks.

## Narrow migration review, round 2

APPROVED with no findings: `C:/Users/Joshu/AppData/Local/Temp/rc-guided-entry-review-20261018/claudex-ctzjb3jl/result.json`. The same reviewer confirmed acknowledged completion-before-finalization, retained exact retry intent, the accepted owner-write tradeoff, and matching FOR SHARE changes in both SQL drafts. It did not approve UI/video or execute SQL/tests. Runner ordering regressions and checkpoint/clock tests passed separately (51 focused tests); helper tests passed 11/11. Fresh Lovable approval for this additive migration and hosted-build diagnosis has been requested and is pending.

Joshua approved migration/build diagnosis. Lovable messageumsg_01m5947bgwefz8q07463jstb5x completed, cost3.1credits, commit3102226f2b9c044314ac30a351ab29e70ea0b487. Applied drizzle0037 with grants moved before RLS, substantive SQL unchanged; verified owner/admin policies, no anon/no authenticated DELETE, INVOKER RPC/FOR SHARE/advisory lock, identity/monotonic/immutable guards. Existing15attempts38recaps4captures7grades checksum-identical. Runtime API acceptance is separate. Hosted logs proved prior build successful; root corrected the stale-history interpretation and Chrome verified live PR225 bundle3zZC5fS_. No frontend/package/Edge Function changes or provider calls by Lovable.

## Final inspection, round 1, 2026-10-19

REVISE, requested/observed claude-opus-5-5 low: external artifact claudex-dx4vleq3/result.json. GE-1 accepted: deploy and prove finalized-retry repair. Joshua freshly approved; Lovable applied additive0038, cost1.5credits, and all23 runtime checks now pass, including the retained finalized fixture. GE-2 accepted: restored original0300 portable SQL and managed draft RPC body; only deployment-status comment changes in historical draft. Repair exists only in additive0400 and managed0038/patch. Failed receipt preserved.

The reviewer sampled full tracked diff and read repair SQL, runner/ordering, helper, landing/routes/LR labels, timing/checkpoints and VTT. No further correctness/security defect found in sampled code. It did not execute tests/SQL or inspect image/video/JSON evidence, and only skimmed reload-finalization recovery. Host independently ran build/typecheck, 898 Reading Center tests,29 final runner tests,11 helper tests; Chrome completed single/full runs with independent metadata readback, five-width layouts, pause/resume and full60-second demo playback. Second fresh inspection follows the deployed repair and receipts.

## Final functional inspection, round 2
APPROVED: external claudex-_wtfdi8e/result.json, requested/observed claude-opus-5-5 low. Exact functional snapshot committed at12643d29d4d265f46de3fad5b5a6c40124a9a62e. No material findings. Two low notes: historical deployed migration comments still say draft, retained to preserve applied source provenance; unstarted prestart checkpoints can clutter resume UI. Reviewer inspected tracked diff/JSON receipts, not binary media or live systems; host and backend verifier supplied runtime evidence.

## New screenshot-driven visual refinement
Before merge, Joshua explicitly expanded scope through two screenshots, especially the serif heading/purple focus line and repeated unfinished-practice sentences, and requested 21st.dev MCP. This later work is separate from the completed functional inspection budget, is not falsely covered by that approval, and gets a focused fresh inspection against12643d29. Root connected official MCP with existing environment credential, searched and retrieved Card demo31495 by wensity (one free retrieval, AI disabled, no generation). Selector agent owns heading/resume grouping and styles/tests; runner agent owns never-started checkpoint suppression/tests. Root owns signed-in IAB/Chrome and five-width proof. No backend, provider or paid Lovable actions are needed for this visual scope.
