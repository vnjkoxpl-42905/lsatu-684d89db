---
name: Cloud Data Mirror & Deletion Protection
description: All student localStorage data is mirrored to bootcamp_kv via cloudMirror; student deletes are admin-only by RLS
type: feature
---

# Cloud Data Mirror (src/lib/cloudMirror.ts)

Every piece of student progress that used to live only in localStorage is now mirrored to the `bootcamp_kv` table (`table_name='localstore'`, `record_id`=localStorage key, `data={v: rawString}`).

**Rule: any new student-data localStorage write MUST use `mirroredSetItem`/`mirroredRemoveItem` from `@/lib/cloudMirror`, never raw `localStorage.setItem`.** UI-only prefs (theme, tours, drafts) may stay raw.

- Mirrored keys include: `lsat_flaw_performance`, all `pf:*` principle-flaw keys, `fallacyFlaw:v2:flashcards:reviews`, all `causationCoach*` keys, `drill-notepad:*`, `lsatu_abstract_v3_modules`, `lsatu_abstract_v2_cards`.
- Lifecycle: `initCloudMirror(userId)` / `stopCloudMirror()` are called in AuthContext on auth state change. Hydrate fills ONLY locally-missing keys (fresh-device restore; never clobbers active local state). Removes are tombstones (`{v:null}`), not deletes.
- `cloud-mirror-hydrated` window event fires when keys are restored.

# Deletion protection (2026-08-11 migration)

Students CANNOT delete their own data anywhere it matters:
- `bootcamp_kv`: DELETE is admin-only ("Admins delete bootcamp data"). Student DELETE policy was dropped.
- `wrong_answer_journal_notes`: DELETE is admin-only ("waj_notes_delete_admin").
- Other progress tables (attempts, daily_stats, chapter_progress, rc_lesson_progress, etc.) never had student DELETE policies.
- Kept student deletes only for toggle-style features: flagged_questions (unflag), notifications, journal_pages/views (workspace feature).
- Consequence: `SupabaseSyncedPersistence.remove()` deletes are RLS-denied for students by design — the delete failure handler drops instead of requeueing (do not "fix" this back to retrying).
