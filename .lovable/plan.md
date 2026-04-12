

## Plan: Persistent Question Tracking and Intelligent Drill Engine

### Summary
The core infrastructure already exists but has gaps. The `attempts` table captures answered questions, the `question_usage` table tracks views, and the `AdaptiveEngine` already has smart drill logic (40/40/20 formula) and weak-area analysis. The main issues are:

1. **Attempts are only saved on answer submission** — if a student views a question but skips it, nothing is recorded
2. **The adaptive engine's in-memory state resets every session** — it re-reads from DB but the in-session cooldown map is lost
3. **Smart drill (`generateSmartDrill`) queries by `user_id` but many tables use `class_id`** — inconsistency
4. **No `selected_answer` column** in the `attempts` table — we only know correct/incorrect, not what they picked
5. **Question pool deduplication is mode-scoped** — seeing a question in adaptive mode doesn't prevent it reappearing in type-drill mode

### What will change

#### 1. Add `selected_answer` column to `attempts` table
- Migration: `ALTER TABLE attempts ADD COLUMN selected_answer text;`
- Update `saveAttemptToDatabase` in `Drill.tsx` to include the student's selected answer
- This enables richer analytics (which wrong answers are common traps)

#### 2. Track question views (not just submissions)
- Add a new `question_views` table: `(id, class_id, qid, mode, viewed_at, answered)`
- Insert a row every time a question is displayed to a student
- Mark `answered = true` when they submit
- This gives full visibility into skipped questions and time-on-question patterns

#### 3. Unify deduplication across all drill modes
- Update `QuestionPoolService.getQuestionUsage` to query across all modes by default (not mode-scoped), so a question seen in any drill mode counts as "seen"
- Keep mode-scoped option available for targeted drills
- Update `QuestionPoolService.filterQuestionPool` to use cross-mode usage data

#### 4. Hydrate adaptive engine from DB on session start
- When a drill session begins, load the user's last 200 attempts from the `attempts` table
- Feed them into `adaptiveEngine.recentAttempts` and rebuild the cooldown map
- This means the engine "remembers" across sessions, not just within one

#### 5. Strengthen smart drill question selection
- Update `generateSmartDrill` to use `class_id` consistently (matching RLS policies)
- Add time-based weighting: questions answered wrong recently get higher redemption priority
- Factor in `question_views` data: questions viewed but not answered indicate confusion — prioritize those for revisit
- Ensure the progression bucket targets the student's exact mastery level per question type

#### 6. Add RLS policies for new table
- `question_views`: SELECT, INSERT for authenticated users scoped to `class_id = auth.uid()::text`

### Files to modify
- **Migration**: Add `selected_answer` to `attempts`, create `question_views` table with RLS
- **`src/pages/Drill.tsx`**: Save `selected_answer` on every attempt; insert `question_views` row when question is displayed
- **`src/lib/questionPoolService.ts`**: Add cross-mode deduplication option
- **`src/lib/adaptiveEngine.ts`**: Hydrate from DB on init; improve smart drill query consistency (use `class_id`)

### What stays the same
- The existing 40/40/20 smart drill formula (progression/redemption/maintenance)
- The mastery-level calculation per question type
- RLS policies on existing tables
- The `question_usage` table (kept for backwards compatibility, `question_views` adds richer data)

### Technical details

```text
question_views table:
┌──────────┬──────────┬──────┬──────┬────────────┬──────────┐
│ id (uuid)│ class_id │ qid  │ mode │ viewed_at  │ answered │
└──────────┴──────────┴──────┴──────┴────────────┴──────────┘

Drill flow (updated):
  Student opens question
    → INSERT INTO question_views (class_id, qid, mode)
  Student submits answer
    → INSERT INTO attempts (..., selected_answer)
    → UPDATE question_views SET answered = true
  Adaptive engine on next question
    → Loads recent attempts + views from DB
    → Scores candidates by weakness, mastery level, recency
    → Avoids recently-seen questions across ALL modes
```

