-- student_external_metrics: normalized metrics parsed out of external work
-- uploads (7Sage analytics, PT results, score reports). One row per metric so
-- the data merges cleanly into the student analytics surfaces alongside the
-- on-the-fly stats derived from the attempts table.
--
-- Rows are written only by the parse-external-work edge function (service
-- role) after a confident parse, or by an admin approving a low-confidence
-- upload. Re-running a parse is idempotent: prior rows for a source upload are
-- deleted before the new set is inserted.

create table if not exists public.student_external_metrics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  source_upload_id uuid not null references public.external_work_uploads(id) on delete cascade,
  source_platform text,
  metric_kind text not null check (metric_kind in (
    'overall_accuracy','accuracy_by_type','timing_by_type','pt_score','section_score'
  )),
  question_type text,
  first_accuracy numeric,
  avg_time_ms integer,
  sample_size integer,
  pt_number text,
  scaled_score integer,
  period_label text,
  captured_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_external_metrics_student_idx
  on public.student_external_metrics (student_id, metric_kind);
create index if not exists student_external_metrics_upload_idx
  on public.student_external_metrics (source_upload_id);

alter table public.student_external_metrics enable row level security;

create policy student_external_metrics_student_select on public.student_external_metrics
  for select to authenticated
  using (student_id = auth.uid());

create policy student_external_metrics_admin_all on public.student_external_metrics
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
