# Reading Center

Reading practice hub with a Dashboard, LR Recall, RC Training and Speed Reading. Spec: ai-os
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
  sections.
- RC Training (`rc-recall/`, `/reading-center/rc-recall`, hub members only) runs a
  full four-passage section from the existing RC bank. Students read, silently
  recall each paragraph and check the text, with an optional whole-passage recap.
  It has its own tables (`rc_recall_attempts`,
  `rc_recall_recaps`), private bucket (`rc-recall-recordings`) and IndexedDB
  backup (`rc-recall-backup`); none of it touches LR recording, recovery or
  grading. Attempts are append-only. It saves objective facts only and never
  scores recall. The Dashboard and Reading Progress show its saved attempts,
  completion and time separately from LR grading. Instructions, examples and
  recall practice share one RC Training destination in the activity rail and
  Dashboard. The existing question-practice testing centre remains separate.
  Example and instruction
  videos render only when `VITE_RC_RECALL_MEDIA_BASE` is set (see
  `scripts/rc-recall-media/README.md`).
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
