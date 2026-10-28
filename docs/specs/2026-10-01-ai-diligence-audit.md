# AI routing is verified for one Activity; grading quality still needs evaluation

Audit date: 2026-10-01. This document combines a source-level inventory from the navigation and review workers with the parent's explicitly approved live Activity check. It does not certify every AI feature or authorize additional calls, model changes or deployments.

## What the live check establishes

The approved greenhouse-vent / conditional “only if” Activity call appeared in the Lovable AI dashboard with these exact measurements:

| Measure | Observed value |
|---|---|
| Effective model | `google/gemini-3.1-flash-lite` |
| Input / output tokens | 514 / 51 |
| Duration | 910 ms |
| Charge | 0.0008 Lovable credits |
| Owned assignment | `333838aa-cc3b-4789-a707-b8f50f918c25` |
| Saved outcome | Completed, score 100, 1/1 |
| Account completion time | `2026-10-01T04:09:48.597Z` |
| Reload | Completion retained |

The dashboard's last-30-day view showed 80 requests, 0.30 credits and 100% success. That success statistic establishes request success, not correctness, grading consistency or pedagogical quality. The one observed Activity establishes the effective model, measured charge and retained completion for that fixture. It does not establish performance across other Activities, graders, tutoring or long conversations.

## The shared proxy overrides caller model choices

Source: `supabase/functions/gemini-proxy/index.ts` and the callers below. All 13 chat callers pass through a proxy that forces `google/gemini-3.1-flash-lite`. Most callers request Gemini 3.8 Flash; RRC requests 3.1 Lite. Caller overrides do not currently select a different effective model.

| Work | Proxy chat callers |
|---|---|
| Activity and grading | `activity-coach`, `analyze-stem-response`, `grade-rrc-section` |
| Student conversation | `study-chat`, `tutor-chat`, `voice-coach-respond` |
| Teacher and operator conversation | `ta-chat`, `teacher-operator-chat` |
| Structured parsing | `parse-drill-request`, `parse-external-work` |
| Writing and synthesis | `polish-message`, `synthesize-session-bundle`, `motivation-engine` |

Embedding users include `ingest-lsat-knowledge`, `retrieve-lsat-knowledge`, `teacher-link-search` and teacher-operator retrieval. The proxy forces `gemini-embedding-001` with 3,072 dimensions. Embedding compatibility is a separate concern from chat model quality.

Three paths need separate routing review: `ta-agent` calls Lovable directly with an environment-selected model that defaults to Lite; `inspect` prefers direct Google when its key is available and otherwise uses Lovable Lite; RRC has a direct Google fallback after gateway failure. Deepgram Nova 3 speech recognition is another service, separate from chat inference.

The source audit found tutor cached metadata describing Gemini 3.8 although the proxy executes Lite. The operator model selector and synthesis environment selection also do not control the proxy's actual model. These are source findings; the live dashboard verification covered only the Activity call.

## Cost controls are incomplete in the source

No centralized token budget, input/output quota, backend deadline or per-account usage ledger was found across these routes. Activity sets `max_tokens: 220`; this was the only output cap identified in the audited paths. Its UI aborts after 12 seconds, with no matching backend deadline found. A browser timeout therefore does not prove that provider work or charging stopped.

Teacher-operator accepts up to 50 messages with 20,000 characters each and four images. Study chat permits 100 messages without a per-message character bound identified in this audit. Spot Relationship has 48 items, each potentially invoking the coach, without a local fast path. Conditional Rephrase has a local path that was verified separately. Student-controlled `force=true` can bypass the completed RRC grading cache and spend guard. Retries, forced regrades and fallback chains need explicit shared budgets before cost predictability can be claimed.

## Grading authority and malformed responses need stronger boundaries

The reviewed Activity source authenticates the caller but lacks server entitlement and assignment binding. Client rubric and credited-answer fields become system grading authority. Assigned work should load its trusted rubric and expected answers from the owned server record; manual/free practice needs an explicit eligibility policy. The voice coach was also identified as authenticated-only, without quotas or an output cap in this scoped review.

The proxy's internal shared-secret check fails closed in the source. Its `verify_jwt=false` setting is intentional for internal caller authentication; that fact alone does not establish end-to-end entitlement, assignment ownership or grading integrity. Wider tutor/operator authorization and tools were not fully traced in this pass.

The prior Activity response handling could turn an invalid or absent verdict into an invented `incorrect` result. A narrow source fix is prepared: `activity-coach/response.ts` accepts only `correct`, `partial` or `incorrect` with nonblank feedback; malformed results return 502. Known idea coverage is filtered while an explicit empty array remains empty. Content-bearing gateway bodies, raw model output and exception logs were removed in favor of generic failure logging. The independent reviewer personally ran all 17 tests in `src/lib/activityCoachResponse.test.ts` successfully. These changes are not deployed, and no AI call or credit spend was used to test them. They do not resolve the broader entitlement, grading-authority or quota gaps.

## Keep Lite for light work; choose grading models through task evidence

[Lovable's AI documentation](https://docs.lovable.dev/features/ai) recommends Gemini 3.8 Flash for general assistant work and Gemini 3.1 Flash Lite or GPT-5 Nano for simple tasks. Gemini 2.5 Flash Lite is deprecated in Lovable. [Google's standard API pricing](https://ai.google.dev/gemini-api/docs/pricing) lists these USD rates per million tokens:

| Model | Input | Output |
|---|---:|---:|
| Gemini 3.1 Flash Lite | $0.25 | $1.50 |
| Gemini 2.5 Flash Lite | $0.10 | $0.40 |

[OpenAI's GPT-5 Nano model page](https://developers.openai.com/api/docs/models/gpt-5-nano) lists $0.05 input and $0.40 output per million tokens. Lovable lists Nano as supported for lightweight work. Its compatibility, quality and actual credits have not been tested on LSAT U; the current proxy cannot select it without a routing change.

Google's API prices do not establish Lovable's credit charge or platform-specific routing cost. The observed 0.0008-credit Activity charge is the live evidence available here. A cheaper deprecated model is not an appropriate replacement recommendation.

Retain Lite for bounded parsing, concise feedback and other light work while building a representative evaluation set. Benchmark Activity grading, RRC grading and tutoring separately before selecting a stronger model or claiming that any model offers the highest value. Compare correctness, calibration, teaching usefulness, consistency, latency and actual platform credits per successful task.

## Remediation acceptance checklist

- [ ] **Release the prepared malformed-response and privacy-log fix.** Use the approved Lovable Cloud deployment route. Confirm invalid/missing verdict, blank feedback and invalid JSON never produce a correctness judgment or completed grade. Preserve empty coverage arrays. Recheck recipient-visible errors and existing saved results. Source tests currently pass; deployment is pending.
- [ ] **Bind grading to trusted owned work.** Define manual/free eligibility and assigned-work entitlement. Load assignment rubric and expected answers server-side; reject foreign, revoked or mismatched assignment IDs and altered client grading authority. Verify teacher visibility uses the same saved student record.
- [ ] **Bound spending and retries.** Enforce per-task input/image/output limits, backend deadlines, per-account quotas and idempotent grading receipts. Gate forced regrades and cap fallback attempts. Test duplicate clicks, browser abort, network retries, provider failure and account switch without repeated charges or duplicated completion.
- [ ] **Make effective routing visible and deliberate.** Correct cached model metadata; either honor approved model selections or expose the fixed policy clearly. Bring direct-call and Google fallback paths under the same entitlement, limits and usage accounting. Preserve embedding dimensions and index compatibility.
- [ ] **Evaluate grading and tutoring before changing model policy.** Use teacher-adjudicated fixtures covering paraphrases, partial credit, negation/“only if,” ambiguous answers, wrong explanations, prompt injection, long context and malformed output. Predeclare quality/cost acceptance thresholds; retain failure examples and compare alternatives on the same inputs.
- [ ] **Verify representative end-to-end work.** With explicit credit confirmation immediately before any new paid call, verify one owned example per relevant AI feature, saved/reloaded outcomes, access revocation and bounded retry behavior. Keep the current one-Activity proof distinct from that broader acceptance.

Only the single approved Activity call and its retained completion are live verified in this document. Source inventory and passing deterministic tests are evidence for implementation review; they do not substitute for deployment, paid-call authorization or task-quality evaluation.
