# Grounded-meaning reference test stopped on provider errors

The live function returned build **`2026-10-16-grounded-meaning`**, backend **`lovable-gateway`**. Exactly three reference questions were submitted once: PT105.S2.Q1, Q2 and Q3. All three were ungraded.

| Reference | Result |
| --- | --- |
| PT105.S2.Q1 | `Gemini 400: Request contains an invalid argument. INVALID_ARGUMENT` |
| PT105.S2.Q2 | Same provider error |
| PT105.S2.Q3 | Same provider error |

This is a provider-request failure, not a student score or evidence-classification result. The function's error text comes from the direct Gemini fallback; the preceding gateway failure is not returned, so this receipt cannot identify its cause. The census does not return raw provider request diagnostics, upstream model metadata, token usage or grading cost.

**No synthetic controls were invoked. No automatic retries or historical student regrades were performed.** All three reference tests were attempted; zero returned valid scores. The server has its configured gateway-to-direct fallback, so three question jobs must not be described as exactly three upstream HTTP attempts.

`manifest.json` preserves original question/source hashes and read-only active reference transcript hashes. `reference-transcripts.json` preserves the preflight snapshots. `stripped-transcripts-local.json` reconstructs the revised source-read stripping offline. Evidence audits contain no scored verdicts to validate for this run. The source recordings remain the owner's designated 10/10 standard; this failed request does not evaluate their quality.

Receipts: `build-probe.json`, `census-response.json`, `summary.json`, `manifest.json`, `request-payload.json`. UTC receipt time is 2026-10-17 01:05, corresponding to 2026-10-16 in America/Toronto.
