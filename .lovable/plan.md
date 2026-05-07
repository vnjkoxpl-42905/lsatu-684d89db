## Patch the 4 unfilled guided drills

Update the bank_filter and metadata for these 4 drills (skip Framework Sampler per your call). All use the "any qtype with the feature tag" approach — `question_types` left empty so the resolver matches purely on feature + reasoning_type + difficulty.

### Mappings

| Slug | Feature tag | Reasoning type | Difficulty | Notes |
|---|---|---|---|---|
| `w7-03-assumes-similarity-mini-set` | `Comparison` (Assumes Similarity) | Comparative Reasoning | 1–3 | Easier intro mini-set |
| `w8-02-assumes-similarity-set-1` | `Comparison` (Assumes Similarity) | Comparative Reasoning | 3–5 | Standard set |
| `w8-03-anti-causal-set-3` | `Anti-Causal` | Causation | 1–3 | Easier set, has prior instructions/note (Process card) |
| `w9-08-anti-causal-hard-mini-set` | `Anti-Causal` | Causation | 4–5 | Hard mini-set |

### What I'll do (one step, no schema change)

1. Inspect the canonical feature-tag strings in the question bank (`Anti-Causal`, `Comparison` / `Assumes Similarity`) so the filter matches what's actually tagged on questions.
2. Run a single `UPDATE` on `guided_drills` for these 4 rows to set:
   - `question_features` (canonical tag)
   - `reasoning_types` (`Causation` or `Comparative Reasoning`)
   - `difficulty_min` / `difficulty_max`
   - `bank_filter` jsonb rebuilt to: `{ qtypes: [], features: [...], reasoning_types: [...], difficulty_min, difficulty_max, count }`
   - leave `question_types` as `{}` (empty) — resolver already treats empty qtypes as "any qtype"
3. Verify by calling `resolveGuidedDrillPool` mentally against the bank: report pool size for each drill so you know none come back empty before assigning.
4. Framework Sampler stays unpublished (`is_published=false`) so it can't be assigned by accident.

### Out of scope

- No UI changes, no new tables, no resolver changes. The existing `resolveGuidedDrillPool` already supports empty qtypes (it skips the qtype filter when the set is empty).
- Other 103 drills untouched.

### Files touched

- Migration/data update via `supabase--insert` (UPDATE statements on `guided_drills`).
- No code files.
