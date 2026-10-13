create table if not exists rc_drill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null,
  passage_ids int[] not null,
  status text not null default 'in_progress',   -- in_progress | completed | abandoned
  excluded_from_analytics boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create table if not exists rc_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references rc_drill_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id int not null,
  passage_id int not null,
  selected text,                                 -- A-E or null (skipped)
  is_correct boolean,
  time_ms int not null default 0,
  flagged boolean not null default false,
  eliminations text[] not null default '{}',
  is_first_attempt boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists rc_annotations (
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id int not null,
  highlights jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (user_id, passage_id)
);
alter table rc_drill_sessions enable row level security;
alter table rc_attempts enable row level security;
alter table rc_annotations enable row level security;
create policy "own sessions" on rc_drill_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts" on rc_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own annotations" on rc_annotations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists rc_attempts_user_q_idx on rc_attempts (user_id, question_id);
create index if not exists rc_attempts_session_idx on rc_attempts (session_id);
