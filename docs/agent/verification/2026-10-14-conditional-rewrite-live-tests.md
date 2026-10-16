# Live judgments passed, but feedback needs the local correction

On 2026-10-14, exactly five approved authenticated requests reached the deployed `grade-conditional-rewrite` function. All five returned HTTP 200 and the expected correctness verdict. The adjacent JSON preserves the synthetic inputs, responses, and latency without credentials or student data.

Feedback acceptance failed. Incorrect responses revealed corrected sentences. The omitted-time-restriction response first said the learner's rewrite matched the meaning, then explained why it did not. Other responses used causal terminology and third-person narration.

The subsequent local correction requests a structured issue and a verbatim excerpt of the learner's answer. The server validates the excerpt against the submission and composes hint-only feedback from the issue. Correct rewrites also require verified condition/result excerpts. Unsolicited model feedback is never displayed. Invalid diagnoses remain ungraded.

This correction has not been deployed or tested against the paid provider. Focused tests use the five captured cases to verify output safeguards; they do not prove that the model will choose the right structured diagnosis. Another deployment and live test round require Joshua's approval. The original five-call budget is exhausted.
