# Universal "find me a link to anything" for the Teacher Desk assistant

Goal: from the Teacher Desk chat (`/teacher`), I can ask for **any** surface in LSAT U — a guided drill, an activity, a bootcamp lesson, a specific drill question, a student page, etc. — and the assistant replies with:

1. A short answer naming the thing,
2. A clickable link that opens it **in the chat** (inline button) **and** in a new tab,
3. Optional follow-up actions (assign to student, copy link).

Scope stays on `/teacher` only. No student-facing changes. No content editing.

---

## What gets built in this app

### 1. New edge function: `teacher-link-search`
Input: `{ query: string, limit?: number }`. Output: `{ results: Array<{ kind, id, title, subtitle, url, score, snippet }> }`.

Internally it:
- Embeds the query via Lovable AI Gateway (`google/gemini-embedding-001`).
- Runs `match_lsatu_content(query_embedding, match_count)` against a new `pgvector` table `lsatu_content_index` (see schema below).
- Falls back to FTS on `title || subtitle || body` when pgvector returns nothing.
- Admin-only (checks `has_role(auth.uid(),'admin')`).

### 2. New AI SDK tool wired into `teacher-operator-chat`
Tool name: `find_link`. The model calls it whenever the user asks for, refers to, or would benefit from a deep link. The tool calls `teacher-link-search` and returns the top 1-5 results to the model. The model is instructed to **always** present results as a `LinkCard` part (renders as a pill in the chat with "Open here" and "Open in new tab" buttons), not as raw markdown URLs.

A second tool `open_link` returns a structured part the UI renders as an inline preview iframe inside the chat bubble (for drills/activities only — bootcamps open in new tab to avoid auth issues inside an iframe).

### 3. Chat UI additions (Teacher Desk only)
- New message part type `link_card` rendered in `DeskChatPanel` / `MiniChat`: title, subtitle, kind badge, "Open in chat" (mounts the route in a right-side slide-over panel inside the desk), "Open in new tab" (`window.open(url, "_blank")`), "Assign…" (opens existing assign flow when kind is drill/activity/bootcamp-day).
- Right-side slide-over `DeskLinkPreview` that renders the route inside the desk via React Router's `MemoryRouter` for safe in-chat preview. Falls back to new tab if route requires features the memory router can't satisfy.

### 4. Schema: `lsatu_content_index`
```
id uuid pk
kind text          -- 'guided_drill' | 'activity' | 'bootcamp_day' | 'bootcamp_lesson'
                   -- | 'drill_question' | 'concept' | 'question_type_strategy'
                   -- | 'tactical_pattern' | 'student' | 'teaching_asset' | 'route'
source_id text     -- qid, slug, uuid, route path, etc.
title text
subtitle text
body text          -- chunked text used for embedding
url text           -- canonical in-app URL (see route map below)
metadata jsonb
embedding vector(3072)
updated_at timestamptz
```
Plus `match_lsatu_content(query_embedding, match_count)` SQL function and an HNSW index. RLS: admin-only `SELECT`; service role full access (population runs from the user's external indexer).

Populating the index is **out of scope for this app** — the user is handing the spec below to a separate AI tool that will write rows into `lsatu_content_index` via the service role.

---

## Spec to hand to the external indexer AI

> Paste this verbatim into the other tool. It's everything it needs to build and maintain the index.

### Goal
Populate Supabase table `public.lsatu_content_index` with one row per addressable "thing" in the LSAT U app, so a Teacher Desk assistant can semantic-search it and return deep links. The teacher must be able to ask in plain English ("the drill on negation", "Dakota's last activity", "Causation Station day 3", "PT159 S1 Q5") and get the correct in-app URL back.

### Connection
- Supabase project ref: `atrcqxpmqrynmtvvyjju`
- Write with the **service role** key (server-side only).
- Embeddings: `POST https://ai.gateway.lovable.dev/v1/embeddings`, header `Lovable-API-Key: $LOVABLE_API_KEY`, body `{ "model": "google/gemini-embedding-001", "input": "<chunk>" }`. Output is `data[0].embedding` (length 3072).

### Table contract
Insert/upsert by `(kind, source_id)`. Chunk long `body` into 800-1500 char chunks with ~150 char overlap; one row per chunk; keep `title`/`subtitle`/`url` identical across chunks of the same source; embed `title + "\n" + subtitle + "\n" + chunk`.

### Kinds and where to pull them from

| kind | source | source_id | title / subtitle | url pattern |
|---|---|---|---|---|
| `guided_drill` | `guided_drills` table; markdown in `data/guided-drills/*.md`; HTML in `public/guided-drill-html/` (see `MANIFEST.md`) | `guided_drills.id` | `name` / `week` + `section` | `/drill?guidedDrillId={id}&present=guided` |
| `drill_question` | `attempts`/question catalog; QIDs follow `PT###-S#-Q##` | qid | qid / question type | `/drill?qids={qid}&mode=type-drill&present=smart` |
| `activity` | `activities` table; items in `activities.items` jsonb | `activities.id` | `title` / `subtitle` | `/activity/{id}` (confirm with current `App.tsx`) |
| `bootcamp_day` | `src/bootcamps/*/` content + `src/lib/bootcampDays.ts` | `{slug}/day-{n}` | bootcamp name / day title | `/bootcamp/{slug}/day/{n}` (see `bootcamps.ts`) |
| `bootcamp_lesson` | per-bootcamp lesson modules (e.g. Intro to LR, Causation Station, Principle & Flaw, Fallacy Flaw, Main Conclusion) | `{slug}/{lesson-id}` | lesson title / bootcamp name | `/bootcamp/{slug}/{lesson-id}` |
| `concept` | `concept_library` table | `concept_library.id` | `name` / category | `/concepts/{slug}` if route exists, else omit url |
| `question_type_strategy` | `question_type_strategies` table | row id | type name / "strategy" | `/strategies/{type}` if route exists |
| `tactical_pattern` | `tactical_patterns` table | row id | name / "pattern" | none required; still indexable |
| `teaching_asset` | `teaching_assets` table; use `search_teaching_assets` excerpts | `teaching_assets.id` | `title` / `asset_type` | `/teacher/assets/{id}` if route exists |
| `student` | `students_safe` view | `class_id` | `display_name` / email-hash | `/teacher/student/{class_id}` (confirm exact route) |
| `route` | static map of top-level admin/teacher routes (Foyer, Inbox, Schedule, Analytics, Bootcamps index, Activity Centre, Smart Drill, WAJ, Admin, Settings) | path | route label / short description | the path itself |

For URL patterns you can't confirm from the codebase, leave `url` `NULL` and put the candidate in `metadata.url_guess`; the app side will reconcile.

### Body content to embed (per kind)
- **guided_drill**: name, week, section, learning goals, every question stem + question type tag.
- **drill_question**: stem, answer choices, official answer, explanation if present, question type, reasoning type, tactical patterns.
- **activity**: title, subtitle, instructions, every item prompt, every item answer/feedback.
- **bootcamp_day / lesson**: lesson copy, drill prompts inside the lesson, key vocab, sample questions.
- **concept / strategy / pattern**: full definition + examples.
- **teaching_asset**: `content_text` from the table.
- **student**: display name + any tags/notes from `student_context` (admin-readable). Do NOT embed PII beyond what's already in `students_safe`.
- **route**: human description of what lives at that path.

### Refresh
- Initial backfill: full sweep.
- Ongoing: nightly delta using `updated_at` on each source table, plus a webhook from new `guided_drills` / `activities` inserts.
- Always `upsert` on `(kind, source_id, chunk_index)` and delete chunks whose `updated_at` is older than the source row.

### Quality bar
- For any of these example asks, the top-1 result must be the obviously-correct row:
  - "negation drill" → the Negation Station guided drill
  - "PT159 section 1 question 5" → that drill question
  - "causation station day 3" → that bootcamp day
  - "intro to LR conclusion lesson" → the Main Conclusion lesson
  - "dakota's profile" → Dakota's student page
  - "schedule" → `/teacher/schedule` (or equivalent)

---

## Out of scope
- Building the external indexer (the user is doing this with another tool).
- Student-facing access.
- Editing content from chat.
- Floating site-wide chat launcher.

## Files I'll touch
- `supabase/migrations/<ts>_lsatu_content_index.sql` (table, RLS, GRANTs, HNSW index, `match_lsatu_content` function)
- `supabase/functions/teacher-link-search/index.ts` (new)
- `supabase/functions/teacher-operator-chat/index.ts` (add `find_link` + `open_link` tools, system prompt update, route map constants)
- `src/pages/teacher/desk/DeskChatPanel.tsx`, `MiniChat.tsx`, `AssistantComposer.tsx` (render new `link_card` part, wire actions)
- `src/pages/teacher/desk/DeskLinkPreview.tsx` (new slide-over)
- Small additions to `src/integrations/supabase/types.ts` after the migration regenerates types.
