create table if not exists public.rc_taxonomy (
  kind        text not null,
  source_id   int  not null,
  name        text not null,
  "group"     text,
  primary key (kind, name)
);

create table if not exists public.rc_passages (
  passage_id     int primary key,
  preptest       int  not null,
  section        int  not null,
  set_number     int  not null,
  title          text,
  topic          text,
  format         text,
  difficulty     int,
  question_count int  not null,
  text                text,
  summary_standard    text,
  summary_brief       text,
  summary_another_way text
);

create table if not exists public.rc_passage_frameworks (
  passage_id int  not null references public.rc_passages(passage_id) on delete cascade,
  framework  text not null,
  primary key (passage_id, framework)
);

create table if not exists public.rc_questions (
  question_id            int primary key,
  passage_id             int  not null references public.rc_passages(passage_id) on delete cascade,
  preptest               int  not null,
  section                int  not null,
  set_number             int  not null,
  position               int  not null,
  question_type          text not null,
  question_type_family   text,
  difficulty             int,
  has_written_explanation boolean not null,
  prompt             text,
  explanation_blocks jsonb,
  correct_answer     text,
  total_responses    int
);

create table if not exists public.rc_question_features (
  question_id   int  not null references public.rc_questions(question_id) on delete cascade,
  feature       text not null,
  feature_group text,
  primary key (question_id, feature)
);

create table if not exists public.rc_question_legacy_tags (
  question_id int  not null references public.rc_questions(question_id) on delete cascade,
  legacy_tag  text not null,
  primary key (question_id, legacy_tag)
);

create table if not exists public.rc_answer_choices (
  question_id          int  not null references public.rc_questions(question_id) on delete cascade,
  letter               text not null,
  text                 text,
  tag                  text,
  catalog_answer_types text,
  percent              int,
  response_count       int,
  correct              boolean,
  explanation          text,
  primary key (question_id, letter)
);

create index if not exists rc_questions_pt_idx      on public.rc_questions (preptest, section, set_number, position);
create index if not exists rc_questions_type_idx    on public.rc_questions (question_type);
create index if not exists rc_passages_topic_idx    on public.rc_passages (topic);
create index if not exists rc_features_feature_idx  on public.rc_question_features (feature);

grant select on public.rc_taxonomy to authenticated;
grant select on public.rc_passages to authenticated;
grant select on public.rc_passage_frameworks to authenticated;
grant select on public.rc_questions to authenticated;
grant select on public.rc_question_features to authenticated;
grant select on public.rc_question_legacy_tags to authenticated;
grant select on public.rc_answer_choices to authenticated;

grant all on public.rc_taxonomy to service_role;
grant all on public.rc_passages to service_role;
grant all on public.rc_passage_frameworks to service_role;
grant all on public.rc_questions to service_role;
grant all on public.rc_question_features to service_role;
grant all on public.rc_question_legacy_tags to service_role;
grant all on public.rc_answer_choices to service_role;

alter table public.rc_taxonomy enable row level security;
alter table public.rc_passages enable row level security;
alter table public.rc_passage_frameworks enable row level security;
alter table public.rc_questions enable row level security;
alter table public.rc_question_features enable row level security;
alter table public.rc_question_legacy_tags enable row level security;
alter table public.rc_answer_choices enable row level security;

create policy "Authenticated can read rc_taxonomy" on public.rc_taxonomy for select to authenticated using (true);
create policy "Authenticated can read rc_passages" on public.rc_passages for select to authenticated using (true);
create policy "Authenticated can read rc_passage_frameworks" on public.rc_passage_frameworks for select to authenticated using (true);
create policy "Authenticated can read rc_questions" on public.rc_questions for select to authenticated using (true);
create policy "Authenticated can read rc_question_features" on public.rc_question_features for select to authenticated using (true);
create policy "Authenticated can read rc_question_legacy_tags" on public.rc_question_legacy_tags for select to authenticated using (true);
create policy "Authenticated can read rc_answer_choices" on public.rc_answer_choices for select to authenticated using (true);