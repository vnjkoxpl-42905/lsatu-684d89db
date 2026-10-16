# Phase 2 — Lovable migration deploy

Phase 2 (COMPREHENSIVEAUDIT: atomic counters) replaced the read-modify-write counter
increments with single-statement Postgres upsert RPCs, so concurrent drill activity can no
longer drop increments. All the **app-side** work (the migration file + the six call-site
swaps + three vitest specs) is already committed by Claude Code.

The one thing Claude Code could **not** do: apply the migration to the Lovable-managed prod
database (`atrcqxpmqrynmtvvyjju`), which is not reachable from the Supabase MCP. That is this
doc's only job.

## What to do

The migration is committed at:

```
supabase/migrations/20260709120000_phase2_atomic_counters.sql
```

It creates 6 functions (all `SECURITY INVOKER`, so existing RLS still governs every row):

| Function | Table | Effect |
|---|---|---|
| `increment_daily_stats(class_id, date, xp, time_ms, correct)` | `daily_stats` | upsert +1 answered, +correct, +xp, +time on `(class_id,date)` |
| `increment_xp_total(class_id, xp)` | `profiles` | `xp_total = xp_total + xp` |
| `increment_question_seen(class_id, qid, mode)` | `question_usage` | upsert `times_seen + 1` on `(class_id,qid,mode)` |
| `append_waj_wrong(class_id, qid, item, pt, section, qnum, qtype, level)` | `wrong_answer_journal` | upsert-append `history_json` on `(class_id,qid)`, `last_status='wrong'` |
| `append_waj_correct(class_id, qid, item)` | `wrong_answer_journal` | update-only append `history_json`, `last_status='right'` |
| `increment_chapter_view(topic_tag, section_id)` | `chapter_progress` | upsert `view_count + 1`, `user_id = auth.uid()` |

### Prompt to paste into Lovable

```
Apply the committed migration file supabase/migrations/20260709120000_phase2_atomic_counters.sql
to the database. It creates six SECURITY INVOKER functions for atomic counter increments
(increment_daily_stats, increment_xp_total, increment_question_seen, append_waj_wrong,
append_waj_correct, increment_chapter_view) plus their EXECUTE grants to authenticated and anon.

Do not modify the SQL. After applying, regenerate the Supabase TypeScript types so the
generated types include these six functions (Claude Code added matching signatures to
src/integrations/supabase/types.ts manually; your regenerated version should match and can
overwrite them).
```

## After Lovable applies it — live verification (owed, do this with a test student)

The RPCs do not exist in prod until the migration is applied, so the call sites 404 until then.
Once applied, verify in the running app (admin login), preferably against a test student:

1. **daily_stats / xp / streak inputs** — answer a few drill questions; confirm the daily
   stats tile and XP move, and that answering fast back-to-back does not lose a count
   (the whole point of this phase). Watch for no console errors from `increment_daily_stats`.
2. **times_seen** — serve the same question twice; `question_usage.times_seen` should climb by
   exactly 1 each time (no duplicate-row error swallowed).
3. **WAJ wrong then right** — miss a question (row created via `append_waj_wrong`), then get it
   right (`append_waj_correct` appends, `last_status` flips to `right`, `revisit_count` grows).
   Confirm a *correct-only* question with no prior miss creates **no** WAJ row.
4. **Abstract view_count** — open an Abstract lesson section twice; the teacher Bootcamps
   dashboard `view_count` should increment atomically.

## Notes / out of scope (by design)

- **streak_current was intentionally left as JS** (streakSystem.ts). It is not an additive
  counter (day-boundary logic, one write per day guarded by `last_practice_date`), and its RMW
  *converges* rather than losing increments, so it does not need an RPC. Phase 1 already added
  its error throw.
- **`ensureJournalEntry`** (insert-only, already handles the 23505 race) and the duplicate
  view_count RMW in `src/components/teacher/bootcamps/hooks/useChapterProgress.ts` were out of
  the named Phase 2 scope. Fold the latter into `increment_chapter_view` in a follow-up if you
  want full coverage.
- Remaining test debt (audit item 833, sequenced after Phases 1-2): pure-logic specs for
  `streakSystem`, `achievementEngine`, `drillIntelligence`, and a full award-flow spec.
