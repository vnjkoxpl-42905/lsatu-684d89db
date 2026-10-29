# Recall grader 400: diagnosis and smallest fix

## What the logs show (read-only, nothing changed)

- Function log, 2026-10-17T01:05:04Z, x3: `judge: gateway 400; falling back to direct Gemini`. The direct-Gemini 400 is only the fallback repeating the same rejection.
- AI Gateway requests (all 01:05:04Z, model `google/gemini-3.1-flash-lite`, sdk `gemini-proxy`, chat_completions, about 160 ms, 3104 tokens in / 0 out, cost unknown):
  - `01a14764-1626-7780-a49e-b17ca3421917`
  - `01a14764-1762-753f-aca5-0fa65be30085`
  - `01a14764-1887-7421-9947-195066d5d776`
- Status: `http 400, upstream 400`, error `{"message":"Request contains an invalid argument.","type":"upstream_error"}`. The provider rejected it before generating anything.
- **No invalid field is named** anywhere in the gateway or function logs. The provider message is generic.

## Evidence for the cause (by comparing schemas, not confirmed by the provider)

The sent `response_format` (strict json_schema `rrc_grade`) differs from the previous build's accepted schema (`262312cf`, which graded Q3) only in each of the 26 `verdicts` items:
- `evidence: string` became `evidence_ids: array of {type: integer, enum: [1..21]}, maxItems 21`
- `material: boolean` and `material_reason: string` were added

Integer enums on `id` and `uncertain_details` were already in the accepted schema, so integer enums alone are not the problem. The new part is the nested enum array in every verdict (26 x 21 enum states). That fits your suspicion, but the provider didn't confirm it.

## Proposed fix (one edit, needs your approval)

In `buildJudgeResponseSchema` (`supabase/functions/_shared/rrcGrading.ts` lines 561-565), change `evidence_ids.items` to plain `{ type: "integer" }`. Keep `minItems: 0` and `maxItems: evidenceUnits.length`. Leave `material` and `material_reason` as they are.

This keeps genuine evidence IDs: the parser (lines 686-692) already throws out any ID that isn't a real student unit, plus duplicates and non-arrays, before mapping IDs to verbatim text. The materiality fields and the parser itself stay unchanged.

Fallback, only if the first fix still returns 400: also drop `maxItems` on `evidence_ids`. That would show the cause is overall schema size, not the enum.

## Steps after approval

1. Make only the edit above and update the one schema test that checks this shape. Bump BUILD to `2026-10-16-grounded-meaning-2`; GRADER_VERSION stays 3.
2. Deploy only `grade-rrc-section`. Model, temperature 0, max 8192, fallback and parser all unchanged.
3. No AI or test calls, no other files, no packaging or preview fixes, no publication. Codex reruns the three references.
