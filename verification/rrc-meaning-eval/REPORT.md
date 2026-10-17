# LR Recall grader: final live verification on 2026-10-17

The final deployed grader accepted all three designated reference performances at **100% operative meaning**, with a correct Read and specific colour. It also rejected all three intentionally contradictory control claims. Exhaustive detail coverage remains separate and was not overwritten to force perfect scores.

The live function returned **`2026-10-16-grounded-meaning-5`**, through `lovable-gateway`, using the unchanged configured Gemini 3.1 Flash-Lite model. Grader source includes the source-only rubric integration `354c8140` and Read repair `5ffab1b9`; dependency restoration `96bc7af1` preserves the original unrelated project configuration. The endpoint verifies its build/backend, but does not return upstream model metadata, token usage or AI grading cost.

| Reference | Operative meaning | Full detail coverage | Read | Method |
| --- | ---: | ---: | --- | --- |
| PT105.S2.Q1: cave | 100%, 16/16 essential facts | 83%, 20/24 facts | Correct | Specific colour; no reciting or listing |
| PT105.S2.Q2: vaccines | 100%, 18/18 essential facts | 100%, 19/19 facts | Correct | Specific colour; no reciting or listing |
| PT105.S2.Q3: network | 100%, 11/11 essential facts | 100%, 11/11 facts | Correct | Specific colour; no reciting or listing |

All three reference rows report `meaning_key_status: reviewed` and `meaning_key_version: source-reviewed-2026-10-16-v1`. Those fixed source-only criteria are selected before considering the learner's response. The model's materiality suggestions cannot change the denominator. Facts omitted from exhaustive coverage remain visible even when they do not change the source's operative reasoning.

The returned Read explanations confirm that the grader accepted:

- Q1: stalagmites show that the cave was not always submerged.
- Q2: sales volume does not establish total profit without considering profit per dose. This is a valid alternative to the authored sample loophole.
- Q3: lost productivity and the assumption that saving money overrides other concerns challenge the installation recommendation.

The three synthetic controls deliberately alter one source claim and its matching authored detail, while leaving the saved recording transcript unchanged:

| Synthetic alteration | Meaning / detail score | Target judgment | Key provenance |
| --- | ---: | --- | --- |
| Above-ground access instead of underwater access | 79% / 79% | Contradiction rejected as essential | Conservative fallback |
| More profitable instead of less profitable | 95% / 95% | Reversed comparison rejected as essential | Conservative fallback |
| No work disruption instead of disruption | 91% / 91% | Reversed consequence rejected as essential | Conservative fallback |

All three target checks passed, with zero credited decoys. Changing a source invalidates its exact reviewed key, so these controls correctly use `fallback` with a null key version and treat all authored facts as essential. They test contradiction detection and conservative stale-key handling. They do not constitute live wrong-answer tests under the unchanged reviewed keys; deterministic unit tests cover that fixed-denominator behavior.

Exactly three reference jobs and three control jobs were submitted once for this final build, with no automatic retries. All six returned valid grades with zero unjudged details. The server retains its configured gateway-to-direct fallback; six question jobs are not a claim about the number of upstream HTTP attempts. No historical student attempts or saved grades were overwritten.

The server reconstructs quotations from numbered units of the learner transcript. An independent local audit checked each newline-separated quotation against the source-read-stripped transcript and found no invented quoted units in either batch. Literal grounding alone does not establish that every quoted passage semantically supports every incidental factual judgment.

These tests use saved active `model_runs.transcript_text` snapshots of the designated recordings, with preflight hashes and complete source provenance. No direct listening or independent audio/transcript alignment is claimed. The altered cave control can retain one original read-aloud phrase because its synthetic key changes the read matcher; the rejected claim is also independently supported by the actual retelling. This limitation remains recorded rather than hidden.

Reviewed essential-meaning keys currently cover these three questions. Unknown or changed source snapshots retain conservative all-essential grading. This bounded result is not a certification of every question or every recording in the library.

The final production build passed after restoration of the five unrelated dependency files, including the 758-file canonical-content guard. The unrelated MCP working-copy bytes remained exactly SHA-256 `c436d33df2e99cca3c80893ed27985f5df6e3b7dca6fa93e4749f80d2a55996c`.

Complete final receipts:

- Reference run: `2026-10-17T04-56-54-447Z-live-census/`
- Controls: `2026-10-17T04-57-40-237Z-live-controls/`
- Production build: `final-restored-deps-build.log`

Each receipt folder contains the full response, summary, original source/payload hashes, transcript snapshots, request payload, reconstructed stripped transcripts and independent evidence audit. The control folder also contains explicit target checks. Earlier failures and intermediate receipts remain intact. AI grading token usage and cost were not returned; deployment credits are accounted for separately.
