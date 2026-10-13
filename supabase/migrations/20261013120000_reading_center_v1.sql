-- Reading Center v1: passages, preferences, progress, bookmarks, sessions.
-- Additive only. No existing table is altered.

create table if not exists public.reading_center_passages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  author text,
  body text not null,
  cover_url text,
  word_count int not null default 0,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_center_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wpm int not null default 200 check (wpm between 50 and 5000),
  reading_mode text not null default 'serial'
    check (reading_mode in ('serial','flow','highlight','scroll','ereader')),
  number_of_lines int not null default 1 check (number_of_lines between 1 and 6),
  words_per_line int not null default 1 check (words_per_line between 1 and 6),
  center_text boolean not null default true,
  theme text not null default 'system'
    check (theme in ('light','dark','high_contrast','system')),
  font_family text not null default 'Arial',
  font_size int not null default 36,
  line_spacing numeric(2,1) not null default 1.0 check (line_spacing between 1.0 and 2.0),
  punctuation_pauses boolean not null default true,
  speed_variability boolean not null default false,
  goal_wpm int not null default 600 check (goal_wpm between 50 and 5000),
  updated_at timestamptz not null default now()
);

create table if not exists public.reading_center_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid not null references public.reading_center_passages(id) on delete cascade,
  word_index int not null default 0,
  completed_at timestamptz,
  last_opened_at timestamptz not null default now(),
  hidden_from_recent boolean not null default false,
  primary key (user_id, passage_id)
);

create table if not exists public.reading_center_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid not null references public.reading_center_passages(id) on delete cascade,
  word_index int not null,
  created_at timestamptz not null default now()
);
create index if not exists reading_center_bookmarks_user_passage_idx
  on public.reading_center_bookmarks (user_id, passage_id);

create table if not exists public.reading_center_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_id uuid not null references public.reading_center_passages(id) on delete cascade,
  reading_mode text not null,
  wpm int not null,
  words_read int not null,
  active_ms int not null,
  paused_ms int not null default 0,
  started_at timestamptz not null,
  ended_at timestamptz not null
);
create index if not exists reading_center_sessions_user_started_idx
  on public.reading_center_sessions (user_id, started_at desc);

alter table public.reading_center_passages    enable row level security;
alter table public.reading_center_preferences enable row level security;
alter table public.reading_center_progress    enable row level security;
alter table public.reading_center_bookmarks   enable row level security;
alter table public.reading_center_sessions    enable row level security;

-- Passages: signed-in users read published rows; admins read and write everything.
drop policy if exists "rc passages read published" on public.reading_center_passages;
create policy "rc passages read published" on public.reading_center_passages
  for select to authenticated using (is_published or public.has_role(auth.uid(), 'admin'));
drop policy if exists "rc passages admin insert" on public.reading_center_passages;
create policy "rc passages admin insert" on public.reading_center_passages
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "rc passages admin update" on public.reading_center_passages;
create policy "rc passages admin update" on public.reading_center_passages
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "rc passages admin delete" on public.reading_center_passages;
create policy "rc passages admin delete" on public.reading_center_passages
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Per-user tables: owner full access, admins read.
drop policy if exists "rc prefs own" on public.reading_center_preferences;
create policy "rc prefs own" on public.reading_center_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "rc prefs admin read" on public.reading_center_preferences;
create policy "rc prefs admin read" on public.reading_center_preferences
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "rc progress own" on public.reading_center_progress;
create policy "rc progress own" on public.reading_center_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "rc progress admin read" on public.reading_center_progress;
create policy "rc progress admin read" on public.reading_center_progress
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "rc bookmarks own" on public.reading_center_bookmarks;
create policy "rc bookmarks own" on public.reading_center_bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "rc bookmarks admin read" on public.reading_center_bookmarks;
create policy "rc bookmarks admin read" on public.reading_center_bookmarks
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "rc sessions own" on public.reading_center_sessions;
create policy "rc sessions own" on public.reading_center_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "rc sessions admin read" on public.reading_center_sessions;
create policy "rc sessions admin read" on public.reading_center_sessions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Seed passage 1. Body uses $rc$ quoting so apostrophes need no escaping.
insert into public.reading_center_passages (slug, title, author, body, word_count, sort_order)
values (
  'living-in-a-rational-society',
  'Living in a rational society',
  null,
  $rc$The rationalizing of society can be conceptualized as the pursuit of efficiency, predictability, calculability, and control through technology. But rational systems inevitably spawn a series of irrationalities that result in the compromising and perhaps even the undermining of their rationality. Fast-food restaurants, which epitomize the rational model, proffer the fastest means of getting from a hungry state to a sated one, without surprises, at low cost, in a carnival-like setting suggesting that fun awaits the consumer at each visit. The wholesomeness of the food seems an insignificant consideration. Whereas in the past, working people were prepared to spend up to an hour preparing dinner, they now are impatient if a meal is not on the table within ten minutes. (For their part, some fast-food restaurants have developed chairs that become uncomfortable after about twenty minutes, to ensure that diners do not stay long.) Fast-food restaurants have preferentially recruited adolescent help, at least until recently, because this age group adjusts more easily than adults do to surrendering their autonomy to machines, rules, and procedures. Few skills are required on the job, so workers are asked to use only a minute portion of their abilities. This policy is irrational from the standpoint of the organization, since it could obtain much more from its employees for the money (however negligible) it pays them. These minimal skill demands are also irrational from the perspective of the employees, who are not allowed to think or to respond creatively to the demands of the work. These restrictions lead to high levels of resentment, job dissatisfaction, alienation, absenteeism, and turnover among workers in fast-food franchises. In fact, these businesses have the highest turnover rate of any industry in the U.S. The entire workforce of the fast-food industry turns over three times in a year. Although the simple, repetitive nature of the work makes it easy to replace those who leave, the organization would clearly benefit from keeping employees longer. The costs of hiring and training are magnified when the turnover rate is extraordinarily high.

The application of the rational model to the house-building process in the 1950s and ’60s led to suburban communities consisting of nearly identical structures. Indeed, it was possible to wander into the residence of someone else and not to realize immediately that one was not at home. The more expensive developments were superficially more diversified, but their interior layouts assumed residents who were indistinguishable in their requirements. Furthermore, the planned communities themselves look very similar. Established trees are bulldozed to facilitate construction. In their place, a number of saplings, held up by posts and wire, are planted. Streets are laid out in symmetrical grid patterns. With such uniformity, suburbanites may well enter the wrong subdivision or become lost in their own.

Many of Steven Spielberg’s films are set in such suburbs. Spielberg’s strategy is to lure the viewer into this highly repetitive world and then to have a completely unexpected event occur. For example, the film Poltergeist takes place in a conventional suburban household in which evil spirits ultimately disrupt the sameness. (The spirits first manifest themselves through another key element of the homogeneous society—the television set.) The great success of Spielberg’s films may be traceable to a longing for some unpredictability, even if it is bizarre and menacing, in increasingly routinized lives.$rc$,
  0,
  1
)
on conflict (slug) do nothing;

-- word_count for the seed: count whitespace-separated words.
update public.reading_center_passages
set word_count = array_length(regexp_split_to_array(trim(body), '\s+'), 1)
where slug = 'living-in-a-rational-society';
