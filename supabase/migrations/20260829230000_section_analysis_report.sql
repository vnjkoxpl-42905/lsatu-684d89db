-- The analysis report, stored with the sitting it is about.
--
-- Written once, at completion, and never regenerated. A report that changes
-- when the rules change stops being a record of what the student was told, and
-- the point of keeping it is being able to open a section from three months ago
-- and see the diagnosis that was actually made at the time.
--
-- It lives on section_history rather than in a table of its own because it has
-- exactly the lifetime of the row it belongs to: one sitting, one report, and a
-- deleted sitting should never leave an orphan diagnosis behind.

alter table public.section_history
  add column if not exists analysis_json jsonb;

comment on column public.section_history.analysis_json is
  'The section analysis report (see docs/section-analysis-engine.md), written once at completion. Null for sittings from before the engine existed, which must render as "no report" rather than as an empty one.';

-- When the report was emailed out, and to whom. Null means never sent, which is
-- different from sent-and-failed: a failed send leaves the error here so it can
-- be seen rather than retried blindly into the same wall.
alter table public.section_history
  add column if not exists report_emailed_at timestamptz,
  add column if not exists report_email_error text;
