-- Memory OS — Phase 0 (foundation + security spine)
-- Design: docs/superpowers/specs/2026-06-20-memory-os-design-v2.md
--
-- Ships the durable-memory substrate plus the typed namespace records and the
-- SQL-level access gate that make service-role Edge Functions unable to read
-- across owners. Operator-only is wired in Phase 1; student/activity namespaces
-- exist in the model but no student rows are created until a later phase.
--
-- Embedding note: stored as vector(3072) with NO ANN index, matching the proven
-- lsatu_content_index pattern (pgvector caps ivfflat/hnsw at 2000 dims, so 3072
-- cannot be ANN-indexed as `vector`). Seqscan is correct at operator scale. The
-- documented scale path is halfvec(3072) + HNSW once volume warrants and the
-- pgvector version is confirmed >= 0.7.0.

create extension if not exists vector;

-- ── Enums (mirrors the app_role enum convention) ─────────────────────────────
do $$ begin
  create type public.memory_owner_type as enum ('operator','student','activity','global');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_kind as enum ('semantic','procedural');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_status as enum ('active','archived','superseded','proposed','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_visibility as enum ('admin_only','assistant_internal','student_visible','student_correctable','restricted');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_source_authority as enum ('teacher_approved','system_observed','student_self_report','model_inferred');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.memory_review_state as enum ('clean','conflict','needs_review','approved','rejected');
exception when duplicate_object then null; end $$;

-- ── Namespaces (the security spine) ──────────────────────────────────────────
create table if not exists public.memory_namespaces (
  id          uuid primary key default gen_random_uuid(),
  owner_type  public.memory_owner_type not null,
  owner_id    uuid,                                   -- auth.users(id); null for 'global'
  label       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (owner_type, owner_id)
);
-- NULLs are distinct in a UNIQUE, so guard the single global row explicitly:
create unique index if not exists memory_namespaces_global_uidx
  on public.memory_namespaces (owner_type) where owner_id is null;

-- ── Durable memory items (facts + skills) ────────────────────────────────────
create table if not exists public.memory_items (
  id            uuid primary key default gen_random_uuid(),
  namespace_id  uuid not null references public.memory_namespaces(id) on delete cascade,
  kind          public.memory_kind not null,
  title         text not null,
  content       text not null,                        -- the memory itself, markdown
  embedding     vector(3072),                         -- gemini-embedding-001
  structured    jsonb not null default '{}'::jsonb,   -- skill trigger / typed payload

  tags          text[] not null default '{}',

  -- provenance + evidence
  source            text,                             -- 'operator'|'tutor'|'activity'|'system'
  source_authority  public.memory_source_authority not null default 'model_inferred',
  source_refs       jsonb not null default '[]'::jsonb, -- [{table,id,quote}]
  subject_user_id   uuid references auth.users(id) on delete set null,
  created_by        uuid,                             -- auth uid, or null for system
  visibility        public.memory_visibility not null default 'admin_only',

  -- contradiction clustering
  claim_key     text,
  supersedes    uuid references public.memory_items(id) on delete set null,
  review_state  public.memory_review_state not null default 'clean',
  needs_review  boolean not null default false,

  -- self-improvement signals
  confidence    real not null default 0.6,
  importance    real not null default 0.5,
  use_count     int  not null default 0,
  success_count int  not null default 0,
  last_used_at  timestamptz,
  expires_at    timestamptz,

  pinned        boolean not null default false,
  status        public.memory_status not null default 'active',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists memory_items_ns_kind_status_idx on public.memory_items (namespace_id, kind, status);
create index if not exists memory_items_claimkey_idx        on public.memory_items (namespace_id, claim_key) where claim_key is not null;
create index if not exists memory_items_review_idx          on public.memory_items (namespace_id) where needs_review;
create index if not exists memory_items_fts_idx             on public.memory_items
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

create trigger memory_items_touch
  before update on public.memory_items
  for each row execute function public.update_updated_at_column();

-- ── Episodic / event substrate (append-only, retention-bounded) ──────────────
create table if not exists public.memory_events (
  id              uuid primary key default gen_random_uuid(),
  namespace_id    uuid not null references public.memory_namespaces(id) on delete cascade,
  subject_user_id uuid,
  event_type      text not null,
  summary         text,
  payload         jsonb not null default '{}'::jsonb,
  source_ref      jsonb,
  digested        boolean not null default false,
  retention_until timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists memory_events_ns_created_idx on public.memory_events (namespace_id, created_at desc);
create index if not exists memory_events_undigested_idx on public.memory_events (namespace_id, created_at) where digested = false;
create index if not exists memory_events_retention_idx  on public.memory_events (retention_until) where retention_until is not null;

-- ── Audit (trust + rollback) ─────────────────────────────────────────────────
create table if not exists public.memory_audit (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid references public.memory_items(id) on delete set null,
  namespace_id uuid references public.memory_namespaces(id) on delete set null,
  action       text not null,    -- create|merge|supersede|conflict|edit|decay|forget|propose|approve|reject
  detail       jsonb not null default '{}'::jsonb,
  actor        uuid,             -- null = system
  created_at   timestamptz not null default now()
);
create index if not exists memory_audit_ns_created_idx on public.memory_audit (namespace_id, created_at desc);
create index if not exists memory_audit_mem_idx        on public.memory_audit (memory_id);

-- ── Turn-level outcome ledger (Loop 3 fuel; data-only until later phase) ──────
create table if not exists public.assistant_turn_outcomes (
  turn_id           uuid primary key default gen_random_uuid(),
  namespace_id      uuid references public.memory_namespaces(id) on delete set null,
  assistant_surface text not null,
  outcome_kind      text,
  outcome_value     jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create table if not exists public.memory_context_usage (
  id              uuid primary key default gen_random_uuid(),
  turn_id         uuid not null references public.assistant_turn_outcomes(turn_id) on delete cascade,
  memory_id       uuid not null references public.memory_items(id) on delete cascade,
  rank            int,
  injected_tokens int,
  created_at      timestamptz not null default now()
);
create index if not exists memory_context_usage_mem_idx  on public.memory_context_usage (memory_id);
create index if not exists memory_context_usage_turn_idx on public.memory_context_usage (turn_id);

-- ── Grants (RLS still constrains; service_role bypasses for admin Edge fns) ───
grant select, insert, update, delete on
  public.memory_namespaces, public.memory_items, public.memory_events,
  public.memory_audit, public.assistant_turn_outcomes, public.memory_context_usage
  to authenticated;
grant all on
  public.memory_namespaces, public.memory_items, public.memory_events,
  public.memory_audit, public.assistant_turn_outcomes, public.memory_context_usage
  to service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.memory_namespaces       enable row level security;
alter table public.memory_items            enable row level security;
alter table public.memory_events           enable row level security;
alter table public.memory_audit            enable row level security;
alter table public.assistant_turn_outcomes enable row level security;
alter table public.memory_context_usage    enable row level security;

-- Admin (the operator) has full direct access — mirrors student_context policy style.
create policy "admins all memory_namespaces" on public.memory_namespaces for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins all memory_items" on public.memory_items for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins all memory_events" on public.memory_events for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins all memory_audit" on public.memory_audit for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins all turn_outcomes" on public.assistant_turn_outcomes for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins all context_usage" on public.memory_context_usage for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- NOTE (Phase 4): student-facing read policies are intentionally NOT created here.
-- Student namespaces, student_visible items, and the class_id<->auth.users bridge
-- are a later, explicit phase so admin-only student_context is never exposed.

-- ── Access gate: the single source of truth for who can touch a namespace ─────
create or replace function public.can_access_memory_namespace(p_ns uuid, p_mode text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memory_namespaces n
    where n.id = p_ns and (
         (n.owner_type = 'global'   and (p_mode = 'read' or public.has_role(auth.uid(),'admin')))
      or  public.has_role(auth.uid(),'admin')                              -- admin (operator) sees all
      or (n.owner_type = 'operator' and n.owner_id = auth.uid())
      or (n.owner_type = 'student'  and n.owner_id = auth.uid() and p_mode = 'read')
    )
  );
$$;

-- Get-or-create a namespace the caller is allowed to own.
create or replace function public.memory_ensure_namespace(
  p_owner_type public.memory_owner_type,
  p_owner_id   uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not (
       public.has_role(auth.uid(),'admin')
    or (p_owner_type in ('operator','student') and p_owner_id = auth.uid())
  ) then
    raise exception 'cannot create namespace %/%', p_owner_type, p_owner_id using errcode = '42501';
  end if;

  if p_owner_type = 'global' then
    select id into v_id from public.memory_namespaces where owner_type = 'global' and owner_id is null;
    if v_id is null then
      insert into public.memory_namespaces(owner_type, owner_id, created_by)
      values ('global', null, auth.uid()) returning id into v_id;
    end if;
    return v_id;
  end if;

  select id into v_id from public.memory_namespaces
   where owner_type = p_owner_type and owner_id = p_owner_id;
  if v_id is null then
    insert into public.memory_namespaces(owner_type, owner_id, created_by)
    values (p_owner_type, p_owner_id, auth.uid()) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- ── Recall: SQL-gated reciprocal-rank fusion over vector + FTS ────────────────
create or replace function public.memory_recall(
  p_namespace_ids   uuid[],
  p_query           text,
  p_query_embedding vector(3072) default null,
  p_kinds           public.memory_kind[] default array['semantic','procedural']::public.memory_kind[],
  p_candidate_count int default 40
)
returns table (
  id uuid, namespace_id uuid, kind public.memory_kind, title text, content text,
  tags text[], structured jsonb, visibility public.memory_visibility,
  source_authority public.memory_source_authority, importance real, confidence real,
  use_count int, success_count int, pinned boolean, last_used_at timestamptz,
  claim_key text, strength real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_ns uuid;
begin
  foreach v_ns in array p_namespace_ids loop          -- access gate IN SQL, per namespace
    if not public.can_access_memory_namespace(v_ns, 'read') then
      raise exception 'recall denied for namespace %', v_ns using errcode = '42501';
    end if;
  end loop;

  return query
  with base as (
    select m.* from public.memory_items m
    where m.namespace_id = any(p_namespace_ids)
      and m.status = 'active'
      and m.kind = any(p_kinds)
      and (m.expires_at is null or m.expires_at > now())
  ),
  vec as (
    select b.id, row_number() over (order by b.embedding <=> p_query_embedding) r
    from base b
    where p_query_embedding is not null and b.embedding is not null
    order by b.embedding <=> p_query_embedding
    limit p_candidate_count
  ),
  fts as (
    select b.id, row_number() over (
      order by ts_rank(
        to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.content,'')),
        websearch_to_tsquery('english', p_query)
      ) desc) r
    from base b
    where coalesce(btrim(p_query),'') <> ''
      and to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.content,''))
          @@ websearch_to_tsquery('english', p_query)
    limit p_candidate_count
  )
  select b.id, b.namespace_id, b.kind, b.title, b.content, b.tags, b.structured, b.visibility,
         b.source_authority, b.importance, b.confidence, b.use_count, b.success_count,
         b.pinned, b.last_used_at, b.claim_key,
         ( -- reciprocal-rank fusion (k=60) + pin + light signal boosts
           1.0/(60 + coalesce(v.r, 9999)) + 1.0/(60 + coalesce(f.r, 9999))
           + (case when b.pinned then 1.0 else 0 end)
           + 0.15 * b.importance
           + 0.10 * (b.success_count::real / greatest(1, b.use_count))
           + 0.10 * exp(-extract(epoch from (now() - coalesce(b.last_used_at, b.created_at))) / 1209600.0)
         )::real as strength
  from base b
  left join vec v on v.id = b.id
  left join fts f on f.id = b.id
  where b.pinned or v.id is not null or f.id is not null
  order by b.pinned desc, strength desc
  limit p_candidate_count;
end;
$$;

-- ── Write: dedup + authority-aware contradiction handling ────────────────────
create or replace function public.memory_write(
  p_namespace_id     uuid,
  p_kind             public.memory_kind,
  p_title            text,
  p_content          text,
  p_embedding        vector(3072) default null,
  p_source           text default 'operator',
  p_source_authority public.memory_source_authority default 'model_inferred',
  p_source_refs      jsonb default '[]'::jsonb,
  p_subject_user_id  uuid default null,
  p_visibility       public.memory_visibility default 'admin_only',
  p_claim_key        text default null,
  p_confidence       real default 0.6,
  p_importance       real default 0.5,
  p_dup_distance     real default 0.12               -- cosine distance for near-dup
)
returns table (memory_id uuid, outcome text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_dup uuid;
  v_conflict public.memory_items%rowtype;
  v_new uuid;
  v_anew int;
  v_aold int;
begin
  if not public.can_access_memory_namespace(p_namespace_id, 'write') then
    raise exception 'write denied for namespace %', p_namespace_id using errcode = '42501';
  end if;

  -- 1. near-duplicate by embedding within namespace+kind -> MERGE, do not insert
  if p_embedding is not null then
    select m.id into v_dup from public.memory_items m
    where m.namespace_id = p_namespace_id and m.kind = p_kind and m.status = 'active'
      and m.embedding is not null and (m.embedding <=> p_embedding) < p_dup_distance
    order by (m.embedding <=> p_embedding) asc
    limit 1;
  end if;
  if v_dup is not null then
    update public.memory_items
      set importance = least(1.0, importance + 0.05),
          use_count  = use_count + 1,
          confidence = greatest(confidence, p_confidence),
          updated_at = now()
      where id = v_dup;
    insert into public.memory_audit(memory_id, namespace_id, action, detail, actor)
      values (v_dup, p_namespace_id, 'merge',
              jsonb_build_object('content', p_content, 'source', p_source), auth.uid());
    return query select v_dup, 'merged';
    return;
  end if;

  -- 2. contradiction within a claim cluster -> AUTHORITY decides (never blind recency)
  if p_claim_key is not null then
    select * into v_conflict from public.memory_items m
    where m.namespace_id = p_namespace_id and m.claim_key = p_claim_key and m.status = 'active'
    order by m.created_at desc
    limit 1;
  end if;

  insert into public.memory_items(
    namespace_id, kind, title, content, embedding, source, source_authority, source_refs,
    subject_user_id, visibility, claim_key, confidence, importance, status, review_state, created_by)
  values (
    p_namespace_id, p_kind, p_title, p_content, p_embedding, p_source, p_source_authority, p_source_refs,
    p_subject_user_id, p_visibility, p_claim_key, p_confidence, p_importance, 'active', 'clean', auth.uid())
  returning id into v_new;

  if v_conflict.id is not null then
    v_anew := case p_source_authority
                when 'teacher_approved' then 4 when 'system_observed' then 3
                when 'student_self_report' then 2 else 1 end;
    v_aold := case v_conflict.source_authority
                when 'teacher_approved' then 4 when 'system_observed' then 3
                when 'student_self_report' then 2 else 1 end;
    if v_anew >= v_aold then                          -- only supersede with >= authority
      update public.memory_items set status = 'superseded', updated_at = now() where id = v_conflict.id;
      update public.memory_items set supersedes = v_conflict.id where id = v_new;
      -- lean before-snapshot (no embedding) so the audit stays small + rollback-able
      insert into public.memory_audit(memory_id, namespace_id, action, detail, actor)
        values (v_new, p_namespace_id, 'supersede',
                jsonb_build_object(
                  'superseded', v_conflict.id,
                  'before', jsonb_build_object(
                    'title', v_conflict.title,
                    'content', v_conflict.content,
                    'source_authority', v_conflict.source_authority,
                    'claim_key', v_conflict.claim_key
                  )
                ), auth.uid());
    else                                              -- lower authority -> keep both, flag review
      update public.memory_items set review_state = 'conflict', needs_review = true
        where id in (v_new, v_conflict.id);
      insert into public.memory_audit(memory_id, namespace_id, action, detail, actor)
        values (v_new, p_namespace_id, 'conflict',
                jsonb_build_object('conflicts_with', v_conflict.id), auth.uid());
    end if;
  end if;

  insert into public.memory_audit(memory_id, namespace_id, action, detail, actor)
    values (v_new, p_namespace_id, 'create',
            jsonb_build_object('source', p_source, 'authority', p_source_authority), auth.uid());
  return query select v_new, 'created';
end;
$$;

-- ── Log a turn's recalled context + reinforce recency/use (data-only Loop 3) ──
create or replace function public.memory_log_turn(
  p_namespace_id uuid,
  p_surface      text,
  p_memory_ids   uuid[]
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_turn uuid;
begin
  if not public.can_access_memory_namespace(p_namespace_id, 'read') then
    raise exception 'log denied for namespace %', p_namespace_id using errcode = '42501';
  end if;
  insert into public.assistant_turn_outcomes(namespace_id, assistant_surface)
    values (p_namespace_id, p_surface) returning turn_id into v_turn;
  if p_memory_ids is not null and array_length(p_memory_ids, 1) is not null then
    insert into public.memory_context_usage(turn_id, memory_id, rank)
    select v_turn, t.m, t.ord from unnest(p_memory_ids) with ordinality as t(m, ord);
    update public.memory_items
      set use_count = use_count + 1, last_used_at = now()
      where id = any(p_memory_ids);
  end if;
  return v_turn;
end;
$$;

-- ── Forget: hard-delete the row + usage, scrub the audit detail ──────────────
create or replace function public.memory_forget(p_memory_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare v_ns uuid;
begin
  select namespace_id into v_ns from public.memory_items where id = p_memory_id;
  if v_ns is null then return false; end if;
  if not public.can_access_memory_namespace(v_ns, 'write') then
    raise exception 'forget denied for namespace %', v_ns using errcode = '42501';
  end if;
  -- audit keeps the action, never the content (PII scrub on forget)
  insert into public.memory_audit(memory_id, namespace_id, action, detail, actor)
    values (null, v_ns, 'forget', jsonb_build_object('forgot_memory', p_memory_id), auth.uid());
  delete from public.memory_items where id = p_memory_id;  -- cascades context_usage rows
  return true;
end;
$$;

grant execute on function public.can_access_memory_namespace(uuid, text) to authenticated, service_role;
grant execute on function public.memory_ensure_namespace(public.memory_owner_type, uuid) to authenticated, service_role;
grant execute on function public.memory_recall(uuid[], text, vector, public.memory_kind[], int) to authenticated, service_role;
grant execute on function public.memory_write(uuid, public.memory_kind, text, text, vector, text, public.memory_source_authority, jsonb, uuid, public.memory_visibility, text, real, real, real) to authenticated, service_role;
grant execute on function public.memory_log_turn(uuid, text, uuid[]) to authenticated, service_role;
grant execute on function public.memory_forget(uuid) to authenticated, service_role;

-- Seed the global namespace so Phase 1 recall always has a valid id to union.
insert into public.memory_namespaces (owner_type, owner_id, label)
values ('global', null, 'Global shared memory')
on conflict do nothing;
