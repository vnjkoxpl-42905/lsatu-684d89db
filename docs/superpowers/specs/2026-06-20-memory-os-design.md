# Memory OS — Design Spec

- **Status:** Draft for review (pre-implementation)
- **Date:** 2026-06-20
- **Author:** Joshua (designed with Claude)
- **App:** LSAT U / Aspiring Attorneys (`lsatprep.study`) — React/Vite/Tailwind/shadcn + Supabase
- **Reviewer note (Codex):** This document is written to be reviewed by another AI. It is self-contained: it states the goal, the constraints, the existing infrastructure, every design decision and *why* it was made, and the open questions. Please read the whole thing, then critique it. A dedicated section at the end (**§11 — Where to attack this design**) lists the places I most want you to push on. Do not assume I'm attached to anything here; if a decision is wrong, say so and propose the better version.

---

## 1. The goal (read this first)

I want the AI assistants in my app to have a **real, sophisticated, self-improving memory** — the way Claude (the coding assistant) has memory: it can **save facts**, **save skills as markdown procedures**, recall them later, and **get better over time**. Not a transcript log. A *working memory* that is reconstructed, relevantly, on every turn, and that **grows, prunes itself, learns procedures, and self-corrects** from real outcomes.

### The outcome we want (definition of success)

A user (me as the teacher, or a student) should be able to:

1. Tell an assistant something once, or have it **notice something on its own**, and have it **remembered** without me managing it.
2. Come back days later and have the assistant **act as if it knows me / the student** — preferences, history, weaknesses, decisions already made — without re-explaining.
3. Watch the assistant **stop repeating itself**: repeated workflows become reusable skills (with my approval).
4. **Inspect and correct** everything it believes, at a top-level `/memory` route, so the memory is trustworthy — never a black box, especially for student data.
5. Over weeks, see the memory get **sharper, not bloated** — useless memories fade, useful ones get reinforced.

If those five things are true, the design succeeded. Every decision below should be judged against them.

---

## 2. Scope & decisions already locked

These were decided deliberately during a brainstorming session. They are inputs to the design, not open questions — but if you (Codex) think one is a mistake, flag it explicitly in §11.

| # | Decision | Choice made | Rationale |
|---|----------|-------------|-----------|
| D1 | **Whose memory?** | **Shared OS** — one engine, many owners (me + each student + each activity), via namespaces | Closest to a real "memory OS"; avoids building the same thing 3× |
| D2 | **How self-improving?** | **Full OS** — all three loops (reflect/consolidate, self-written skills, outcome reinforcement), phased | This is the entire point of the project |
| D3 | **Write & control model** | **Auto-write + Memory manager UI** | Memory should feel automatic but be fully inspectable/correctable; critical for student data |
| D4 | **Architecture shape** | **One unified memory service** (single `memories` table, `kind` column, one edge function with recall/write/reflect) — see §4 | Reuses existing proven stack; cognitive structure via `kind` not table sprawl |
| D5 | **Skill creation** | **Human-in-the-loop** — when repetition is detected, it **asks me** before saving a skill; facts stay automatic | Keeps the skill library curated and high-quality |
| D6 | **Contradictions** | **Recency-wins**, with a visible "superseded" trail; **student-memory contradictions also get a review flag** | Memory should update its mind, but bad overwrites of student facts must be catchable |
| D7 | **Memory manager location** | **Top-level route `/memory`** | First-class surface, not buried in a tab |
| D8 | **Working-memory size** | Token-budgeted recall (~1500 tokens, top-K by budget) — default, tunable | Keeps prompts fast/cheap; the single biggest lever against bloat |

---

## 3. Existing infrastructure this builds on (verified in the codebase)

This is **not** a from-scratch build. The hard parts already exist and are proven in production code. The Memory OS is a new *layer* over them.

- **LLM access:** all AI goes through the **Lovable AI Gateway** (`LOVABLE_API_KEY`), which fronts Gemini / GPT / Claude models. Models in use include `gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gpt-5.x` family.
- **Embeddings:** `gemini-embedding-001`, dimension **3072**, already used for the content corpus.
- **Vector store:** **pgvector is installed**. There is already a corpus table with `embedding vector(3072)` and a **hybrid match function** (vector similarity `<=>` + `to_tsvector` full-text) — see migration `20260619233835_*.sql`. The Memory OS recall reuses this exact pattern.
- **Edge functions:** Supabase edge functions are the standard backend unit. Relevant existing ones: `teacher-operator-chat` (the chief-of-staff chat, with tool-calling), `tutor-chat`, `ta-chat`, `activity-coach`, `voice-coach-respond`, `analyze-stem-response`, plus a tutor cache/log/corpus subsystem (`question_tutor_cache`, `tutor_cache_and_log`, `tutor_corpus_review`).
- **Assistants that will consume memory:**
  1. **Teacher Operator** (`teacher-operator-chat`) — my chief-of-staff; already does tool-calling (find_students, create_draft, find_link, etc.).
  2. **Student AI Tutor** (`tutor-chat` / AI TA).
  3. **Activity Coach** (`activity-coach`) — e.g. Negation Station.
  4. **Voice Coach** (`voice-coach-respond`).
- **Outcome signals already collected** (fuel for Loop 3): draft approval/send in the operator flow; per-question correctness and the wrong-answer journal on the student side.
- **RLS** is the established access-control mechanism across the app.

**Implication:** recall, write, and embeddings are all variations on patterns already running. The genuinely new work is the schema, the three maintenance loops, and the `/memory` UI.

---

## 4. Architecture: one unified memory service (D4)

### 4.1 Why this shape (and what was rejected)

- **Chosen — A. One unified memory service.** Single `memories` table, namespaced by owner and typed by `kind` (`semantic`/`procedural`/`episodic`); one `memory` edge function exposing `recall` / `write` / `reflect`. Every assistant calls the same service. *Pro:* reuses the exact existing stack; one thing to secure; cognitive structure lives in a column, not in extra tables. *Con:* one table does a lot (mitigated by namespace+kind indexes).
- **Rejected — B. Separate tables per type** (`facts`, `skills`, `episodes` + orchestrator). Cleaner boundaries but 3× the schema/RLS/migration surface and more places for recall to drift out of sync. Over-built before the core is proven. A single hot `kind` can be split out later — a cheap migration, not a rewrite.
- **Rejected — C. External memory framework** (mem0 / Letta / Zep). New infra + cost, student data leaves Supabase, loses the inspect/control requirement (D3), and ignores the working embedding/RLS stack.

### 4.2 The three memory kinds map to the three loops

| `kind` | What it is | Example | Maintained by |
|--------|-----------|---------|---------------|
| `semantic` | a durable fact | "Maya confuses necessary vs sufficient assumption" | Loop 1 (consolidate) + Loop 3 (reinforce) |
| `procedural` | a self-written skill (markdown how-to) | "Weekly recap: 1. pull session notes 2. draft per student…" | Loop 2 (propose) + Loop 3 |
| `episodic` | something that happened (session event) | "2026-06-19 session with Maya: covered NA, she struggled" | Loop 1 digests then archives |

---

## 5. Data model

### 5.1 `memories` (core table)

```sql
create table public.memories (
  id            uuid primary key default gen_random_uuid(),
  namespace     text not null,        -- 'operator:<uid>' | 'student:<uuid>'
                                       -- | 'activity:<name>' | 'global'
  kind          text not null,        -- 'semantic' | 'procedural' | 'episodic'
  title         text not null,        -- short handle shown in the manager
  content       text not null,        -- the memory itself, markdown ("the md file")
  structured    jsonb,                -- optional typed payload (skill trigger, student_id, ...)
  embedding     vector(3072),         -- gemini-embedding-001, same as corpus

  tags          text[] default '{}',

  -- provenance
  source        text,                 -- 'operator' | 'tutor' | 'activity' | 'system'
  source_ref    jsonb,                -- {conversation_id, message_id}
  created_by    text,                 -- auth uid or 'system'

  -- self-improvement signals
  confidence    real default 0.7,     -- 0..1 how sure we are it's true
  importance    real default 0.5,     -- 0..1 base weight (pinned => treated as 1)
  use_count     int  default 0,       -- times recalled into a response
  success_count int  default 0,       -- times it led to a good outcome
  last_used_at  timestamptz,

  -- lifecycle
  pinned        boolean default false, -- never decays, always recall-eligible
  status        text default 'active', -- 'active'|'archived'|'superseded'|'proposed'
  supersedes    uuid references public.memories(id), -- contradiction trail
  needs_review  boolean default false, -- D6: flagged student contradiction etc.

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index on public.memories (namespace, kind, status);
create index on public.memories using ivfflat (embedding vector_cosine_ops); -- or hnsw, match corpus
create index on public.memories using gin (to_tsvector('english', title || ' ' || content));
```

> `status='proposed'` is used for skill proposals (D5) awaiting my approval.

### 5.2 `memory_usage` (the reinforcement signal)

```sql
create table public.memory_usage (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null references public.memories(id) on delete cascade,
  response_ref jsonb,                  -- which assistant turn used it
  was_helpful  boolean,               -- filled later from outcome (null = unknown)
  created_at   timestamptz default now()
);
create index on public.memory_usage (memory_id);
```

### 5.3 `memory_audit` (the manager's "what changed" feed)

```sql
create table public.memory_audit (
  id         uuid primary key default gen_random_uuid(),
  memory_id  uuid references public.memories(id) on delete set null,
  namespace  text not null,
  action     text not null,           -- 'create'|'merge'|'supersede'|'edit'|'decay'|'forget'|'propose'
  detail     jsonb,
  actor      text,                    -- 'system' | auth uid
  created_at timestamptz default now()
);
```

### 5.4 Derived `strength` (computed at recall, not stored)

```
strength = w1·similarity      -- semantic match to current query
         + w2·importance      -- base/learned weight
         + w3·recency(last_used_at)
         + w4·log(1+use_count)
         + w5·success_rate     -- success_count / max(1,use_count)
```
Weights start hand-tuned; pinned memories bypass scoring and are always included. `strength` is the single ranking number for what loads into context.

---

## 6. Recall pipeline (the "working memory", runs every turn)

```
user message arrives
  1. embed the message (gemini-embedding-001)
  2. hybrid search memories
        WHERE namespace IN (<owner>, 'global') AND status='active'
        (vector similarity  +  full-text)   -- existing corpus pattern
  3. always include pinned memories for the namespace
  4. score candidates by `strength` (§5.4)
  5. take top-K within a TOKEN BUDGET (~1500 tokens default, D8) — not a fixed count
  6. inject grouped by kind into the system prompt:
        ## What you remember
        - [fact] ...
        ## Skills you've learned
        - [skill <name>] <full markdown procedure, only if trigger matches>
  7. log each injected memory_id → memory_usage (was_helpful = null, resolved later)
```

Key rules:
- **Namespace union = owner ∪ `global`.** Enforced in SQL. A student turn can only ever see `student:<their-own-id>` ∪ `global`. Cross-student leakage is impossible at the DB layer (§9).
- **Facts inject as one-liners; matching skills inject their full procedure** (like Claude loading a skill file), but only when the skill's trigger genuinely matches — so skills don't burn budget every turn.
- **Budget, not count.** This is the main defense against a bloated, slow, expensive prompt.

`memory.recall(namespace, query) → ranked memories` is one function; all four assistants call it identically.

---

## 7. Write path (how memories are created)

Three entry points, one write function:

```
1. EXPLICIT       — "remember that…" / "forget that…"  → model calls memory.write / memory.forget
2. MODEL-DECIDED  — model has a `remember` tool, calls it mid-turn when something matters
3. BACKGROUND     — the reflect job extracts memories the model didn't save live (§8, Loop 1)
```

`memory.write(namespace, kind, content, source)` — un-skippable hygiene on every write:

```
1. embed content
2. semantic dup-check within namespace
3. if near-duplicate → MERGE (bump importance + use_count, refresh updated_at); do not insert
4. else if contradicts an active memory:
       insert new; old.status='superseded'; new.supersedes=old.id
       if namespace starts with 'student:' → new.needs_review=true   (D6)
5. else → insert fresh (confidence/importance seeded from source + recency)
6. write memory_audit row
```

- **Dedup/contradiction at write time AND in reflection.** Write-time keeps it continuously clean; reflection does the heavier cross-memory cleanup single writes can't see.
- **Silent but never invisible (D3).** No approval gating on facts, but every create/merge/supersede is audited and surfaces in `/memory`.

---

## 8. The three self-improvement loops (the "OS")

Scheduled via `pg_cron` → a `memory-reflect` edge function. Each loop is independently shippable.

### Loop 1 — Reflect & consolidate (ships first; the core)
```
after a session ends + nightly per active namespace:
  1. read recent episodic memories + transcript
  2. extract durable facts live-writes missed
  3. cluster near-duplicate semantic memories → merge into one stronger memory
  4. resolve lingering contradictions (recency-wins, keep supersedes trail)
  5. decay: active + long-unused + low-importance → archived
  6. promote: frequently-recalled → importance up
  7. digest episodic logs into facts, then archive the raw episodes
→ store stays small, current, sharp instead of growing forever
```

### Loop 2 — Self-written skills (human-in-the-loop, D5)
```
weekly per namespace:
  1. scan episodic logs for repeated workflows
  2. if a workflow repeats >= 3 times with a stable shape:
       create a SKILL PROPOSAL (status='proposed') and ASK the user:
         "You've asked for a weekly recap 3 times. Save this as a reusable skill?
          [Review & save] [Not now]"
  3. only on approval → status='active' procedural memory
  4. thereafter, recall loads its full procedure when a matching request appears
→ it writes its own skills, but I curate them
```

### Loop 3 — Outcome reinforcement (learns from results)
```
continuous, fed by memory_usage + existing outcome signals:
  - operator: did I approve/send the draft that used this memory?
  - tutor:    did the student get the next question right after this fact was used?
  signal → memory_usage.was_helpful
  rollup → success_rate = success_count / max(1,use_count)
  effect:
    high success_rate → importance up (recalled more)
    low  success_rate → importance down; persistently bad → archived / queued for rewrite
→ memories that actually help win; dead weight fades
```

**How they interlock:** Loop 1 keeps it clean, Loop 2 turns repetition into reusable skill, Loop 3 lets real outcomes decide what survives.

---

## 9. Privacy & access (RLS)

```
RLS on `memories`, keyed by namespace:
  operator:<uid>  → only that admin can read/write
  student:<uuid>  → that student (read) + admins (read/write)
  activity:<name> → admins read/write; students never see raw memory
  global          → all authenticated read; admins write

Edge functions (recall/write/reflect) run as service role but receive the caller's
identity and are constrained to allowed namespaces. A student turn can only ever
recall student:<own-id> ∪ global. Cross-student leakage is impossible at the SQL layer.
```

Safeguards:
- **Sensitive-content guard on write:** refuse to store unnecessary PII (passwords, payment data); tag health/accommodation notes as `restricted` so they are never injected into student-visible turns.
- **"Forget" is real:** delete hard-removes the row + embedding + usage rows.

---

## 10. The `/memory` manager UI (D3, D7)

A top-level route. Read/edit window over the same `memories` table — no new data.

```
/memory
  Owner filter:  Me · Students · Activities · Global
  Kind filter:   All · Facts · Skills · Episodes      + search

  ★ PINNED                 — never decays
  ⚠ NEEDS REVIEW           — student contradictions / superseded (D6)
  💡 SKILL PROPOSALS        — Loop 2 asks here (Review & save / Not now)
  RECENT FACTS             — with use-count + success-rate
  AUDIT FEED               — "what I learned recently"

  Each row:  edit content · pin · delete/forget · view provenance · view stats
  Student namespaces: same view, scoped per student → audit what the tutor believes
```

---

## 11. Phasing

| Phase | Deliverable | Value when shipped |
|-------|-------------|--------------------|
| 0 | Schema + RLS: `memories`, `memory_usage`, `memory_audit`, indexes, match fn | foundation |
| 1 | `recall` + `write` functions, wired into Teacher Operator only | working, growing memory for me |
| 2 | `/memory` manager UI (view/edit/pin/forget + audit) | trust + control |
| 3 | Loop 1 (reflect & consolidate) via pg_cron | it maintains itself |
| 4 | Extend namespaces to student tutor + activity coach | multi-owner OS |
| 5 | Loop 2 (skill proposals) + Loop 3 (reinforcement) | full self-improving OS |

Each phase is independently valuable; stopping after Phase 2 already yields a real, inspectable memory.

---

## 12. Where to attack this design (Codex: focus your critique here)

These are the decisions I am **least sure** about. Please pressure-test them and propose concrete better alternatives where you can:

1. **Single table vs split tables (D4).** Is one `memories` table with a `kind` column the right call at this scale, or will `episodic` rows (high volume, short-lived) pollute indexes and slow recall enough that a separate episodic store is worth it from day one?
2. **Recall ranking (`strength`, §5.4).** Is a hand-weighted linear blend good enough, or should ranking be learned / use a reranker model? Are the five signals the right ones? What's missing (e.g. explicit topic/tag match, recency-of-creation vs recency-of-use)?
3. **Token budget ~1500 (D8).** Too small to feel "powerful"? Too big for per-turn latency/cost on Gemini Flash? How should K adapt across the four assistants (operator vs student tutor have very different needs)?
4. **Contradiction handling (D6).** Recency-wins is simple but naive — a newer *wrong* statement can supersede an older correct one. Is the `needs_review` flag enough, or do we need confidence-weighted resolution?
5. **Loop 1 extraction quality.** Background fact-extraction from transcripts is where memory systems accumulate garbage. What guardrails keep it from storing trivia, hallucinated facts, or paraphrase-duplicates that dodge the dup-check?
6. **Loop 3 outcome attribution.** Crediting a *specific memory* for a good outcome is hard (many memories in context, one outcome). Is per-memory `was_helpful` even attributable, or do we need something coarser/causal? Risk of reinforcing the wrong memory.
7. **Skill proposal threshold (≥3, D5).** Right number? How do we detect "the same workflow" robustly enough to count repetitions without false matches?
8. **Embedding dimension 3072.** Reusing the corpus embedding is convenient, but 3072-dim vectors are heavy for a table that may get large. Worth a smaller embedding for memories, or fine?
9. **Cost & latency.** Every turn now does: 1 embedding + 1 hybrid query + bigger prompt. Across all four assistants, is this acceptable, and where would you cache?
10. **Anything structural I've missed** — failure modes, privacy holes, a simpler design that hits the same five success outcomes in §1.

---

## 13. Summary

A single namespaced `memories` table + one `memory` edge function (recall/write/reflect), reusing the app's existing pgvector + `gemini-embedding-001` + edge-function + RLS stack. Memory is written automatically and on request, kept clean at write-time, and maintained by three background loops (consolidate, propose-skills, reinforce-by-outcome). Everything is inspectable and correctable at a top-level `/memory` route. Shipped in six phases, each independently useful. The goal is a working memory that grows, prunes, learns procedures, and self-corrects — judged against the five success outcomes in §1.
