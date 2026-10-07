-- Independent self-practice history. Existing assignment snapshots and scores
-- are neither rewritten nor used as mutable storage for repeated sessions.
create table if not exists public.conditional_practice_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  state jsonb not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conditional_snapshot_shape check (
    (jsonb_typeof(snapshot) = 'object'
    and snapshot->>'mode' in ('general', 'linking', 'missing-link', 'must-be-true')
    and jsonb_typeof(snapshot->'questions') = 'array') is true
  ),
  constraint conditional_state_shape check (
    (jsonb_typeof(state) = 'object' and jsonb_typeof(state->'answers') = 'array'
    and state->>'stage' in ('intro', 'paper', 'choices', 'feedback', 'done')
    and jsonb_typeof(state->'position') = 'number') is true
  )
);
create index if not exists conditional_practice_runs_owner_created
  on public.conditional_practice_runs(user_id, created_at desc);
alter table public.conditional_practice_runs enable row level security;
create policy "Read own conditional practice" on public.conditional_practice_runs
  for select to authenticated using (user_id = auth.uid());
create policy "Start own conditional practice" on public.conditional_practice_runs
  for insert to authenticated with check (user_id = auth.uid() and revision = 0);
create policy "Save own conditional practice" on public.conditional_practice_runs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No delete policy: starting another practice never removes an earlier run.
create or replace function public.guard_conditional_practice_run()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.snapshot is distinct from old.snapshot or new.created_at is distinct from old.created_at then
    raise exception 'Practice identity and question snapshot cannot change';
  end if;
  if new.revision <> old.revision + 1 then
    raise exception 'Practice revision must advance by one';
  end if;
  -- Submissions are append-only. Cursor/choice/reveal state may change, but
  -- an original answer cannot disappear when a student retries a question.
  if jsonb_array_length(new.state->'answers') < jsonb_array_length(old.state->'answers')
    or exists (
      select 1 from jsonb_array_elements(old.state->'answers') with ordinality as answer(value, n)
      where answer.value is distinct from (new.state->'answers')->(answer.n::integer - 1)
    ) then raise exception 'Earlier practice answers must be preserved'; end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger guard_conditional_practice_run before update on public.conditional_practice_runs
  for each row execute function public.guard_conditional_practice_run();
grant select, insert, update on public.conditional_practice_runs to authenticated;
