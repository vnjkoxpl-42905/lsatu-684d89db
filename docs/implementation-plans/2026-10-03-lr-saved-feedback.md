# LR saved feedback settings

Date: 2026-10-03

New standalone LR custom and Smart Drill sittings save their Training mode, feedback policy, original source, launch kind, answer model and layout. Continue resolves the exact account-owned sitting before loading its questions. Saved queue and conditions win over changed URL questions, labels or layout. The runner and completed Results/Review show the saved conditions.

Older sittings remain readable and disclose that feedback settings were not saved. Existing answers retain their original metadata or its absence. New answers in an older sitting may record their actual current conditions without inventing historical ones. Guided, assigned and official timed sources are not relabeled as standalone Training runs.

Verification: 61 tests across six focused suites passed; full typecheck and production build passed; scoped ESLint returned zero errors with 29 warnings in the existing runner. Independent source review found no blocking issue. Real designated-tester browser verification saved and completed two questions, reloaded with changed URL questions/layout, retained official PT101 source and feedback policy, and displayed it on completed Results and Review. Phone/tablet/desktop widths 390/820/1280 had no document overflow. Browser evidence is in `artifacts/2026-10-03-lr-feedback/browser-report.json` and screenshots beside it. The older-sitting disclosure is covered by tests; no completed legacy fixture was available in this account for a browser walk.

QA records created during retries remain in the designated tester account. No student record was deleted or rewritten. No schema, Edge Function, paid inference or Lovable agent action is part of this slice. Full #171 acceptance remains open. The Review source audit and execution plan are separate; this slice does not implement broader Review episodes.

Publication verification will be recorded after guarded push and exact Lovable import.
