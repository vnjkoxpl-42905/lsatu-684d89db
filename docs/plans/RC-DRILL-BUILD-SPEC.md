# RC Drilling — Builder Handoff Spec (v1)

**Read this entire file before writing any code.** It is self-contained: every schema, path,
behavior, and acceptance check you need is in here. Where this spec conflicts with your instincts,
the spec wins. Where the spec is genuinely silent, choose the simplest option consistent with the
Ground Rules, and note the choice in your final report.

**Mission.** Build Reading Comprehension drilling for LSAT U (this repo, `projects/lsatu`): a
passage picker, a LawHub-style two-pane player, an attempt-first review mode, and a results page,
fed by a complete RC dataset that already exists as a zip bundle on disk. No feature in this spec
is optional unless explicitly marked OPTIONAL.

**Build order is the section order.** Do not skip ahead. Each phase ends with acceptance checks;
do not start the next phase until they pass.

---

## 0. Ground rules (non-negotiable)

1. **This repo has its own CLAUDE.md and AGENTS.md. Read them first. Never modify them.**
2. **Git:** the index is not always clean (parallel processes pre-stage files). Stage files BY NAME,
   never `git add -A`. Push only via `bash .claude/safe-push.sh` from the repo root; bare `git push`
   is denied. Commit at every phase boundary at minimum.
3. **Truthfulness:** never fake analytics, mastery, progress, or content. Every number shown to a
   student must trace to real stored data. 548 of the 2,150 questions have NO written explanation —
   for those, render the "Ask the tutor" fallback (pattern already exists, see §2.4), never
   invented prose. Never backfill a missing tag, summary, or explanation.
4. **Student-facing copy:** no em-dashes, no AI-slop vocabulary ("delve", "tapestry", etc.), no
   internal IDs or spec language in the UI (no "Phase", "rc_", "v1" visible to students).
5. **Verification is a real run, not code-reading.** Every acceptance check below is performed by
   actually driving the app in a browser preview, in a VISIBLE tab (background tabs suspend
   requestAnimationFrame and make animations look broken). `npm run dev` from the repo root.
6. **Typecheck before every commit:** `npx tsc --noEmit` must be clean.
7. Existing failing tests `page-six-switchboard` and `Practice` are known-failing and NOT yours to
   fix. `ConclusionTypeLab` is handled; do not investigate.

---

## 1. What already exists (reuse these; paths are exact)

| Piece | Path | What you do with it |
|---|---|---|
| LR drill shell (paper card, pause overlay, docked drawer) | `src/components/drill/official/OfficialDrillFrame.tsx` | Read for patterns. Do NOT extend it; the RC player gets its own shell (§5). |
| Inline per-choice explanation row | `src/components/drill/official/InlineChoiceExplanation.tsx` | REUSE as-is. Already generic: takes `letter`, `isCorrect`, `content`. |
| Explanation tab with style selector | `src/components/drill/official/DrillExplanationTab.tsx` | Read for the Standard/Brief/Another-Way selector pattern and the "Ask the tutor" fallback; replicate in RC review. |
| Highlight engine | `src/lib/highlightUtils.ts`, `src/components/drill/HighlightedText.tsx` | REUSE for passage + choice highlighting. |
| Timers | `src/contexts/TimerContext.tsx`, `src/hooks/useTimer.ts`, `src/lib/questionTimer.ts` | REUSE. Section clock + per-question timer. |
| Blind review flow | `src/components/drill/BlindReview*.tsx` | REUSE in end-of-set mode. |
| Guided-drill assignment pattern | `src/lib/guidedDrills.ts`, `src/pages/GuidedDrillStart.tsx` | Read; §9 mirrors this shape. |
| Bounded-context exemplar | `src/features/activity-centre/` | Copy its structure: `CONTEXT.md`, `api/`, `components/`, `hooks/`, scoped CSS, barrel `index.ts`. |
| LR question bank loader | `src/lib/questionLoader.ts` | Read for shape only. RC gets its own loader (§3). |
| Markdown | `react-markdown` (already a dependency) | Wrap once in `RcMarkdown` (§3.4); do not import react-markdown ad hoc in components. |

**What does NOT exist:** any RC drilling. No `rc_*` content tables, no RC JSON in `public/data/`
(all 159 files there are LR), no passage pane, no two-pane reading layout. You are building the
first one. The only RC things in the repo are the `rc-bootcamp` lesson (`src/bootcamps/rc-bootcamp/`,
unrelated, do not touch) and the `rc_lesson_progress` table (unrelated).

**New bounded context:** everything you build lives in `src/features/rc/`:

```
src/features/rc/
  CONTEXT.md          ← write last (§10); register it in CONTEXT-MAP.md at repo root
  index.ts            ← barrel: export the route components only
  rc.css              ← scoped styles for hub/results/review chrome (LSAT U look)
  player.css          ← scoped styles for the player (LawHub look, §5.1)
  lib/
    rcBank.ts         ← data loader (§3)
    rcTypes.ts        ← all TypeScript types (§3.2)
    rcSession.ts      ← session state machine (§6)
    rcAdaptive.ts     ← auto-selection (§8.3)
  api/
    rcProgress.ts     ← Supabase reads/writes for sessions/attempts/annotations (§4)
  components/         ← §5, §7, §8 components
  hooks/
  pages/
    RcHub.tsx         ← /rc
    RcPlayer.tsx      ← /rc/drill
    RcResults.tsx     ← /rc/results/:sessionId
```

Routes to add in `src/App.tsx` as lazy imports (copy the existing lazy pattern there):
`/rc` → RcHub, `/rc/drill` → RcPlayer, `/rc/results/:sessionId` → RcResults.

---

## 2. The dataset (read this carefully; every column listed is real)

### 2.1 Source bundle

`~/Downloads/lsat-lab-rc.zip` (2.3 MB). First action of Phase A: copy it to
`scripts/rc-source/lsat-lab-rc.zip` inside this repo, extract it there, and add
`scripts/rc-source/` to `.gitignore`. If the zip is missing from Downloads, STOP and ask Joshua.

Contents: `README.md` (authoritative data documentation — read it), `MANIFEST.json` (row counts +
SHA-256 per file; verify counts after every processing step), `schema.sql` (ignore; that was for a
DB import path we are not using), and `data/`:

| File | Rows | Format |
|---|---|---|
| `passages.csv` | 320 | `passage_id,preptest,section,set_number,title,topic,format,difficulty,question_count` |
| `passage_texts.ndjson` | 320 | one JSON/line: `{passage_id, title, text, summary_standard, summary_brief, summary_another_way}` |
| `passage_frameworks.csv` | 383 | `passage_id,framework` (0–3 rows per passage) |
| `questions.csv` | 2150 | `question_id,passage_id,preptest,section,set_number,position,question_type,question_type_family,difficulty,has_written_explanation` |
| `question_explanations.ndjson` | 1602 | one JSON/line: `{question_id, passage_id, prompt, explanation_blocks, correct_answer, total_responses}` — `explanation_blocks` is an array of `{heading, body}` in display order; heading may be null |
| `question_features.csv` | 2493 | `question_id,feature,feature_group` |
| `question_legacy_tags.csv` | 1511 | `question_id,legacy_tag` |
| `answer_choices.csv` | 8010 | `question_id,letter,text,tag,catalog_answer_types,percent,response_count,correct,explanation` |
| `taxonomy.csv` | 50 | `kind,source_id,name,group` — kinds: `passage_topic`, `passage_format`, `framework`, `question_type`, `question_feature` |

CSVs: UTF-8, header row, standard `"` quoting, booleans `t`/`f`, empty = null. Multi-line text
inside quoted CSV fields is common (explanations contain markdown paragraphs) — use a real CSV
parser (the repo has none; add `csv-parse` as a devDependency, it is only used at build time).

### 2.2 Facts about the data you must honor

- **All text fields are markdown**, not HTML. Passages use `\n\n` between paragraphs. Comparative
  passages carry an italic intro line and `**Passage A**` / `**Passage B**` bold headers inside
  `text`. Explanations use bold/italics. Always render through `RcMarkdown` (§3.4).
- **`question_id` is globally unique and stable** — use it as the join key and the qid everywhere.
- **Every question that HAS a written explanation has exactly 5 choices and exactly 1 correct.**
  Questions with `has_written_explanation = f` (548 of them) still have full choice text, tags may
  be missing, and `correct_answer` comes from `question_explanations.ndjson` ONLY for explained
  questions. **For unexplained questions the correct answer is in `answer_choices.csv`'s `correct`
  column** — verify during conversion that every one of the 2,150 questions has exactly one
  `correct = t` choice; if any lacks one, exclude that question from the bank and list it in the
  conversion report.
- **A dual tag is one string joined with `" / "`** (e.g. `Too Strong / Opposite`). Render as two
  chips by splitting on `" / "` exactly.
- **`percent` is rounded** and will not sum to 100 across A–E. Show it as "N% of students" per
  choice; never compute totals from it.
- **Known authored gaps (real, keep them):** 4 passages have null `format`; 39 passages have no
  framework rows; 898 questions have no feature rows; PT159 is tags-only (2/54 explained); PT156
  section 3 is 0/27 explained. A choice's `tag` may be empty even on a correct answer. Where a
  summary style (`summary_brief` / `summary_another_way`) is null, do not show that style option.
- Passage `difficulty` and question `difficulty` are 1–5 and independent. `set_number` is the
  passage's position in its section (1–4). `position` is the question's number within the passage's
  question block (1-based).

### 2.3 Taxonomy (closed vocabularies — build filters from these, never from scanning data)

- **Topics (4):** Humanities, Society, Law, Science.
- **Formats (2):** `Standard (Non-Comparative)`, `Comparative`.
- **Frameworks (7):** Old / New · Problem / Solution · Theme / Example · Challenge Position ·
  Highlight Noteworthy · Present Debate · Answer a Question.
- **Question types (21)**, each with family `Big Picture` / `Implied` / `Stated` /
  `Beyond Passage` / `Author's Intent` — read the exact list from `taxonomy.csv` rows where
  `kind = question_type` (`group` = family).
- **Features (16)** in groups Anticipation / Format / Comparative Passages — from `taxonomy.csv`
  where `kind = question_feature`.
- Legacy tags are reference data. Do not build UI on them in v1.

### 2.4 Explanation content model (what review renders, §7)

Per explained question, `explanation_blocks` is ordered `{heading, body}` — typical headings are
`Anticipate` (question-type strategy, sometimes `Support Window` guidance pointing where to look in
the passage) and `Goal` (the specific prephrase). Render blocks in order with their headings;
null heading = body-only block. Per choice: `tag` (chip) + `explanation` (prose) +
`percent`/`response_count`. Per passage: `summary_standard` (usually the only one),
`summary_brief`, `summary_another_way`.

Unexplained question fallback: show correct/incorrect + the line "No written walkthrough for this
one yet. Ask the tutor and we'll work it together." wired to the existing tutor-chat entry point
(see how `DrillExplanationTab.tsx` wires `onAskTutor`; copy that wiring).

---

## 3. Phase A — data pipeline (content as static JSON, like LR)

The app already serves its entire LR bank as static JSON in `public/data/` loaded client-side.
RC follows the same pattern. **No database is involved in serving content.**

### 3.1 Conversion script

Write `scripts/build-rc-bank.mjs` (Node, ESM, run with `node scripts/build-rc-bank.mjs`). It
reads `scripts/rc-source/data/*` and writes **one JSON file per PrepTest**:
`public/data/rc/RC-PT<n>.json` (59 files, PT101–PT159), plus one index file
`public/data/rc/rc-index.json`.

Per-PT file shape (this is the contract for `rcTypes.ts`; field names exactly as shown):

```json
{
  "preptest": 101,
  "passages": [
    {
      "passageId": 1188,
      "preptest": 101, "section": 1, "setNumber": 1,
      "title": "Risk Communication",
      "topic": "Science",
      "format": "Standard (Non-Comparative)",
      "frameworks": ["Problem / Solution"],
      "difficulty": 1,
      "text": "…markdown…",
      "summaries": { "standard": "…", "brief": null, "anotherWay": null },
      "questions": [
        {
          "questionId": 7660,
          "position": 1,
          "questionType": "Main Point",
          "questionTypeFamily": "Big Picture",
          "difficulty": 1,
          "prompt": "Which one of the following best expresses the main point of the passage?",
          "correctAnswer": "B",
          "hasWrittenExplanation": true,
          "explanationBlocks": [{ "heading": "Anticipate", "body": "…" }],
          "totalResponses": 4263,
          "features": [{ "name": "Defined Target", "group": "Anticipation" }],
          "choices": [
            { "letter": "A", "text": "…", "tag": "Opposite", "percent": 1,
              "responseCount": 49, "correct": false, "explanation": "…" }
          ]
        }
      ]
    }
  ]
}
```

Rules: passages sorted by (section, setNumber); questions by position; choices A–E always present
in order. Null stays null (never empty-string a missing summary/tag/explanation). For unexplained
questions set `prompt` from… note: `prompt` lives only in the explanations NDJSON, so **unexplained
questions have no stored prompt text**. For those, set `"prompt": null` and render the standard
placeholder prompt line in the player: the question UI shows choices below a line reading
"Question <position>". Do NOT invent prompt text. (This is a real dataset limitation; flag the
count of null-prompt questions in the conversion report.)

`rc-index.json`: `{ "preptests": [ { "preptest": 101, "passageCount": 8, "questionCount": 54,
"passages": [ { "passageId", "section", "setNumber", "title", "topic", "format", "frameworks",
"difficulty", "questionCount", "explainedCount", "firstWords" } ] } ] }` — `firstWords` = first 8
words of `text` + "…". The hub/picker loads ONLY this index; per-PT files load on demand.

### 3.2 Validation (the script must fail loudly, not warn)

After writing, the script re-reads its own output and asserts: 320 passages; 2,150 questions;
8,010 choices; 1,602 questions with `explanationBlocks`; every question has exactly 5 choices and
exactly 1 `correct: true`; every `topic`/`format`/`framework`/`questionType`/`feature` value
appears in `taxonomy.csv`; every passage has non-null `text`. Print a summary table and write it
to `scripts/rc-source/conversion-report.txt`. Commit the generated JSON (it is content the app
ships, same as the LR files) but NOT `scripts/rc-source/`.

### 3.3 Loader

`src/features/rc/lib/rcBank.ts`: loads `rc-index.json` eagerly (once, cached module-level),
per-PT files lazily via `fetch('/data/rc/RC-PT' + n + '.json')`, with an in-memory cache
`Map<number, RcPreptestFile>`. Export: `loadRcIndex()`, `loadPreptest(n)`,
`loadPassage(passageId)` (uses the index to find the PT, then loads it), and the taxonomy
constants `RC_TOPICS`, `RC_FORMATS`, `RC_FRAMEWORKS`, `RC_QUESTION_TYPES` (with families),
`RC_FEATURES` (with groups) — hardcode these arrays in `rcTypes.ts` from taxonomy.csv (they are
closed vocabularies; a comment notes the source).

### 3.4 RcMarkdown

`src/features/rc/components/RcMarkdown.tsx`: thin wrapper over `react-markdown` allowing only
paragraphs, bold, italics, line breaks, and blockquotes; no links, no images, no raw HTML.
All passage text, summaries, prompts, choice text, and explanation bodies render through it.

### Phase A acceptance
- `node scripts/build-rc-bank.mjs` exits 0 with the summary table matching §3.2 numbers.
- `npx tsc --noEmit` clean.
- Temporary route or console check: `loadPassage(1188)` resolves with title "Risk Communication",
  6 questions, question 7660 correct answer present.
- Commit: `feat(rc): RC question bank pipeline and loader`.

---

## 4. Phase B — progress persistence (Supabase, DDL is a human gate)

Content is static; **progress is in Supabase**. Three tables. You cannot create them yourself:
write the migration file AND hand Joshua the DDL to paste into the Supabase SQL editor, then
verify before building on them.

1. Write `supabase/migrations/<timestamp>_rc_drilling.sql` containing exactly:

```sql
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
```

2. **STOP and tell Joshua:** "Paste the DDL from `supabase/migrations/<file>` into the Supabase
   SQL editor and run it, then tell me done." Do not proceed on this phase until confirmed.
3. Verify from the app: `rcProgress.ts` boot check does
   `supabase.from('rc_drill_sessions').select('id').limit(1)` — a 42P01 error means the tables
   are missing; surface that clearly and stop.
4. Regenerate types if the repo's workflow supports it; otherwise add the three table types to a
   local `rcSupabase.types.ts` — do NOT hand-edit `src/integrations/supabase/types.ts`.

`api/rcProgress.ts` exports (all take/return the types in `rcTypes.ts`):
`createSession(config, passageIds)`, `completeSession(id)`, `recordAttempt(a)` (first attempt per
question per session gets `is_first_attempt: true`; ANY later write for the same question in the
same session — including review re-answers — writes a NEW row with `is_first_attempt: false`,
never updates the first), `saveAnnotations(passageId, highlights)` (debounced 1s),
`loadAnnotations(passageIds)`, `getQuestionHistory(userId)` → per-question aggregate
`{ questionId, attempts, everIncorrect, incorrectOnLastTake, incorrectCount, lastSeenAt }` used
by §8 status filters.

### Phase B acceptance
- Human gate passed; boot check green.
- From the browser console in a dev session: create a session, record an attempt, see the rows in
  Supabase (ask Joshua to confirm in the dashboard, or select them back through the client).
- Commit: `feat(rc): progress persistence`.

---

## 5. Phase C — the player (`/rc/drill`) — LawHub-clone, the core of this build

**Design decision (locked by Joshua): the player is a faithful LawHub-style exam interface, like
LSAT Lab's and 7Sage's testers.** Inside the player, the LSAT U design system does not apply. The
hub, results, and review chrome (§7–8) DO use LSAT U styling.

### 5.1 Player visual spec (`player.css`, scoped under `.rc-player`)

- Background `#FFFFFF`; text `#1a1a1a`; font stack
  `"Helvetica Neue", Helvetica, Arial, sans-serif`; base size 16px (this is the 100% setting of
  the font-size control), line-height 1.35.
- Top toolbar: full-width white bar, 1px bottom border `#d9d9d9`, containing left-to-right:
  **Passage Only View** pill button (grey outline, rounded-full) · find-text input (rounded-full,
  grey, placeholder "Find Text, Type Here", magnifier icon) · centered **question counter** "n of
  N" · **timer** (clock icon + m:ss, click toggles visibility to just the icon) · overflow menu
  button (hamburger icon).
- Body: **two columns, 50/50, each independently scrollable**, thin `#e5e5e5` divider. Left =
  passage; right = question. Both panes have generous padding (32px).
- Passage rendering: paragraphs with `text-indent: 20px` and NO blank line between paragraphs
  (exam convention), except comparative passages where the `**Passage A**`/`**Passage B**` headers
  and italic intro get their own lines (RcMarkdown handles this — passage text's `\n\n` maps to
  new `<p>` with indent, styled via CSS in `.rc-player` scope only).
- Right rail (vertical icon strip, right edge, dark icons on white, ~44px wide): Full screen ·
  Review · Accessibility · Flag · Response masking · Keyboard highlight · collapse chevron. Each
  is a plain icon button with an `aria-label` and a tooltip.
- Bottom bar: white, 1px top border: left = item chip (grey rounded rect, "PrepTest 158 · S1 ·
  P1 · Q4") · center = **Prev** button, **question pills**, **Next** button (Next is solid blue
  `#2563eb`, Prev grey) · right = **Confirm** button (per-question mode only; disabled until a
  choice is selected).
- Question pills (§5.4): 28px rounded squares; current = blue border + underline bar; answered
  correct = green fill `#16a34a` (reveal modes only); incorrect = red `#dc2626`; flagged = small
  flag dot; unattempted = grey outline.
- Choices: each choice is a row card (1px `#d9d9d9` border, 6px radius, 10px gap): letter bubble
  (circle, 28px, grey border; selected = solid dark fill, white letter) · choice text · cross-out
  icon button at the right edge (toggles `line-through` + 50% opacity on the text; selecting a
  crossed-out choice un-crosses it).

### 5.2 Session boot

`/rc/drill` reads query params:
- `sessionId` — resume an existing session (load config + attempts, jump to first unanswered), OR
- `passage=<passageId>[&q=<questionId>]` — ad-hoc single-passage session (this is the
  single-question drill path: boots a session over that passage; if `q` given, land on that
  question), OR
- fresh config handed from the hub via router state (normal path).

A session = ordered `passage_ids[]` + per-passage ordered questions from the bank + `config`:

```ts
type RcDrillConfig = {
  reveal: 'per_question' | 'per_passage' | 'end_of_set';   // default 'per_passage'
  timing: { mode: 'unlimited' } | { mode: 'per_passage_budget', secondsPerPassage: number },
  source: 'manual' | 'adaptive' | 'assignment';
}
```

### 5.3 Tools (each is a hard requirement; behaviors exactly as stated)

1. **Passage Only View** (toggle): passage text reflows across BOTH columns in a 2-column CSS
   `column-count: 2` layout; the question pane hides; button label swaps to "Passage with
   Question View". State per session, not per question.
2. **Find text:** typing ≥2 chars live-highlights all case-insensitive matches in the passage
   (temporary `<mark>` styling, distinct from user highlights); Enter cycles matches, scrolling
   them into view; clearing the box clears marks. Passage only, not choices.
3. **Highlighter:** selecting text in the passage OR any choice pops a small floating "Highlight ▾"
   button pair at the selection; clicking Highlight applies the current color; the ▾ opens a
   4-swatch row: yellow `#F6E05E` (default) · pink `#FBB6CE` · green `#9AE6B4` · cyan `#76E4F7`.
   Clicking an existing highlight pops "Remove highlight". Highlights persist per (user, passage)
   via `rc_annotations` (§4) and restore on any future encounter with that passage. Use
   `highlightUtils.ts`; highlights store as text-offset ranges against the passage/choice source
   string, not DOM nodes.
4. **Flag:** right-rail flag toggles the current question's flag (pill shows dot; persisted on the
   attempt row).
5. **Response masking:** toggle hides all five choice texts behind grey blocks (letters remain);
   clicking a letter's mask reveals just that choice. State resets per question.
6. **Review modal:** grid of all questions as cells (colored like pills) + filter checkboxes
   "Flagged" and "Unattempted"; clicking a cell navigates to it; X closes. In end-of-set mode the
   modal also holds the **Submit** button.
7. **Accessibility modal**, 4 tabs, settings persist in localStorage under `rc-player-a11y`:
   - Color scheme (6, applied via a class on `.rc-player`): Black on white (default) · Grey on
     light grey · Purple on light green · Black on violet · Yellow on navy · White on black.
   - Font size: 75 / 100 / 125 / 150 / 175% (scales both panes).
   - Line height: 1.35 (default) / 1.65 / 1.85.
   - Zoom: static text explaining browser zoom shortcuts (no controls).
8. **Full screen:** requestFullscreen on the player root; icon swaps to exit.
9. **Keyboard:** ←/→ = Prev/Next · A–E keys = select choice · F = flag · Esc closes any modal.
   "Keyboard highlight" rail icon toggles a mode where ↑/↓ move a text cursor per line — OPTIONAL;
   if you skip it, the icon still renders with tooltip "Coming soon", disabled.
10. **Overflow menu** (right drawer): **Question Details** (table: PrepTest · Section · Question ·
    Difficulty · Question Type · Question Features · Passage Topic · Passage Format · Frameworks ·
    Set Difficulty · Set Number — straight from the bank record) · **Pause** (blur overlay +
    Resume; clocks stop) · **Save & exit** (session stays `in_progress`; hub can resume) ·
    **Submit** (end-of-set mode).

### 5.4 Navigation model (per-passage grouped pager — exact behavior)

The pill row shows: every question of the CURRENT passage as an individual numbered pill, and each
OTHER passage as ONE range pill labeled "8–13" (its question numbers). Clicking a range pill
navigates to that passage's first question (making its questions expand into pills and the
previously-current passage collapse into a range pill). Prev/Next cross passage boundaries
seamlessly. Question numbering is continuous across the whole session (passage 2's first question
is "8", not "1").

The passage pane always shows the current passage; switching passages swaps passage text, restores
that passage's highlights and scroll position (keep scroll per passage in memory).

### 5.5 Timing

- Count-up timer always runs per session (hideable). Per-question time via `questionTimer.ts`
  segments (pause-aware) recorded into `rc_attempts.time_ms`.
- `per_passage_budget` mode: the toolbar timer counts DOWN from `secondsPerPassage ×
  passageCount`; at zero it does NOT force-submit — it turns red and keeps counting up (advisory,
  matching the repo's ADR-0002 precedent). Default budget when timed: 525s (8:45) per passage.

### 5.6 Reveal-mode state machine (`rcSession.ts` — implement exactly)

States per question: `unanswered → selected → (confirmed) → revealed`. Rules by mode:

- **per_question:** selecting enables Confirm. Confirm records the attempt (first attempt),
  colors the pill, and reveals feedback inline (§7 inline layer) for THAT question. Navigation is
  free at all times. A revealed question is read-only (no re-select in the player; re-attempt
  happens in review).
- **per_passage (default):** selecting records nothing yet; moving between questions is free;
  answers are held in memory. When the LAST unanswered question of the current passage gets an
  answer AND the student attempts to navigate past the passage boundary (or clicks the "Check
  passage" button that appears in the bottom bar once all of the passage's questions have
  selections), all of that passage's attempts are recorded (first attempts), pills color, and the
  player switches that passage into **passage-review state**: questions of that passage now show
  the §7 review layer. A "Continue to next passage" button proceeds. Earlier passages remain
  reviewable; upcoming passages remain hidden-feedback.
- **end_of_set:** answers held and recorded silently per question (attempt rows written on
  navigation away from a question, `is_first_attempt` true); no feedback anywhere until Submit
  (from overflow menu or Review modal). Submit → confirm dialog ("N unanswered" warning if
  applicable) → records remaining, completes the session, navigates to `/rc/results/:sessionId`.

On session completion (all modes): `completeSession()`, then results page.

### Phase C acceptance (drive every one in the preview browser)
1. Boot a 2-passage session (hand-build config in code if the hub isn't built yet) in
   per_passage mode. Read pane scrolls independently of question pane.
2. Passage Only View reflows to two columns and back.
3. Find "the" → matches marked, Enter cycles.
4. Highlight passage text in two colors; highlight a choice; reload the page mid-session →
   highlights restore.
5. Cross out two choices; select one of them → un-crosses.
6. Masking hides/reveals choices individually.
7. Answer all of passage 1 → "Check passage" appears → feedback for passage 1 only; passage 2
   still clean. Continue; finish; land on results route (stub OK this phase).
8. Per-question mode: Confirm flow + instant reveal. End-of-set mode: zero feedback until Submit.
9. Pills: grouped ranges expand/collapse per §5.4; colors correct in each mode.
10. Accessibility: each color scheme, font size, line height applies live and survives reload.
11. Question Details shows all rows for a question with features and for one without (renders "—").
12. Keyboard map works. Pause stops both clocks.
13. A comparative passage (PT159 has several; e.g. any passage with format Comparative) renders
    Passage A/B headers correctly.
14. `npx tsc --noEmit` clean. Commit: `feat(rc): LawHub-style RC player`.

---

## 6. Phase D — review layer (attempt-first, progressive disclosure)

This is the feedback surface used in ALL modes (inline after per-question confirm, per-passage
block, and post-submit review from results). One component tree, three entry points.
**Design decision (locked): the student re-attempts before seeing answers, and explanations
disclose progressively — never a wall of text.**

### 6.1 The reveal sequence for one question

State A — **re-attempt** (only when arriving from results review of end_of_set/per_passage modes,
i.e. when the student did NOT just actively answer it): the question renders exactly like the
player, their original pick NOT shown, a banner "Answer again, then compare." They select and
confirm → records a re-attempt row (`is_first_attempt: false`) → State B. A "Skip to answer" text
link (small, grey) jumps straight to State B without a re-attempt. When the student JUST answered
(per_question confirm, or per_passage boundary), skip State A.

State B — **verdict + explanation shell**:
- Their pick's bubble outlined (red if wrong, green if right); correct answer's bubble filled
  green. Both first-attempt and re-attempt picks shown if they differ (label chips "1st" / "2nd").
- Above the choices, the `explanationBlocks` render in order as collapsible blocks with their
  headings (Anticipate, Goal, …), ALL COLLAPSED by default except when the answer was wrong, in
  which case the first block auto-opens.
- Each choice gains a disclosure row beneath it (reuse `InlineChoiceExplanation.tsx`): closed =
  just the tag chip(s) (split dual tags on `" / "`) + "N% of students"; open = + the prose. The
  correct choice and the student's pick(s) auto-open; others open on click. A choice with no tag
  and no explanation gets NO row (never an empty shell).
- Passage pane in review gains a **Passage summary** section under the passage: style tabs
  Standard / Brief / Another Way — tabs render ONLY for non-null styles; if only Standard exists,
  no tabs, just the summary under the heading. Collapsed by default behind a "Show passage
  summary" toggle.
- Unexplained questions (`hasWrittenExplanation: false`): verdict + the Ask-the-tutor fallback
  line (§2.4). No empty blocks, no fake content.

### 6.2 Where it mounts

- per_question: inside the question pane, below the choices, immediately after Confirm.
- per_passage: same, activated for the whole passage at the boundary (§5.6).
- post-session: `/rc/results/:sessionId` rows link to `/rc/drill?sessionId=…&review=1&q=…` which
  boots the player in read-only review state (all questions in State A/B per the rule above),
  navigation free, no Confirm bar, top-right badge "REVIEW".

### Phase D acceptance
1. Wrong answer in per_question mode → first explanation block auto-open, wrong pick red +
   correct green, correct + picked choice rows auto-open, others closed but openable.
2. Right answer → all blocks closed, verdict green, tag chips visible.
3. Review entry from results → re-attempt state first; answering differently shows "1st"/"2nd"
   chips and writes a non-first attempt row (verify in DB that the first-attempt row is untouched).
4. A dual-tag choice shows two chips. An unexplained question shows the tutor fallback and
   nothing else. A passage with only a Standard summary shows no style tabs.
5. Commit: `feat(rc): attempt-first review layer`.

---

## 7. Phase E — results (`/rc/results/:sessionId`)

LSAT U chrome (use the classroom/editorial tokens, NOT the player css). Layout top to bottom:

1. **Score hero:** big "n / N" + percentage + total time + per-passage time split. No PT-equivalent
   score, no percentile (we lack the cohort; truthfulness rule).
2. **Per-passage cards:** title, topic + format + framework chips, difficulty, n/N for that
   passage, average time per question.
3. **Question table:** one row per question — # · passage title (grouped) · question type ·
   difficulty · A–E strip (student's letter marked, correct letter marked, each letter's
   `percent` shown as small grey text beneath — real data from choices) · time (with per-question
   budget delta if the session was timed: "+0:48" red / "-0:12" green vs 75s/question) · flag ·
   "Review" link (→ §6.2 review deep link).
   Filters above the table: Result (All / Incorrect / Correct) · Flagged · Question type ·
   Difficulty.
4. **Actions row:** "Review all" · **"Drill your misses"** (creates a new session from this
   session's incorrect question's passages — passages containing ≥1 miss, manual source, same
   config; disabled with tooltip when 0 misses) · "New drill" (→ `/rc`) ·
   **"Exclude from analytics"** toggle → writes `excluded_from_analytics`; excluded sessions
   render at 40% opacity in the hub history with an "excluded" chip.

### Phase E acceptance
- Every number on the page traced by hand to `rc_attempts` rows for the session (spot-check 3).
- Filters compose. Drill-your-misses boots correctly. Exclude round-trips.
- Commit: `feat(rc): results page`.

---

## 8. Phase F — the hub: picker + builder (`/rc`)

LSAT U chrome. Three zones top to bottom: **Build a drill** (card) · **In progress / History**
(list) · nothing else in v1.

### 8.1 Build card (default = simple; this ordering is deliberate, keep it)

- **Passages:** stepper 1–8, default 1.
- **Timing:** segmented: Untimed (default) · Standard pace ("8:45 per passage") · Custom
  (minutes:seconds per passage input). Show live total: "≈ 17:30 for 2 passages".
- **Reveal answers:** segmented: After each passage (default) · At the end · After each question,
  with one-line captions: "Finish a passage, then walk through it" / "Test conditions, review at
  the end" / "Check yourself question by question".
- **Selection line:** "Choosing from N of 320 passages" (live count under current filters) with a
  **Customize** disclosure and a **Hand-pick passages** link.
- **Start drill** (primary button) → creates session (adaptive selection §8.3 unless hand-picked)
  → `/rc/drill`.

### 8.2 Customize drawer (collapsed by default)

Filter groups, each a chip row (multi-select, empty = Any): Topic (4) · Format (2) ·
Framework (7) · Question type family (5) · Passage difficulty (1–5 chips + "Adaptive" default) ·
**Status** (radio: Any · Fresh — default · Incorrect before · Incorrect on last try) ·
PrepTest range (dual slider 101–159, default 101–148, helper text: "Newest tests are held back
by default so they stay fresh for timed sections"). Status definitions (from
`getQuestionHistory`, applied at PASSAGE level): Fresh = no attempt on ANY of the passage's
questions; Incorrect before = ≥1 question everIncorrect; Incorrect on last try = ≥1 question
incorrectOnLastTake.

### 8.3 Adaptive selection (`rcAdaptive.ts` — deterministic, no ML, no fake claims)

Input: filters + count + user's question history. Algorithm, exactly:
1. Pool = passages passing all filters (topic/format/framework/family/PT range/status).
2. If difficulty filter is explicit chips, keep only those difficulties. If "Adaptive": compute
   the user's rolling RC accuracy over their last 40 first-attempt rows (or fewer). Target
   difficulty: accuracy ≥ 80% → 4; 60–79% → 3; < 60% → 2; no history → 2. Order pool by
   `abs(difficulty − target)` ascending.
3. Tie-break: fewer prior attempts first, then older `lastSeenAt` first, then random
   (seeded from session timestamp).
4. Take the requested count. If pool < requested, take all and show "Only N passages match —
   loosen a filter to get more" before starting.
UI label for this behavior anywhere it's named: "Adaptive: fresh passages near your level."
Nothing else. Never the word "smart", never "AI".

### 8.4 Hand-pick table (full-width section replacing the card's bottom when opened)

Columns: PT · S · P · Title · first-words preview (grey, truncated) · topic chip · format chip ·
Qs · difficulty dots · your status (— / done / n missed) · **Add/Remove** button. Sticky filter
bar = same filters as §8.2 + free-text search over titles. Running footer: "3 passages · 21
questions selected — Start drill". Data comes entirely from `rc-index.json` + question history
(no per-PT loads until start).

### 8.5 In progress / history list

Sessions from `rc_drill_sessions` newest first: config summary line ("2 passages · timed ·
after each passage"), status chip, score (completed only), Resume / Results / Delete
(confirm dialog; hard delete cascades attempts — say so in the dialog). Excluded sessions faded
(§7.4).

### 8.6 Entry point

Add an RC card/stage to the drill landing hub `src/pages/AcademyMainhub.tsx` (find the existing
stage/launcher structure and add "Reading Comprehension" alongside the LR entries, navigating to
`/rc`). Follow the file's existing patterns exactly; this is the ONLY file outside
`src/features/rc/` + `App.tsx` you modify for navigation.

### Phase F acceptance
1. Default Start with no history → 1 fresh passage near difficulty 2 → player boots.
2. Each filter changes the live "N of 320" count truthfully (spot-check two by hand against the
   index).
3. Status: complete a drill with a miss → that passage surfaces under "Incorrect before", not
   under "Fresh".
4. Hand-pick 2 specific passages → session contains exactly those, in the order added.
5. Resume works from the list. History numbers match results pages.
6. Commit: `feat(rc): hub, picker, adaptive builder`.

---

## 9. Phase G — teacher assignment hook (minimal v1)

Do NOT build a teacher UI. Provide the plumbing:
`rc_drill_templates` table is DEFERRED entirely — instead, v1 assignment = a URL. Any RC drill
config is expressible as `/rc/drill?passage=<id>` (single) or a hub deep link
`/rc?passages=1188,1201&reveal=per_passage&timing=unlimited` which pre-fills the build card
(hand-pick preloaded) so the student presses Start. Implement parsing of those hub params; that
is the whole phase. Joshua assigns by sending a link through existing channels.

Acceptance: a crafted URL pre-fills the builder correctly; a bad passage id shows "That passage
could not be found" and falls back to defaults. Commit: `feat(rc): assignment deep links`.

---

## 10. Finish

1. Write `src/features/rc/CONTEXT.md` (glossary: passage, set, session, attempt, reveal mode,
   status, adaptive; table of routes; pointers to the bank contract §3.1) and register it in
   `CONTEXT-MAP.md`.
2. Full regression pass: run the entire Phase C–F acceptance lists once more on the committed
   tree.
3. `npx tsc --noEmit`, then `bash .claude/safe-push.sh`.
4. Final report to Joshua: what shipped, the conversion-report numbers, every place you exercised
   judgment where the spec was silent, and anything that could not be verified with a real run
   (listed as NOT verified, not as done).

## Explicitly out of scope for v1 (do not build)

Reading Mode (dimmed question column), keyboard-highlight mode (beyond the disabled icon),
saved/shared drill templates, teacher library UI, PT-equivalent scores, percentiles, blind-review
for RC (the `BlindReview*` reuse is OPTIONAL and only if end_of_set mode gets it for free),
the 22 pre-PT101 tests, video explanations, discussion/notes panels, the Question Finder UI.
If you finish everything above with budget to spare, stop and report rather than starting these.
