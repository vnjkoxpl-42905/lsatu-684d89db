# Three reference recordings tested against the deployed grader

The updated function answered with build `2026-10-16-meaning-evidence`, through `lovable-gateway`. The run submitted exactly PT105.S2 questions 1, 2 and 3 once. There were no automatic retries, stored student regrades, or database writes by the census branch.

The parent deployment receipt reported **0.8 Lovable credits** for deployment. This is separate from AI grading usage, which the census response does not report. All three tests were attempted; only one returned a valid grade.

| Question | Result | Detail score | Meaning deductions |
| --- | --- | --- | --- |
| PT105.S2.Q1 | Rejected model response: `Detail 1 has no evidence audit` | Not scored | None can be assessed from this error |
| PT105.S2.Q2 | Rejected model response: `Detail 1 has no evidence audit` | Not scored | None can be assessed from this error |
| PT105.S2.Q3 | Scored, `at-the-standard` | 100%, 11/11 details | None |

Question 3 also returned `readGiven: true`, `readMatches: true`, zero credited decoys and zero unjudged details. This supports that one reference response being accepted. It does not establish reliability across all three references or the wider corpus.

The first two failures are output-contract failures, not low student scores. In the deployed parser, this exact error means that the first verdict's `evidence` or `reason` field was absent or was not a string. The census response does not include the raw provider response, so it cannot tell us which field failed or why. Do not infer that the student omitted anything. Keep the evidence requirement in place and inspect the response-format instructions before another explicitly authorized test.

The saved active `model_runs.transcript_text` preflight snapshots were:

| Question | Words | Characters | Transcript SHA-256 |
| --- | --- | --- | --- |
| PT105.S2.Q1 | 289 | 1,632 | `b1b51629d3a41d82c3dcb2d8275a141a73022697048f32276f7838e733e5c1f4` |
| PT105.S2.Q2 | 319 | 1,893 | `3385a93a880b6d6f720a7416d423aafbe9e7aa35a12e2a9c431bc60e69b44832` |
| PT105.S2.Q3 | 266 | 1,533 | `3e8556085b036ca2482eeb8959b6afee2e266e2c5a21cb7cfa07ca396a11adb0` |

The server independently fetched these active model-run transcripts and stripped verbatim stimulus reads before grading. This is a test of saved transcript representations of the owner's designated 10/10 recordings. It does not independently verify transcription accuracy or audio alignment, and no direct listening is claimed. The caller sent authored question keys, not replacement transcripts or fixed target scores.

The gateway backend is verified by this response. The intended unchanged cheap model is Gemini 3.1 Flash-Lite according to the configured source, but the census endpoint does not return upstream model metadata, token usage, cost, or raw provider responses. The number of upstream attempts is not exposed; the judge has a configured server-side fallback if the gateway fails. No additional calls were made to investigate these failures.

Evidence: `build-probe.json`, `manifest.json`, `census-response.json`, and `summary.json` in this folder. UTC folder timestamp corresponds to 2026-10-16 in America/Toronto.
