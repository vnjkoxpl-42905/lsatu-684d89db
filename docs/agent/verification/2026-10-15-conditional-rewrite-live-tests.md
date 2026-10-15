# Corrected grader stopped safely on its first live check

The corrected `grade-conditional-rewrite` function was deployed through Lovable, reported at commit `4734ca012a34d8e1ed186fe8f837052b24c6d403`.

On 2026-10-15, the first approved synthetic test, a faithful paraphrase, returned HTTP 503 with “Your answer has not been checked. Please try again.” No correctness verdict or feedback was returned. The script stopped immediately, without a retry or any of the remaining four requests. Latency was 1,977 ms.

The adjacent JSON preserves the sanitized request and response. This result confirms the failure remains ungraded; it does not confirm the grader's semantic behavior or feedback quality. Deployment logs or other read-only diagnostics are needed before spending the remaining four-call budget. The generic response alone does not identify whether provider output, evidence validation, or another dependency failed.

Read-only Lovable gateway inspection subsequently identified the failure. The provider returned a correct verdict and genuine evidence, but its optional `condition` field said “If it is raining” rather than copying the learner's “Whenever it rains”. The server incorrectly treated that decorative field as necessary to return the grade.

The local correction makes condition/result excerpts optional presentation metadata. If either fails validation, feedback uses the verified learner evidence instead. The verdict, issue, and primary evidence remain required and validated. Case/whitespace normalization maps quotes back to the learner's actual text; invented primary evidence still fails closed. The index now logs only whitelisted failure categories and HTTP status, never responses or learner text. Twelve focused tests include the exact captured gateway diagnosis and pass. Deployment and the remaining four live checks are pending.
