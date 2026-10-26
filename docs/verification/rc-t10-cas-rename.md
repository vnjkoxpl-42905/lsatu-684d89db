# Saved RC rename conflict verification

Recorded 2026-10-18. Renames compare the name displayed when editing with the persisted name in the owner-scoped update. They preserve a different newer value and request refresh. A lost acknowledgement can recover when the desired name is already present. A failed save whose readback retains the original name reports a failed save, not a device conflict.

Root observed the actual local app with the configured backend in two in-app browser tabs under the same authorized account. Existing labelled QA definition `f14cd7a1-a15d-467e-a699-806a143396a5` was renamed in the first tab to `[RC QA 2026-10-18] Conflict acceptance current`. The stale second tab attempted `Stale overwrite must fail` and received an explicit conflict. Retrying the list read preserved the newer name; the stale edit was cancelled. Screenshots: `rc-stale-name-conflict.png` and `rc-stale-name-preserved.png` in the session visualization evidence. No new definition, clock or student attempt was created. The existing QA definition is retained under its new name.

This is one account and two tabs, not two independently authenticated physical devices. The compare-and-swap condition uses the previous name rather than a monotonically increasing row version. It therefore cannot detect a name changing A to B and back to A before the stale rename. Do not describe it as complete version-based concurrency protection.

Focused API regressions cover stale-name rejection, desired-name recovery, missing expected-name refusal and unchanged-name readback after a failed write. Root owns final aggregate validation and release status.
