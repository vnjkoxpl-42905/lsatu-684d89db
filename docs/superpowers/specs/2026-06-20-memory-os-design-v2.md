# Memory OS — Design Spec v2 (revised after Codex audit)

- **Status:** Build spec (supersedes v1 as the implementation target)
- **Date:** 2026-06-20
- **Author:** Joshua (designed with Claude)
- **App:** LSAT U / Aspiring Attorneys (`lsatprep.study`) — React/Vite/Tailwind/shadcn + Supabase
- **History:** `2026-06-20-memory-os-design.md` (v1) + `...-codex-review.md` (audit) remain as the
  design-history trail. This v2 keeps v1's five success criteria (§1 there) and fixes every must-fix
  the audit raised.

---

## 0. Why v2

The v1 design was directionally right but too optimistic about three things the audit caught:
service-role security, automatic student-memory writes, and "one table for everything." v2 keeps the
ambition (a real, self-improving, inspectable memory) and changes the parts that were unsafe or
over-built. The first production slice is **Teacher Operator memory only** — prove trust and
correction before any autonomous learning about students.

**Repo-grounded facts that shape every decision (verified in code):**

- RLS helper is `public.has_role(_user_id uuid, _role public.app_role)` (enum `{admin,user}`),
  `SECURITY DEFINER`. No `is_admin()`. Admin = a row in `user_roles`.
- `student_context` + `student_sessions` are **strictly admin-only** (students have zero access).
  v2 must not create a new student-readable view over this intelligence.
- Corpus: `public.lsatu_content_index (embedding vector(3072))` with RPCs `match_lsatu_content`
  (semantic) + `fts_lsatu_content` (FTS), used **semantic-first, FTS fallback** — not blended.
  **No vector index exists; only a GIN FTS index.**
- `teacher-operator-chat` verifies the caller via JWT → `adminId`, then does **all DB work with the
  service-role key**; tools run through `runTool(name,args,ctx)` returning `{ok,data,error}`; embeds
  via gateway `google/gemini-embedding-001` (3072-dim).
- pg_cron is installed; cron jobs fire edge functions via `net.http_post` + a vault service key,
  applied through the Management API (not migration SQL).
- `/memory` admin route → existing `<ProtectedRoute requireAdmin>` pattern.

**pgvector correction (the audit got this one wrong):** ANN indexes on the `vector` type are capped
at 2000 dims — which is *why* the corpus table has no vector index at 3072. Memories use
**`halfvec(3072)` + an HNSW `halfvec_cosine_ops` partial index** (supported to 4000 dims, ~half the
storage, negligible recall loss). Requires pgvector ≥ 0.7.0 (Supabase has it; verify `extversion`).

---

## 1. How the five must-fixes are resolved

| Audit must-fix | Resolution in v2 |
|---|---|
| **1. Service-role bypass** | Typed `memory_namespaces` table + `can_access_memory_namespace(ns,mode)` SECURITY DEFINER fn. Recall/write happen **only** through SECURITY DEFINER RPCs that re-derive identity from `auth.uid()` and gate **in SQL**. The edge function calls them through a **caller-JWT client** (the existing `userClient` pattern), never the service-role client. Buggy TS cannot read a namespace the DB won't grant. |
| **2. Episodic pollutes durable store** | Split: `memory_items` (durable semantic/procedural, embedded, indexed) vs `memory_events` (append-only, high-volume, `retention_until`, usually no embedding). |
| **3. Student admin-data leakage** | `visibility` enum + `subject_user_id`. Phase 1 is operator-only (no student rows). Student-derived facts later default to `assistant_internal`/`needs_review`, never `student_visible`. Migration from `student_context` is an explicit later phase. |
| **4. Recency-wins is unsafe** | `source_authority` (`teacher_approved > system_observed > student_self_report > model_inferred`) + `claim_key` clusters + `review_state`. Auto-supersede **only** when the new claim's authority ≥ the old; otherwise keep both and flag `conflict`/`needs_review`. |
| **5. Per-memory `was_helpful` over-attributes** | Turn-level `assistant_turn_outcomes` + `memory_context_usage`. Reinforcement is a **slow aggregate** over repeated correlated outcomes, shipped **last** and treated as experimental. |

Plus structural-miss coverage: prompt-injection hardening for procedural memories, memory-poisoning
defense (authority + evidence + review), audit-row PII scrub on forget, rollback via audit
before/after snapshots, dead-letter for reflect jobs, and an eval harness.

---

## 2. Architecture shape

One shared engine, many owners — but **typed namespace records**, not raw strings, and **two
substrates** not one table:

```
memory_namespaces   typed owner records (operator/student/activity/global) — the security spine
memory_items        durable facts + skills (embedded, ranked, inspected)
memory_events       append-only episodic substrate (retention-bounded, digested by Loop 1)
memory_audit        every change, with before/after snapshots (trust + rollback)
assistant_turn_outcomes + memory_context_usage   turn-level outcome ledger (Loop 3 fuel)
```

Access is enforced by SQL RPCs (`memory_recall`, `memory_write`) that call
`can_access_memory_namespace()`. The edge functions never build namespace strings or touch the
memory tables with the service-role key for assistant turns.

---

## 3. Concrete SQL

### 3.1 Enums (matches the repo's `app_role` convention)

```sql
create type public.memory_owner_type       as enum ('operator','student','activity','global');
create type public.memory_kind             as enum ('semantic','procedural');
create type public.memory_status           as enum ('active','archived','superseded','proposed','rejected');
create type public.memory_visibility       as enum ('admin_only','assistant_internal','student_visible','student_correctable','restricted');
create type public.memory_source_authority as enum ('teacher_approved','system_observed','student_self_report','model_inferred');
create type public.memory_review_state     as enum ('clean','conflict','needs_review','approved','rejected');
```

### 3.2 `memory_namespaces` (the security spine)

```sql
create table public.memory_namespaces (
  id          uuid primary key default gen_random_uuid(),
  owner_type  public.memory_owner_type not null,
  owner_id    uuid,                                   -- auth.users(id); null for 'global'
  label       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (owner_type, owner_id)
);
-- NULLs are distinct in a UNIQUE, so guard the single global row explicitly:
create unique index memory_namespaces_global_uidx
  on public.memory_namespaces (owner_type) where owner_id is null;

create function public.can_access_memory_namespace(p_ns uuid, p_mode text)
returns boolean language sql stable security definer set search_path = public as $$
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
```

### 3.3 `memory_items` (durable facts + skills)

```sql
create table public.memory_items (
  id            uuid primary key default gen_random_uuid(),
  namespace_id  uuid not null references public.memory_namespaces(id) on delete cascade,
  kind          public.memory_kind not null,
  title         text not null,
  content       text not null,                        -- the markdown "md file"
  embedding     halfvec(3072),                        -- gemini-embedding-001, HNSW-indexable
  structured    jsonb not null default '{}'::jsonb,   -- skill trigger, typed payload

  tags          text[] not null default '{}',

  -- provenance + evidence (fixes #4/#5; enables poisoning defense)
  source            text,                             -- 'operator'|'tutor'|'activity'|'system'
  source_authority  public.memory_source_authority not null default 'model_inferred',
  source_refs       jsonb not null default '[]'::jsonb, -- [{table,id,quote}] required for extracted facts
  subject_user_id   uuid references auth.users(id) on delete set null,
  created_by        uuid,                             -- auth uid, or null for system
  visibility        public.memory_visibility not null default 'admin_only',

  -- contradiction clustering (fixes #4)
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

create index memory_items_ns_kind_status_idx on public.memory_items (namespace_id, kind, status);
create index memory_items_claimkey_idx        on public.memory_items (namespace_id, claim_key) where claim_key is not null;
create index memory_items_review_idx          on public.memory_items (namespace_id) where needs_review;
create index memory_items_fts_idx             on public.memory_items
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));
-- ANN index lives on halfvec, partial to active embedded rows only (keeps it small):
create index memory_items_vec_idx on public.memory_items
  using hnsw (embedding halfvec_cosine_ops) where status = 'active' and embedding is not null;
```

### 3.4 `memory_events` (append-only episodic substrate)

```sql
create table public.memory_events (
  id              uuid primary key default gen_random_uuid(),
  namespace_id    uuid not null references public.memory_namespaces(id) on delete cascade,
  subject_user_id uuid,
  event_type      text not null,                      -- 'operator_turn'|'session'|'draft_decision'...
  summary         text,
  payload         jsonb not null default '{}'::jsonb,
  source_ref      jsonb,
  digested        boolean not null default false,     -- Loop 1 has consumed it
  retention_until timestamptz,                         -- raw events expire; digested facts persist
  created_at      timestamptz not null default now()
);
create index memory_events_ns_created_idx on public.memory_events (namespace_id, created_at desc);
create index memory_events_undigested_idx on public.memory_events (namespace_id, created_at) where digested = false;
create index memory_events_retention_idx  on public.memory_events (retention_until) where retention_until is not null;
```

### 3.5 `memory_audit` (trust + rollback)

```sql
create table public.memory_audit (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid references public.memory_items(id) on delete set null,
  namespace_id uuid references public.memory_namespaces(id) on delete set null,
  action       text not null,                         -- create|merge|supersede|conflict|edit|decay|forget|propose|approve|reject
  detail       jsonb not null default '{}'::jsonb,    -- before/after snapshots → rollback/versioning
  actor        uuid,                                   -- null = system
  created_at   timestamptz not null default now()
);
create index memory_audit_ns_created_idx on public.memory_audit (namespace_id, created_at desc);
create index memory_audit_mem_idx        on public.memory_audit (memory_id);
```

### 3.6 Turn-level outcome ledger (Loop 3 fuel; data-only until Phase 5)

```sql
create table public.assistant_turn_outcomes (
  turn_id           uuid primary key default gen_random_uuid(),
  namespace_id      uuid references public.memory_namespaces(id) on delete set null,
  assistant_surface text not null,                    -- 'operator'|'tutor'|'activity'|'voice'
  outcome_kind      text,                              -- 'draft_approved'|'draft_edited'|'next_q_correct'...
  outcome_value     jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create table public.memory_context_usage (
  id             uuid primary key default gen_random_uuid(),
  turn_id        uuid not null references public.assistant_turn_outcomes(turn_id) on delete cascade,
  memory_id      uuid not null references public.memory_items(id) on delete cascade,
  rank           int,
  injected_tokens int,
  created_at     timestamptz not null default now()
);
create index memory_context_usage_mem_idx  on public.memory_context_usage (memory_id);
create index memory_context_usage_turn_idx on public.memory_context_usage (turn_id);
```

### 3.7 RLS (admin-first; student policies ship with Phase 4)

```sql
alter table public.memory_namespaces       enable row level security;
alter table public.memory_items            enable row level security;
alter table public.memory_events           enable row level security;
alter table public.memory_audit            enable row level security;
alter table public.assistant_turn_outcomes enable row level security;
alter table public.memory_context_usage    enable row level security;

-- Admin (operator) full access — mirrors the student_context policy style:
create policy "admins all memory_items" on public.memory_items for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- ...same shape for the other five tables...

-- Phase 4 student read policy (NOT shipped in Phase 1) — only student-visible, own namespace:
-- create policy "students read own visible items" on public.memory_items for select to authenticated
--   using (status='active' and visibility in ('student_visible','student_correctable')
--     and exists (select 1 from public.memory_namespaces n where n.id = namespace_id
--                 and n.owner_type='student' and n.owner_id = auth.uid()));
```

### 3.8 RPC `memory_recall` (SQL-gated, RRF fusion — fixes #1 and the ranking critique)

```sql
create function public.memory_recall(
  p_namespace_ids   uuid[],
  p_query           text,
  p_query_embedding halfvec(3072) default null,
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
language plpgsql stable security definer set search_path = public as $$
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
    where m.namespace_id = any(p_namespace_ids) and m.status = 'active' and m.kind = any(p_kinds)
  ),
  vec as (
    select b.id, row_number() over (order by b.embedding <=> p_query_embedding) r
    from base b where p_query_embedding is not null and b.embedding is not null
    order by b.embedding <=> p_query_embedding limit p_candidate_count
  ),
  fts as (
    select b.id, row_number() over (
      order by ts_rank(to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.content,'')),
                       websearch_to_tsquery('english', p_query)) desc) r
    from base b
    where p_query <> '' and to_tsvector('english', coalesce(b.title,'')||' '||coalesce(b.content,''))
                          @@ websearch_to_tsquery('english', p_query)
    limit p_candidate_count
  )
  select b.id, b.namespace_id, b.kind, b.title, b.content, b.tags, b.structured, b.visibility,
         b.source_authority, b.importance, b.confidence, b.use_count, b.success_count,
         b.pinned, b.last_used_at, b.claim_key,
         ( -- reciprocal-rank fusion (k=60) + pin + light signal boosts
           1.0/(60 + coalesce(v.r,9999)) + 1.0/(60 + coalesce(f.r,9999))
           + (case when b.pinned then 1.0 else 0 end)
           + 0.15*b.importance
           + 0.10*(b.success_count::real / greatest(1,b.use_count))
           + 0.10*exp(-extract(epoch from (now()-coalesce(b.last_used_at,b.created_at)))/1209600.0)
         )::real as strength
  from base b
  left join vec v on v.id=b.id
  left join fts f on f.id=b.id
  where b.pinned or v.id is not null or f.id is not null
  order by b.pinned desc, strength desc
  limit p_candidate_count;
end;
$$;
```

Token-budget trimming and the **procedural-trigger gate** (don't inject full skill markdown just
because a vector matched — require the skill's `structured.trigger` to match) happen in the edge
function, which knows token counts. Per-surface budgets (audit #3): operator 1200–2000, tutor
400–800, activity 250–500, voice 150–300.

### 3.9 RPC `memory_write` (authority-aware contradiction handling — fixes #4)

```sql
create function public.memory_write(
  p_namespace_id   uuid,
  p_kind           public.memory_kind,
  p_title          text,
  p_content        text,
  p_embedding      halfvec(3072) default null,
  p_source         text default 'operator',
  p_source_authority public.memory_source_authority default 'model_inferred',
  p_source_refs    jsonb default '[]'::jsonb,
  p_subject_user_id uuid default null,
  p_visibility     public.memory_visibility default 'admin_only',
  p_claim_key      text default null,
  p_confidence     real default 0.6,
  p_importance     real default 0.5,
  p_dup_distance   real default 0.12               -- cosine distance for near-dup
)
returns table (memory_id uuid, outcome text)
language plpgsql volatile security definer set search_path = public as $$
declare v_dup uuid; v_conflict public.memory_items%rowtype; v_new uuid; v_anew int; v_aold int;
begin
  if not public.can_access_memory_namespace(p_namespace_id,'write') then
    raise exception 'write denied for namespace %', p_namespace_id using errcode='42501';
  end if;

  -- 1. near-duplicate (embedding) within namespace+kind → MERGE, do not insert
  if p_embedding is not null then
    select m.id into v_dup from public.memory_items m
    where m.namespace_id=p_namespace_id and m.kind=p_kind and m.status='active'
      and m.embedding is not null and (m.embedding <=> p_embedding) < p_dup_distance
    order by (m.embedding <=> p_embedding) asc limit 1;
  end if;
  if v_dup is not null then
    update public.memory_items set importance=least(1.0,importance+0.05), use_count=use_count+1,
           confidence=greatest(confidence,p_confidence), updated_at=now() where id=v_dup;
    insert into public.memory_audit(memory_id,namespace_id,action,detail,actor)
      values (v_dup,p_namespace_id,'merge',jsonb_build_object('content',p_content,'source',p_source),auth.uid());
    return query select v_dup,'merged'; return;
  end if;

  -- 2. contradiction within a claim cluster → AUTHORITY decides (never blind recency)
  if p_claim_key is not null then
    select * into v_conflict from public.memory_items m
    where m.namespace_id=p_namespace_id and m.claim_key=p_claim_key and m.status='active'
    order by m.created_at desc limit 1;
  end if;

  insert into public.memory_items(namespace_id,kind,title,content,embedding,source,source_authority,
    source_refs,subject_user_id,visibility,claim_key,confidence,importance,status,review_state,created_by)
  values(p_namespace_id,p_kind,p_title,p_content,p_embedding,p_source,p_source_authority,
    p_source_refs,p_subject_user_id,p_visibility,p_claim_key,p_confidence,p_importance,'active','clean',auth.uid())
  returning id into v_new;

  if v_conflict.id is not null then
    v_anew := case p_source_authority when 'teacher_approved' then 4 when 'system_observed' then 3
                 when 'student_self_report' then 2 else 1 end;
    v_aold := case v_conflict.source_authority when 'teacher_approved' then 4 when 'system_observed' then 3
                 when 'student_self_report' then 2 else 1 end;
    if v_anew >= v_aold then                         -- only supersede with >= authority
      update public.memory_items set status='superseded', updated_at=now() where id=v_conflict.id;
      update public.memory_items set supersedes=v_conflict.id where id=v_new;
      insert into public.memory_audit(memory_id,namespace_id,action,detail,actor)
        values(v_new,p_namespace_id,'supersede',jsonb_build_object('superseded',v_conflict.id,
               'before',to_jsonb(v_conflict)),auth.uid());
    else                                             -- lower authority → keep both, flag review
      update public.memory_items set review_state='conflict', needs_review=true
        where id in (v_new, v_conflict.id);
      insert into public.memory_audit(memory_id,namespace_id,action,detail,actor)
        values(v_new,p_namespace_id,'conflict',jsonb_build_object('conflicts_with',v_conflict.id),auth.uid());
    end if;
  end if;

  insert into public.memory_audit(memory_id,namespace_id,action,detail,actor)
    values(v_new,p_namespace_id,'create',jsonb_build_object('source',p_source,'authority',p_source_authority),auth.uid());
  return query select v_new,'created';
end;
$$;
```

**System/background writes** (Loop 1 reflect, no JWT) run as `service_role` where `auth.uid()` is
null — so they use a **separate** `memory_write_system(...)` SECURITY DEFINER fn gated on
`auth.jwt()->>'role' = 'service_role'`, never the user-facing `memory_write`. This preserves the
guarantee that user-path writes always carry a real identity. (Specified concretely in Phase 3.)

---

## 4. Edge-function wiring (Phase 1, operator only)

In `supabase/functions/teacher-operator-chat/index.ts`, **after** the existing JWT→`adminId`
verification:

1. Create a **caller-JWT** Supabase client (reuse the `userClient` pattern already there) and use
   **that** for `supabase.rpc('memory_recall'|'memory_write', …)`. Do **not** use the service-role
   `admin` client for memory tables — that is the whole point of fix #1.
2. **Recall:** embed the user message via the existing gateway embeddings call → `memory_recall`
   with `p_namespace_ids = [operator_ns(adminId), global_ns]`. Trim to the operator token budget,
   gate procedural skills by trigger match, inject as a `memoryNote` system message slotted right
   after `SYSTEM_PROMPT` (the existing `contextNote`/`driveNote` pattern). Log a pending
   `assistant_turn_outcomes` row + `memory_context_usage` rows.
3. **Write:** add two tools to the `TOOLS` array + `runTool` switch:
   - `remember{title,content,kind,claim_key?,source_authority?}` → embed + `memory_write`.
   - `forget{memory_id}` → hard delete + audit `forget` with PII-scrubbed detail.
   Plus explicit "remember that…/forget that…" routes through the same tools. Model-proposed writes
   stay **conservative**: facts only, evidence-tagged, `source_authority='model_inferred'`.
4. **Outcome capture (data only):** when a draft created this turn is later approved/sent/edited,
   write an `assistant_turn_outcomes` row. No importance changes yet (that's Phase 5).

---

## 5. Phased implementation plan (Teacher Operator first)

| Phase | Deliverable | Proves |
|---|---|---|
| **0** | Migration: enums, `memory_namespaces` + `can_access_memory_namespace`, `memory_items`, `memory_events`, `memory_audit`, outcome tables, RLS, indexes (halfvec HNSW partial). Seed `operator:<adminId>` + `global`. | Foundation, security spine |
| **1** | `memory_recall` + `memory_write` RPCs; wire into `teacher-operator-chat` only (recall injection + `remember`/`forget` tools + explicit + conservative model writes); log turn outcomes (data only). | A real, growing, **operator-only** memory |
| **2** | `/memory` admin route (`<ProtectedRoute requireAdmin>`): view/edit/pin/archive/forget, audit feed, **NEEDS REVIEW** + **CONFLICTS** queues, rollback from `memory_audit.detail`. | Trust + correction (success criterion 4) |
| **3** | Loop 1 reflect/consolidate: pg_cron → `memory-reflect` edge fn. Schema-constrained extraction **with required `source_refs` evidence**; digest+expire `memory_events`; decay/promote; `memory_write_system`; **dead-letter** table for failed jobs. | Self-maintaining, sharper-not-bloated |
| **4** | Extend namespaces to student tutor + activity coach. Resolve the **`class_id`↔`auth.users.id` bridge** (`students.user_id`) before any student namespace. Student-facing visibility + RLS + scoped `/memory` view. Explicit coexistence/migration with `student_context` (never auto-expose admin notes). | Multi-owner OS, safely |
| **5** | Loop 2 skill proposals (workflow **fingerprints**: intent+tools+artifact+approval+window+surface, not bare similarity) and Loop 3 cautious aggregate reinforcement from turn outcomes. | Self-improving OS |

Stopping after Phase 2 already yields a real, inspectable operator memory. Student autonomy
(Phase 4+) only after the operator path survives real use.

---

## 6. Decisions changed vs v1

- **D4 reversed:** not one table. `memory_items` + `memory_events`.
- **D6 reversed:** not recency-wins. Authority + claim clusters + review state.
- **D1 refined:** shared engine kept, but typed namespace records, not raw strings.
- **D2 re-sequenced:** Loop 3 ships **last** and is experimental.
- **Embedding:** `halfvec(3072)` + HNSW partial index (the audit's `vector` HNSW is impossible at 3072).
- **Recall:** RRF over vector+FTS candidates + light signal boost, not v1's linear `strength` blob.
- Student memory stays `admin_only`/`assistant_internal` until an explicit Phase-4 product decision.

---

## 7. Safety / structural-miss coverage

- **Prompt injection in procedural memory:** memory content is treated as data, never instructions;
  skills only fire on an explicit `structured.trigger` match; recall output is fenced in the prompt.
- **Memory poisoning:** writes require source + (for extracted facts) `source_refs` evidence;
  low-authority contradictions never silently win; `needs_review` surfaces them.
- **PII on forget:** `forget` hard-deletes the row, embedding, and usage rows, and scrubs the audit
  `detail` (keep the action, drop the content).
- **Eval harness (Phase 1+):** a golden recall set (query → expected memory) run against
  `memory_recall` to catch ranking regressions before they reach the assistants.

---

## 8. Verification (when built)

- Phase 0/1: `supabase db reset` locally; unit-test `can_access_memory_namespace` (admin vs a
  non-admin JWT vs a foreign student namespace — the last must `42501`). Confirm a non-admin JWT
  calling `memory_recall` on `operator:<other>` is denied **at the RPC**, not in TS.
- Confirm `\d memory_items` shows the HNSW index built (no 2000-dim error → halfvec worked).
- Phase 1: in `/teacher`, tell the operator a fact, start a fresh conversation, confirm recall
  injects it; check `memory_audit` shows `create`; check `memory_context_usage` logged the turn.
- Phase 2: manual checklist — edit/pin/forget a memory, force a `claim_key` conflict and confirm it
  lands in the CONFLICTS queue rather than silently superseding.
