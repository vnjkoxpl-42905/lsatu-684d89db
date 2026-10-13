-- availability_requests: only created when Joshua explicitly asks for
-- a student's availability. Students fill the response only after a
-- request is sent. AI TA may use the response to plan a realistic week.

create table if not exists public.availability_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid,
  requested_by uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'requested' check (status in (
    'requested','submitted','expired'
  )),
  response_json jsonb,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists availability_requests_student_idx
  on public.availability_requests (student_id, status, created_at desc);

alter table public.availability_requests enable row level security;

-- Student can see and respond to requests addressed to them.
create policy availability_requests_student_select on public.availability_requests
  for select to authenticated
  using (student_id = auth.uid());

create policy availability_requests_student_update on public.availability_requests
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy availability_requests_admin_all on public.availability_requests
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
