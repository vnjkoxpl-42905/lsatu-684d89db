# Inline question opening in Principle & Flaw bootcamp

## Goal
When a student clicks any specific question card in the P&F bootcamp, the actual LSAT question opens **right inside the bootcamp shell** — perfectly formatted (same layout as the official drill page), with answer-choice selection, blind-review marking, and explanation reveal. No navigation away from the bootcamp. Missing questions are clearly disabled and reported.

## What changes

### 1. Audit the bootcamp question bank
Generate a one-time report of every `QuestionRef` in `src/bootcamps/principle-flaw/data.ts` whose `PT{pt}-S{section}-Q{question}` qid is **not** present in the LSAT U `questionBank` (`src/lib/questionLoader.ts`). Output to `/mnt/documents/pf-missing-questions.csv` (qid, topic, set, level) so you can see exactly what's missing.

### 2. Disable missing question cards
In `Practice.tsx` (and any other place rendering `QuestionRef` cards — `Overview`, `TodayView`, `FlawHub`, `PrincipleHub`):
- Resolve each ref against `questionBank.getQuestion(qid)` at render time.
- If missing: card shows a muted "Not available yet" badge, the "Open" button is disabled, no click handler.
- If present: clickable as today.

### 3. Inline question viewer (the main work)
Replace the current `navigate('/drill?...')` behavior with an inline modal/drawer inside the bootcamp:

- New component `src/bootcamps/principle-flaw/components/InlineQuestionViewer.tsx`.
- Reuses the official drill question renderer **`OfficialQuestionPane`** (already exists at `src/components/drill/official/OfficialQuestionPane.tsx`) so formatting matches the drill page exactly — same stem/choice spacing fix you just approved.
- Loads the LRQuestion via `questionBank.getQuestion(qid)`.
- Provides: answer-choice selection, eliminate (Eye) toggles, "Submit answer", correctness reveal with the question's official explanation, optional blind-review toggle, and a "Next question" button when the day/set has multiple.
- Logs the attempt to Supabase `attempts` (same payload shape the drill page uses) so it counts toward proficiency, streaks, and the teacher's classroom view — and the bootcamp-progress autosave hook still fires.
- Mounts as a full-screen overlay (Dialog / Sheet) over the bootcamp UI, dark drill surface inside, bootcamp shell preserved underneath.

### 4. Wiring
- `OpenInDrillButton` in `Practice.tsx` becomes `OpenInlineButton` — opens the viewer with the clicked qid (and the surrounding set's qids as the "next" queue, so students can flow through one set without closing).
- No more `/drill?mode=type-drill&qids=...` navigation from inside the bootcamp.

## Out of scope
- No changes to the standalone `/drill` page itself.
- No data.ts content rewrites — only ref→qid validation.
- Other bootcamps (Causation Station, Intro to LR) are not touched in this pass.

## Technical details

```text
Practice.tsx card click
   └─ <InlineQuestionViewer qid setQids onClose />
        └─ questionBank.getQuestion(qid) → LRQuestion
        └─ <OfficialQuestionPane question … />   ← same renderer the drill uses
        └─ on submit: insert into `attempts` (mode='bootcamp-pf')
        └─ onComplete → useBootcampProgress autosave (already wired)
```

Audit script (one-shot, written to `/tmp` then run):
```ts
import { questionBank as pfBank } from 'src/bootcamps/principle-flaw/data';
import { questionBank } from 'src/lib/questionLoader';
const missing = pfBank.filter(q => !questionBank.getQuestion(`PT${q.pt}-S${q.section}-Q${q.question}`));
// → /mnt/documents/pf-missing-questions.csv
```

## Files
- **Create**: `src/bootcamps/principle-flaw/components/InlineQuestionViewer.tsx`
- **Modify**: `src/bootcamps/principle-flaw/components/Practice.tsx`, `TodayView.tsx`, `FlawHub.tsx`, `PrincipleHub.tsx`, `Overview.tsx` (only where question cards render)
- **Generate**: `/mnt/documents/pf-missing-questions.csv` (audit report)
