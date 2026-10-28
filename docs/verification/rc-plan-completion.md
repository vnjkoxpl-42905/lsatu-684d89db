# RC plan completion evidence

Date: 2026-10-17. Baseline: published PR #219, merge `2f1b3bee`. Working branch: `codex/rc-plan-completion`. This document records a release candidate, not a published or fully accepted release.

## Implemented in this candidate

- Typed RC fixed sets and selection recipes in existing owner-scoped `user_saved_sets`; configuration-only Open, exact fixed question snapshots, fresh recipe inspection, save acknowledgement, durable command retry, rename and duplicate. LR listing and launch reject RC definitions. No deletion controls were added.
- Metadata-first standalone and builder previews; explicit full-text reveal waits for an acknowledged, stable exposure event. Existing append-only `question_exposures` stores namespaced RC events. Errors remain unknown, reads paginate, and LR cooldown excludes RC records.
- Separate legacy Not attempted and No recorded exposure filtering. Earlier untracked previews cannot be ruled out. Section eligibility includes recorded full-text exposures. Backend source indicates preflight creation creates only the ready parent; Start creates the RC child. This boundary is not live acceptance proof.
- Ordinary RC Display controls and compact reader panes, acknowledged prior review choices, optional unanswered questions in whole-passage retries, and review suggestions based on learner-owned flags, unanswered status, recorded time and optional reported confidence.
- Adaptive explanation of target difficulty and sample; first-ever answers, recent graded answers and review correction counts are distinct. Hidden contributing grades suppress displayed correctness and target details. Adaptive excludes undisclosed grades while results remain hidden so selected difficulty does not disclose them indirectly; the first-take thresholds and review semantics remain unchanged.
- Optional prediction, reflection, confidence and paragraph training for ordinary manual/adaptive work. Learning events are separate JSON metadata, acknowledged with stable command IDs and raw-config compare-and-swap. Protected and assignment work rejects training. Clock saves preserve concurrent metadata. New sessions strip prior learning metadata.
- Missing question prose and absent passage summaries are explicit. Tags are not explanatory prose. Summary tabs support arrow/Home/End keys and labelled panels. Imported response percentages are labelled as imported.
- Explicit quick presets, owner/device timing default with per-session override, removable filter chips, picker sorting and selected-order controls. No preset starts work.
- Exposure-filtered selection requires explicit inclusion of historically unknown material with counts disclosed. Start rechecks the ledger and rejects newly exposed selections without substituting. Launch snapshots support future take-history labels; older missing baselines remain Unknown.
- History filters distinguish configured timing and recorded exposure/repetition. Earlier attempts establish repeat provenance without relying on correctness. Duplicate historical first-answer rows use the earliest row per sitting/question consistently.
- Evidence notes carry original-source offsets, quote, learner note and SHA-256 of the entire passage; save revalidates source membership and fingerprint. Source coordinates are distinct from rendered highlight offsets.
- Explicit timing checkpoints separate visible passage-only, question-only and shared split-pane intervals, exclude paused/hidden-tab intervals, and disclose per-visit/reset limitations. They are observations of pane visibility, not active reading or attention.

## Browser evidence

Used the isolated Vite fixture at `127.0.0.1:8098`, real React components with synthetic services. No live student answers, clocks, messages or definitions were changed.

- Saved a recipe; account acknowledgement appeared. Open returned to configuration with “No drill has started”; Preview was required before Start.
- Failed a fixed-set save, reloaded, then retried the persisted original UUID `1eef6f2a-6f97-4b9c-8e56-98296f2edcc6`. The synthetic count became one after acknowledgement.
- Saved and reopened a fixed set; configuration restored its selected passage and required a new inspection. Explicit full-text reveal then showed passage/questions with no credited-answer cue.
- Prediction save rejection kept choices hidden and the learner text intact. Allowing the synthetic save and retrying restored choices with the saved prediction.
- Paragraph training showed paragraph 1 of 2; Enter on Next paragraph revealed paragraph 2. Confidence could be explicitly recorded Low.
- Display exposed size, spacing, focus and six schemes. At 390 × 844 the ordinary reader showed Passage/Questions controls; Questions exposed the question pane. Screenshot inspected visually.
- Further browser verification encountered extension timeouts. No screen-reader, physical-device or 200% zoom claim is made from these checks.
- A later browser session verified configurable Flagged/Unanswered/Low confidence and recorded-time review controls. Missing confidence was described as Unknown; no correctness-based suggestion was required.
- A clean isolated training run acknowledged a quoted source note and then displayed an observed checkpoint of 0.0 seconds passage-only, 0.0 seconds questions-only and 27.2 seconds shared split visibility. This is synthetic-service UI evidence; service validation is covered separately by tests.
- The original training fixture reused the review session identity, contaminating local recovery. It now uses a distinct training identity and optional `run` namespace. No stored records were deleted to obtain a clean run.

## Automated checks

- Final integrated regression command, matching the expanded RC PR workflow: **770 tests passed across 77 files**.
- After the signed-in acceptance repairs, the repeated complete command passed **773 tests across 77 files**; typecheck/build and targeted Results/retry lint passed.
- Typecheck passed. Production build passed, including answer-key/search-address validation and the postbuild canonical-content check. Existing bundle-size and dependency-data warnings remain.
- Independent cross-owner reviews covered saved command recovery, exposure/history masking, clock/config conflicts, protected training boundaries, evidence fingerprint validation, observation semantics and the strict Start recheck. The pending-save rename issue identified in review was repaired and regression tested.

## Production read-only evidence

Using the app's configured public connection, `question_exposures?select=id&limit=0` and `user_saved_sets?select=id&limit=0` both returned HTTP 200. No row content or credential was printed. This establishes endpoint availability, not owner write acknowledgement, RLS completeness, migration equivalence or two-device acceptance.

## Authorized signed-in backend acceptance

Joshua explicitly authorized clearly labelled test RC work in his own account, including one test timed section, and requested the Codex in-app browser. The full PR branch runs locally on port 8099 against the live backend; this is not a frontend publication.

- Confirmed the signed-in UI identifies Joshua Fisseha.
- Saved `[RC QA 2026-10-17] Recipe`, refreshed, and reopened it into configuration without starting work. Saved `[RC QA 2026-10-17] Fixed PT139` with the exact seven-question snapshot.
- Used previously completed PT139 S3 P1, Improving Farm Economics, rather than reserved material. Full-text preview waited for account exposure acknowledgement.
- Created ordinary test sitting `6ca71bac-0813-453e-b3b3-d6bbe466ee68`. A labelled prediction saved, survived refresh, and restored from the account. Confidence, fingerprinted evidence note and observed timing checkpoint also acknowledged.
- Refresh found local elapsed time ahead of the account checkpoint and opened the intentional clock-recovery guard. Awaited Retry saved and resumed successfully. This was initially described as a suspected defect; source and live retry establish that it is the existing safety policy. An added regression covers learning metadata, delayed clock acknowledgement and a clean subsequent reload.
- Completed with one test answer and six unanswered questions. Neutral results concealed score/credited answers. Set exclusion; on return the action read **Include in analytics**, confirming the excluded state.
- Saved a separate blind-review answer, refreshed, opened its exact question and found Saved review answers plus Answer again blind; no credited answer, verdict or score was shown.
- A subsequent backend fetch interruption returned the tab to sign-in. Reveal persistence and timed-section acceptance were not yet completed at this checkpoint. Existing records were retained; do not create a replacement test sitting on retry.
- Joshua signed back in. Resumed the same completed sitting, acknowledged explicit reveal, refreshed, and verified the persisted 1/7 result and Q1 original A. The later review B did not overwrite it; exclusion remained saved.
- Live review caught a missing Include unanswered questions control. Added it and tested the correct-plus-skipped case; repaired a legacy null-selected/false-grade helper edge case. The same account result now enables whole-passage retry only when unanswered questions are opted in. No extra retry sitting was created. Analytics now uses a current included/excluded status beside an ordinary action button, avoiding a changing action label with contradictory pressed semantics.
- Prepared new protected RC sitting `4b0b9a21-7905-4190-a923-40efeb325538`, PT101 S1, standard. Ready UI said 27 verified questions, 35:00, account acknowledged, clock not started. Explicit Start rendered the shared RC reader and countdown. Pause acknowledged; refresh preserved 34:45 paused; Resume continued. Find displayed `0/0 · No matches`. Paused again and left it paused with no section answers entered. Training options were absent. Other unfinished sections were not opened or changed.

CI run `39084186061` passed on head `4bcf597d`. Subsequent evidence/test-only follow-ups require their own head check before merge.

## Acceptance still required

Remaining signed-in backend/reveal/reconnect/account-switch/two-device cases; real section clock, pause, expiry and accommodations; protected seal and feature-off journeys; actual screen-reader speech, 200% zoom and physical devices; learner and equivalent competitor tasks. T09 content inventory still contains 556 questions without explanatory prose. Content presence is not teaching-quality approval. Missing media production remains separate.

Do not mark the full plan complete from this candidate, unit counts or synthetic browser evidence. No new merge, frontend publish, backend deployment or Lovable credit spend has occurred for this branch.
