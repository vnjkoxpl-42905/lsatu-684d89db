# Spot the Relationship: structured answer key and stricter AI grading

## What changes for students
- Every question shows its explanation once resolved, including after a correct first answer.
- Confident, clean answers (right types, right words) still mark instantly with no AI cost.
- Messy answers (swapped labels, missing type, extra invented type, words only, type only) go to the AI grader, which marks each type-and-words pair together.
- First wrong attempt: a hint that does not give the answer away. After resolution: the full answer and explanation.
- Questions, explanations, ordering and earned dials stay exactly as they are.

## Content
- Add an `answer_key` to each of the 48 items in `spot-the-relationship.json`, kept separate from `explanation`:
  - `relationships[]`: `type` (conditional | causal | comparative), `indicators[]` (accepted spans, with separated phrases like "more … than" stored as required parts), `connects` (what the words link), `why` (why that type).
  - `traps[]`: incomplete or tempting wrong answers (e.g. "requires" labelled causal, "deep" as a comparison).
  - `context_benchmark` where a comparison relies on an earlier state or number (items 31, 36, 47, and any others).
- Keys are drafted from the existing credited answers and explanations, then checked item by item; no question text or explanation is rewritten.
- Add the grading rubric (Correct / Partial / Incorrect definitions, equivalent names, capitalisation, quote style, span tolerance, both halves of split comparatives, shared types, contextual comparisons) to the activity's coach instructions.

## Instant grading
- New local pair checker: parses the answer into type/word pairs, normalises type synonyms, case and quotes, and returns `correct` only when every keyed type has a valid indicator with nothing extra or contradictory. Anything uncertain returns "send to AI" rather than guessing wrong.

## AI grading (server side)
- The server already loads the trusted item from the assignment; extend that payload to include the `answer_key` alongside the sentence, explanation, rubric and attempt number. The student answer stays marked as untrusted data.
- Update the coach prompt to judge pairs and to hint without revealing on attempt 1.

## Assignments
- Completed and in-progress assignment snapshots are left untouched.
- Unstarted assignments of this activity get the new content; the library copy is updated too. Read back afterwards to confirm.

## Tests
- All 48 correct answers pass instantly; type-only, words-only, missing type, invented type, swapped and contradictory pairs route correctly; contextual comparisons; first-attempt hint and final explanation display; a captured server-to-model payload (mocked model, no paid calls).

## Technical details
- Files: `content/spot-the-relationship.json`, a new `relationshipKey.ts` checker + tests, `ActivityItemView.tsx` (explanation on correct, routing), `supabase/functions/activity-coach/grading.ts` (prompt + key), a forward-only migration replacing the payload builder in `begin_activity_ai_request_v1` to include `answer_key` (receipts compare canonical payload, so it stays consistent), and a data update for library + unstarted assignments.
- Deploy only `activity-coach`. AI admission stays disabled as it is today unless you say otherwise, so live AI grading will not run until you switch it on.
- No paid model calls during testing.
