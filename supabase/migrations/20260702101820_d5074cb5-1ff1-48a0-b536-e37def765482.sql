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

GRANT SELECT ON public.student_external_metrics TO authenticated;
GRANT ALL ON public.student_external_metrics TO service_role;

create index if not exists student_external_metrics_student_idx
  on public.student_external_metrics (student_id, metric_kind);
create index if not exists student_external_metrics_upload_idx
  on public.student_external_metrics (source_upload_id);

alter table public.student_external_metrics enable row level security;

drop policy if exists student_external_metrics_student_select on public.student_external_metrics;
create policy student_external_metrics_student_select on public.student_external_metrics
  for select to authenticated
  using (student_id = auth.uid());

drop policy if exists student_external_metrics_admin_all on public.student_external_metrics;
create policy student_external_metrics_admin_all on public.student_external_metrics
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));