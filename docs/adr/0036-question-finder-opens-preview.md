# Question finder opens a preview without starting a drill

Date: 2026-10-28
Status: accepted for the authorized question-finder release; runtime verification recorded separately.

The rail shortcut previously navigated to Drills, selected an LR address without opening it, and left the learner on Drills after cancellation. Lookup now belongs to Home and Practice. The permanent rail shortcut and the finder's disconnected Build a set footer are removed; existing set builders and legacy routes remain.

An LR result resolves its canonical qid in the existing loaded question bank and opens a read-only viewer. Its address must match. Missing/partial bank content is unavailable rather than fabricated. Answers are hidden until requested; no scored attempt, session or exposure write is implied. Client-side hiding does not make downloaded answer data secret. LR does not acquire new fresh-question tracking in this change.

RC result identity is validated against the generated address index before opening the existing metadata preview. Its explicit Reveal step retains the current exposure record and acknowledgment requirements. Starting a passage drill remains a separate action.

Home checks resolved drill permission before mounting the finder. The shared finder also gates trigger, keyboard and imperative opening, and closes on permission/account change. Practice mounts one finder across its views; a legacy finder=open link is consumed only after opening succeeds. Dismissal and target activation are separate operations. A URL-launched cancellation replaces the temporary hub route with its validated origin; direct Home/Practice dismissal stays in place. Preview Back uses the same safe return path. Existing /classroom/drill redirects and builder URLs are preserved.

This supersedes ADR0008's scored LR launch description. It does not change historical answers, assignments, attempts or completed work.
