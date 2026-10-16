# Reading Center

Reading practice hub with a Dashboard, LR Recall and Speed Reading. Spec: ai-os
brainstorms/2026-10-12-reading-center-build-spec.md.

- lib/: pure logic (tokenize, timing, constants, types). No React, no Supabase. Unit tested.
- hooks/: data access (react-query) and the reading clock.
- components/: UI. components/modes/ holds one renderer per reading mode.
- pages/: route components (library, reader, stats, admin).

Word lists (next phase) will link to (passage_id, word_index). Word indexes come from
lib/tokenize.ts and must stay stable for a given passage body.

## Dashboard and activity boundaries

- `/reading-center` opens the account's Dashboard, inside the persistent side rail.
- LR Recall is the existing Read, Recall, Colour section activity. Its collection,
  runner, recordings and grading remain owned by `activity-centre`.
- Speed Reading keeps the general passage collection. It is separate from LR
  sections; there is no RC Recall collection or navigation item yet.
- `hooks/useRecallDashboard.ts` reads assignment summaries and report metadata
  with explicit `student_id` filters even for admins. Query keys include the user.
  All Dashboard inputs are paginated beyond the 1,000-row API cap. Passage labels
  load only ID, slug and title with the account's hidden/title overrides, never
  full passage bodies. Existing reader hooks retain their original behavior.
- `lib/dashboard.ts` derives recent work, separate coverage/WPM trends and totals.
  LR completion counts completed section assignments, not library doors or abandoned
  work. Report attempts are deduplicated by assignment and attempt number.
- Recorded time adds graded LR `total_seconds` and Speed Reading `active_ms` only.
  It excludes pauses and ungraded LR work; it never estimates from start/end dates.
- Dashboard links preserve saved assignment IDs and passage slugs. Partial read
  errors show available work and a retry, rather than inventing zero progress.
