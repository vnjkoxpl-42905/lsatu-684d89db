# Corrected grader stopped safely on its first live check

The corrected `grade-conditional-rewrite` function was deployed through Lovable, reported at commit `4734ca012a34d8e1ed186fe8f837052b24c6d403`.

On 2026-10-15, the first approved synthetic test, a faithful paraphrase, returned HTTP 503 with “Your answer has not been checked. Please try again.” No correctness verdict or feedback was returned. The script stopped immediately, without a retry or any of the remaining four requests. Latency was 1,977 ms.

The adjacent JSON preserves the sanitized request and response. This result confirms the failure remains ungraded; it does not confirm the grader's semantic behavior or feedback quality. Deployment logs or other read-only diagnostics are needed before spending the remaining four-call budget. The generic response alone does not identify whether provider output, evidence validation, or another dependency failed.

Read-only Lovable gateway inspection subsequently identified the failure. The provider returned a correct verdict and genuine evidence, but its optional `condition` field said “If it is raining” rather than copying the learner's “Whenever it rains”. The server incorrectly treated that decorative field as necessary to return the grade.

The local correction makes condition/result excerpts optional presentation metadata. If either fails validation, feedback uses the verified learner evidence instead. The verdict, issue, and primary evidence remain required and validated. Case/whitespace normalization maps quotes back to the learner's actual text; invented primary evidence still fails closed. The index now logs only whitelisted failure categories and HTTP status, never responses or learner text. Twelve focused tests include the exact captured gateway diagnosis and pass. Deployment and the remaining four live checks are pending.

The metadata correction was then deployed through Lovable at reported commit `8017af719d4883c59deb2da585bca05b5a6fd242`. Its first faithful-paraphrase check also returned HTTP 503 and no grade, in 1,985 ms. The four-case script stopped after this single request. That second response is preserved separately in `2026-10-15-conditional-rewrite-metadata-fix-live-tests.json`.

Two calls have now been used from the approved five-call round; three remain unused. No semantic or feedback acceptance claim is supported for either corrected deployment. Read-only inspection of the safe error code is required before any further test.

The second gateway diagnosis was semantically correct but omitted the redundant `issue` field for its true verdict. The final local contract requires only a genuine Boolean AI verdict. Issue and quotation fields are optional presentation metadata: missing or invalid quotes use actual submitted text, and missing/unknown issue on an incorrect verdict uses a general hint. No model-authored prose is shown. Invalid or absent Boolean verdicts and malformed JSON remain ungraded. Fourteen focused tests cover both captured failures and these boundaries.
