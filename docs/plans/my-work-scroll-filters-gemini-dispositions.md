# Argon High review dispositions, 2026-10-27

Review-only invocation. No application source changed in response to these findings. Verdict remains REVISE, not release approval.

The standard runner timed out while its Gemini session remained active. The host recovered the terminal response from that same session, validated it against the runner review schema and audited all trajectory steps for forbidden command/mutation tools. Audit passed. Requested model gemini-4-argon/high, pinned MODEL_PLACEHOLDER_M417. Original failed result.json remains intact; recovered-result.json separately records the completed REVISE response. No failed run is treated as approval.

## MW-MOTION-01: Modify and accept the underlying defect
Pointer filter buttons and Radix portal selection do not reliably set the shared hook's listInteraction flag. Native keydown/input/change listeners do not cover every React URL update. Newly surfaced rows can animate during filtering; existing hidden rows depend on later geometry refresh. This is a real interaction coverage gap. Treat as medium rather than high until runtime reproduction establishes prolonged missing content: the cited 100ms refresh normally recovers rows, so indefinite disappearance is not demonstrated.
Remediation plan: explicit filter-intent signal owned by the relevant motion boundary, called before every filter state update, including portal choices and Clear filters. Settle only that boundary's list animations, then make newly discovered filter results immediate. Test pointer-only use, touch, portal choices and newly surfaced pagination records. Do not suppress Load more's requested reveal as though pagination were a filter.

## MW-MOTION-02: Accept
The final scroll-batch distribution fix only applies to ScrollTrigger-entered rows. Initially visible and asynchronously inserted visible list rows still use per-list cumulative index with Math.min(index*.05,.15), so trailing rows share a delay and separate status/month containers restart ordering. Prior browser trace proved the offscreen branch, not all entrance branches.
Remediation plan: route all list entrants through the same DOM-ordered bounded batch scheduler, with fresh batch membership on Load more and no per-group cumulative delay. Add tests for visible batches longer than four, simultaneous multiple semantic groups and Load more. Retain immediate filter and reduced-motion behavior.

## MW-MOTION-03: Modify
Returning to an archive can leave siblings using entrance animation while focus restoration settles only the selected row. Accept this return-navigation consistency issue. Narrow the claim about measuring an 8px offset: target.focus() dispatches focusin synchronously, and the current interact handler settles the target before returnToNote measures it, so the stated offset failure is not established for the normal path.
Remediation plan: explicitly settle the archive list before anchor restoration/scroll measurement, preserving existing nearest-survivor semantics and account/path-scoped anchors. Verify mouse Back, browser POP, keyboard, reduced motion and unread-filter removal with surrounding rows immediately readable.

## MW-WORK-01: Accept
Valid active URL filters are discarded when their values are absent from currently loaded visible rows. This can transiently show unrelated categories during partial multi-source loads, and permanently show unrelated work after completing the last matching item. The same pattern already existed for Subject; Work type extends it.
Remediation plan: validate against domain values independently of current rows; preserve valid empty selections in options; render empty results and Clear filters rather than silently clearing filters. Keep access filtering authoritative. Use stable kind keys rather than display labels if evolving this contract, preserving existing URLs where needed. Test partial source results and completing the last matching assigned item; counts and returnTo must remain faithful.

## MW-MOTION-04: Modify, low priority
Dead loading markers are harmless because role=status is deliberately excluded; do not interpret that as a loading/readiness correctness failure by itself. Accept that My Work's empty/loading/error/personal states can inherit the old blurred parent entrance while populated rows use the crisp list preset, conflicting with this pass's crisp material goal.
Remediation plan: remove redundant markers where appropriate and give My Work's non-list states an explicit crisp or immediate entrance policy. Do not remove generic StudentDestination behavior for unrelated destinations or force an inaccessible empty boundary. Verify empty, error, loading and Personal notes states directly.

## Next authorized implementation gate
Implement only after Joshua requests fixes. Update plan to include the above scenarios, run focused tests/typecheck/build and inspect actual rendered natural motion at desktop/phone sizes. Gemini reviewed source and static artifacts; it did not exercise the live browser or production data. Existing host evidence is not expanded by this review.
