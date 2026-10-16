-- Shadow telemetry for the Activity Centre's judging path.
--
-- Every attempt already records what verdict the student earned. It does not
-- record WHO decided it, or what the world's own structural classifier would
-- have said if it had been trusted. Without those two facts side by side, the
-- question "can diagnose() be promoted to authoritative?" can only be argued,
-- never measured -- and the one time it was argued, tracing it by hand showed
-- it would have graded the authored contrapositive as a reversal.
--
-- These columns are measurement only. Nothing reads them to score, reveal, or
-- decide anything a student sees. They exist so a later decision about judging
-- authority is made against a real disagreement rate.
--
-- All four are nullable with no default: rows written before this migration,
-- and rows written by a client that predates it, are honestly blank rather than
-- backfilled with a guess about how they were judged.

alter table public.activity_item_responses
  add column if not exists judge_source    text,
  add column if not exists shadow_fault    text,
  add column if not exists parser_version  text,
  add column if not exists latency_ms      integer;

comment on column public.activity_item_responses.judge_source is
  'Who decided this verdict: fast-path (local match against an authored credited answer, no model call), coach (the activity-coach edge function), or fallback (a Coach outage, where the credited answer was revealed and no verdict was earned). Null for attempts recorded before this column existed.';

comment on column public.activity_item_responses.shadow_fault is
  'What the world''s structural classifier WOULD have called this answer, as "kind:side" (e.g. reversal:both). Recorded next to the verdict that was actually given, and never used to score or display anything. Null when the classifier reached no conclusion, which is a real answer and not a missing value.';

comment on column public.activity_item_responses.parser_version is
  'The ruleset that produced shadow_fault, so a change to the classifier does not silently pollute the comparison it is being judged by.';

comment on column public.activity_item_responses.latency_ms is
  'Client-measured milliseconds from submit to verdict, so the fast path''s speed claim is a measurement rather than an assertion.';

-- judge_source is the column every telemetry read groups by.
create index if not exists activity_item_responses_judge_source_idx
  on public.activity_item_responses (judge_source)
  where judge_source is not null;
