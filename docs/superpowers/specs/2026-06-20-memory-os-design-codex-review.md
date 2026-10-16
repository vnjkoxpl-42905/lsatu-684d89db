# Codex Review — Memory OS Design Spec

- **Review date:** 2026-06-20
- **Original spec:** `docs/superpowers/specs/2026-06-20-memory-os-design.md`
- **Reviewer:** Codex
- **Purpose:** Repo-grounded critique for Claude Code / future implementation agents.

## Bottom line

The design is directionally right, but it is too optimistic about three things:

1. Service-role security.
2. Automatic student-memory writes.
3. "One table for everything."

The strongest version is not a single `memories` table that stores facts, skills, and episodes equally. It is a durable memory table plus an append-only event/session substrate, with strict namespace records, review gates for student-visible claims, and service-role RPCs that cannot be tricked into cross-student recall.

## Repo grounding

Confirmed from the LSAT U codebase:

- Lovable AI Gateway is used by the named assistant functions. `teacher-operator-chat`, `tutor-chat`, `activity-coach`, `voice-coach-respond`, `ta-chat`, and `analyze-stem-response` call `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`.
- `teacher-operator-chat` also calls `https://ai.gateway.lovable.dev/v1/embeddings`.
- `gemini-embedding-001` at 3072 dimensions is already in use. The content index migration defines `embedding vector(3072)`, and `teacher-operator-chat` embeds with `google/gemini-embedding-001`.
- `pgvector` is installed via `CREATE EXTENSION IF NOT EXISTS vector`.
- The named Edge Functions exist: `teacher-operator-chat`, `tutor-chat`, `activity-coach`, and `voice-coach-respond`.
- Tutor cache/log/corpus infrastructure exists in `20260612140000_tutor_cache_and_log.sql` and `20260612150000_tutor_corpus_review.sql`.
- `pg_cron` is already used by the email infrastructure.

Corrections to the spec:

- The existing corpus search is not a true blended hybrid match. `20260619233835_ab641984-5b68-422c-b6c1-e502046c5665.sql` creates separate `match_lsatu_content` and `fts_lsatu_content` RPCs. `teacher-operator-chat` uses semantic search first, then FTS only as fallback.
- The vector migration does not currently create an HNSW or IVFFlat vector index. It creates an FTS GIN index.
- The claim "cross-student leakage is impossible at the SQL layer" is false if the new Edge Function queries the table with the service-role key and only applies namespace checks in TypeScript.
- Existing `student_context` and `student_sessions` already form an admin-only per-student intelligence layer. The Memory OS must not duplicate or accidentally expose this data to students.

## Must-fix findings

### 1. Service-role safety is handwaved

RLS does not protect the app once an Edge Function uses the service-role key. The memory service needs database-level namespace validation, not just TypeScript checks.

Use a real namespace table instead of raw text namespaces:

```sql
create table public.memory_namespaces (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('operator','student','activity','global')),
  owner_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (owner_type, owner_id)
);

create function public.can_access_memory_namespace(ns uuid, mode text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memory_namespaces n
    where n.id = ns
      and (
        n.owner_type = 'global'
        or (n.owner_type = 'student' and n.owner_id = auth.uid() and mode = 'read')
        or public.has_role(auth.uid(), 'admin')
        or (n.owner_type = 'operator' and n.owner_id = auth.uid())
      )
  );
$$;
```

Expose recall/write through locked SQL RPCs. Do not let a service-role Edge Function construct arbitrary namespace strings and query raw tables.

### 2. Student memory conflicts with existing admin-only context

The repo already has `student_context` and `student_sessions`, and those are explicitly admin-only. The spec would create a new student-readable "what the tutor believes" layer. That is a product/security change, not just memory infrastructure.

Add explicit visibility:

```sql
visibility text not null check (visibility in (
  'admin_only',
  'assistant_internal',
  'student_visible',
  'student_correctable',
  'restricted'
)),
subject_user_id uuid references auth.users(id)
```

Default student-derived assistant facts to `assistant_internal` or `needs_review`, not `student_visible`.

### 3. Split episodic data from durable memory

D4 is wrong as written. Episodes are high-volume, low-signal, retention-sensitive, and usually do not need embeddings. Put durable facts/skills in `memory_items`; put transcript/session events in `memory_events`.

```sql
create table public.memory_items (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.memory_namespaces(id),
  kind text not null check (kind in ('semantic','procedural')),
  title text not null,
  content text not null,
  embedding vector(3072),
  status text not null default 'active',
  confidence real not null default 0.6,
  importance real not null default 0.5,
  claim_key text,
  source_refs jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memory_events (
  id uuid primary key default gen_random_uuid(),
  namespace_id uuid not null references public.memory_namespaces(id),
  subject_user_id uuid,
  event_type text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  retention_until timestamptz,
  created_at timestamptz not null default now()
);
```

### 4. Recency-wins is unsafe

Newer does not mean truer, especially with students. Teacher-approved notes should outrank model-inferred facts. Student self-report should not automatically supersede observed performance data.

Use confidence/source-weighted conflict resolution:

- `source_authority`: `teacher_approved` > `system_observed` > `student_self_report` > `model_inferred`.
- `claim_key`: stable key for contradiction clusters.
- `review_state`: `clean`, `conflict`, `needs_review`, `approved`, `rejected`.
- Supersede automatically only when the new claim has higher authority or human confirmation.

### 5. Outcome attribution is too causal

A good outcome after a response with 10 memories does not mean all 10 helped.

Track turn-level outcomes first:

```sql
create table public.memory_context_usage (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null,
  memory_id uuid not null references public.memory_items(id) on delete cascade,
  rank int,
  injected_tokens int,
  created_at timestamptz not null default now()
);

create table public.assistant_turn_outcomes (
  turn_id uuid primary key,
  assistant_surface text not null,
  outcome_kind text not null,
  outcome_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Use outcome data to update memory importance slowly and only after repeated correlated outcomes or explicit user feedback.

## Answers to the spec's attack questions

### 1. Single table vs split tables

Split day one. Keep semantic/procedural together if desired, but episodes belong in `memory_events`. This avoids vector and FTS pollution, simplifies retention, and reduces deletion/privacy risk.

### 2. Recall ranking

A hand-weighted v0 is fine, but not the formula in the spec. Use two-stage retrieval:

1. Vector top 40.
2. FTS top 40.
3. Pinned.
4. Reciprocal-rank fusion.
5. Business/risk filters.

Missing signals:

- Topic/tag match.
- Subject user.
- Visibility.
- Source authority.
- Created-at recency.
- Expiry.
- Negative feedback.
- Human confirmation.

### 3. Token budget

1500 tokens is acceptable as an operator ceiling, not a global default.

Suggested defaults:

- Teacher Operator: 1200-2000.
- Student Tutor: 400-800.
- Activity Coach: 250-500.
- Voice Coach: 150-300.

Procedural memories need a separate trigger and budget gate. Do not inject full skill markdown just because vector search matched it.

### 4. Contradiction handling

Replace recency-wins with claim clusters and source authority. New claims with lower authority should create a conflict, not supersede.

### 5. Loop 1 extraction quality

Require schema-constrained extraction with source evidence. Do not store model summaries without evidence refs.

Example extraction shape:

```json
{
  "claim": "Maya confuses necessary and sufficient assumptions",
  "claim_key": "student:maya:weakness:necessary-sufficient",
  "evidence_quote": "...",
  "source_ref": { "table": "tutor_interaction_log", "id": "..." },
  "confidence": 0.64,
  "visibility": "assistant_internal"
}
```

Reject memory candidates with no source span, no subject, or generic/trivial content.

### 6. Loop 3 outcome attribution

Per-memory `was_helpful` is not attributable enough. Use turn-level outcomes and aggregate correlation. Only promote a memory strongly when explicit user feedback or repeated outcomes support it.

### 7. Skill proposal threshold

`>= 3` is too naive. Count workflow fingerprints, not semantic similarity alone.

Workflow fingerprint should include:

- Intent.
- Tools used.
- Artifact produced.
- Approval/send/edit outcome.
- Recurrence window.
- Surface.

Example: "weekly recap for student" repeated 3 times in 30 days with at least 2 approved drafts.

### 8. Embedding dimension

3072 is fine for v0 if durable memories stay small and episodes are split out. Add an HNSW or IVFFlat partial index only on active embedded memory rows. Do not introduce two embedding dimensions until scale proves the need.

### 9. Cost and latency

Cache aggressively:

- Short-TTL embedding cache by normalized query.
- Per-conversation recalled context cache.
- FTS-only fallback when embedding fails.
- Skip recall for direct transactional actions.
- Background writes rather than blocking responses.

### 10. Structural misses

The spec misses or underplays:

- Memory poisoning.
- Prompt injection inside procedural memories.
- Service-role namespace bypass.
- Student-visible leakage from admin notes.
- Audit rows retaining deleted PII.
- No eval harness.
- No rollback/versioning for memory edits.
- No migration plan from `student_context`.
- No dead-letter queue for failed reflection jobs.
- No user-facing distinction between "believes," "uses," and "needs review."

## Locked decisions to challenge

- **D1 Shared OS:** keep the engine shared, but use typed namespace records, not raw string namespaces.
- **D2 Full OS:** keep the ambition, but treat outcome reinforcement as experimental and ship it last.
- **D3 Auto-write + manager:** mostly right, but student-sensitive facts should start as `needs_review` or low-confidence internal memories.
- **D4 One unified table:** change it. Use durable `memory_items` plus append-only `memory_events`.
- **D5 Human-in-loop skills:** right. Procedural memories should be admin-only at first.
- **D6 Recency-wins:** change it. Use confidence, source authority, evidence, and review state.
- **D7 `/memory`:** fine, but route protection must differ for admin vs student.
- **D8 1500-token recall:** fine as a tunable operator default, wrong as a global default.

## Simpler better Phase 1

Ship this first:

1. `memory_namespaces`, `memory_items`, `memory_audit`.
2. `memory_recall` RPC with strict namespace validation.
3. Operator-only memory in `teacher-operator-chat`.
4. `/memory` admin UI for view/edit/pin/archive.
5. Manual/explicit "remember this" and conservative model-proposed writes.

Do not wire student tutor memory until the operator path has survived real use. The five success outcomes in the original spec remain reachable, but the first production slice should prove trust and correction before it starts autonomously learning about students.

## Prompt for Claude Code

Use this prompt when asking Claude Code to revise or implement the Memory OS spec:

```text
Read these two files in full before doing anything:

1. docs/superpowers/specs/2026-06-20-memory-os-design.md
2. docs/superpowers/specs/2026-06-20-memory-os-design-codex-review.md

Treat the second file as a critical repo-grounded audit of the first. Do not ignore it. Your job is to revise the Memory OS design so it still achieves the five success criteria in §1 of the original spec, but fixes the audit's must-fix issues:

- Service-role Edge Functions must not rely on TypeScript namespace checks alone. Design SQL/RPC-level namespace validation.
- Do not use one table for durable semantic/procedural memory and high-volume episodic events. Split durable memory from event/session substrate.
- Do not expose existing admin-only student_context/student_sessions data through student-visible memory.
- Replace recency-wins contradiction handling with source-authority, confidence, evidence refs, and review state.
- Replace per-memory was_helpful attribution with turn-level outcome tracking and cautious aggregate reinforcement.
- Make `/memory` route behavior explicit for admin vs student access.
- Correct the infrastructure claims: the existing corpus search is semantic-first with FTS fallback, not a true blended hybrid rank; the corpus migration does not currently create a vector index.

First produce a revised architecture and schema proposal only. Do not edit code yet. Include concrete SQL for the core tables/RPCs and a phased implementation plan that starts with Teacher Operator memory only.
```
