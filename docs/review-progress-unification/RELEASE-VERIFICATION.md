# Main release preparation, 2026-10-28

Joshua explicitly authorized main after Claude and Codex review. This supersedes the draft-only status in the earlier VERIFICATION.md receipt. Main PR248 at9b1eec11bde0746f899c34ec9b5d42630395bfe8 was merged into this branch without conflicts. Codex confirmed no changed-file intersection with this feature; the incoming teacher credits/scheduling changes are preserved.

## Review corrections

Additional Claude full-source reviews identified the answered LR section destination mismatch, the drill-only Analytics shortcut, and legacy Types/tab-focus behavior. Codex additionally identified an unsupported legacy config-only RC full-test report binding. All were corrected:

- Answered standalone LR section results now render saved first answer and Correct/Missed outcome. Existing opened-blank rules remain; the exact owner reader requires persisted valid completion, full-section mode and no PT parent.
- RC full-test report actions require physical parent/leg binding matching the actual reader. Legacy config-only evidence remains visible with an unavailable action; analytics and first identity are unchanged.
- The Analytics Progress shortcut requires resolved current-actor analytics/admin access.
- Explicit Progress tab navigation clears legacy Types mode. Explicit To review tab navigation clears old selected-row focus; detail-return selection remains intact.

The full-source Claude result remained REVISE until these final navigation corrections. A final targeted Claude inspection of StudentDestination, its tests and actor memory APPROVED those two corrections with0findings. This is scoped approval, not whole-repository approval. Read-only Codex audits reported0confirmed material remaining findings in the final data/permission patch and the final navigation patch. Exact review transcripts/results are preserved in the vault plan folder REVIEW-LOG.md.

## Final executed proof

- Host integrated post-data-fix run:157tests across11files passed, including real source adapter -> capability URL -> mounted section detail, exact owned reader, actual-source replay, permissions, route metadata, shell and return parser.
- Host final navigation run:69tests across3files passed. These overlap earlier scopes and must not be summed with them.
- Final npm run typecheck passed after the navigation source was frozen.
- Final npm run build and postbuild passed.7993modules; build1m44s; final local main asset index-BzE1BX-Q.js; no canonical guide content in785distfiles. Existing utility, noise asset and chunk warnings remain.
- Real local owned answered LR section shows its saved answer and credited answer and returns to Progress. Legacy /progress/topics redirects to Types, and clicking Progress reaches /review/progress?window=all with overview chart and recent answers visible.
- Earlier desktop/phone/theme/motion/source proof remains in VERIFICATION.md. Browser/tool connection reset during this phase; the lost process receipt was not claimed as a pass, and the final checks were re-executed.

No backend deployment, policy change or paid Lovable action is part of this feature. The existing Vite MCP plugin's generated backend entry is restored to committed baseline before committing. Separate live wrong-actor/protected-parent student-role execution remains unrun; current policies and downstream guard evidence are documented in POLICY-EVIDENCE.md.

Main merge, free frontend publication, exact Lovable commit parity and custom-domain verification will be recorded in the external release receipt after those actions occur. They are not established merely by this preparation receipt.
