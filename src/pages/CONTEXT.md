# Public Surface — Context

The unauthenticated landing + sign-in page (`Auth.tsx`): how LSAT U presents itself to a prospective student before they have an account. This file is the glossary for that marketing copy, so the language stays consistent and on-voice. It is not a spec.

## Voice

Student-facing copy here follows the **warm coach** voice (canonical in the vault: `wiki/concepts/teaching-voice.md`): encouraging, concrete, second-person, calm not hyped, no gotcha energy. Two surface-specific rules:

- **Platform, not a person.** The voice is LSAT U speaking as a platform ("we", "you"), never an individual founder ("I", "my", "Joshua's"). The product is the coach; no single person narrates.
- **No em dashes.** Ever (a standing global rule). Use the middot `·` as the separator, matching the rest of the page.

## Language

**Habit**:
One of the six trained reading behaviors the landing page showcases (Anatomy, Bridge, Failure, Stems, Patterns, Pace). The canonical word for these.
_Avoid_: Principle (collides with the question type, see below), card (never name the UI element in prose; describe the habit, not the card it sits on).

**Drill**:
The act of practicing a habit through repetition. The thing a student "sits down to do." A verb and the unit of practice.

**Principle**:
**Reserved for the LSAT Logical Reasoning question type only** (it appears in `QUESTION_TYPES`). Do NOT use "principle" to mean a training habit or a reasoning pattern. That overload is the bug this glossary fixes.

**Pattern**:
A recurring reasoning structure that repeats across many questions (the "Hunt patterns" habit). Distinct from Principle the question type.

## Section Results and Review Ownership (2026-11-23)

- **`section_history` (written once, immutable first answers)**: Written atomically by `close_standalone_section_v1` (legacy standalone path via `src/lib/sectionCloseout.ts`) or the protected writer (`TimedSectionController.close`). Never updated after close-out.
- **`section_review_records` (prediction and blind review)**: Written only through `save_section_prediction_v1` and `save_section_blind_review_v1` (`src/lib/sectionReviewRecord.ts`). Blind review is graded on the server from the saved credited answer and never writes `attempts` rows.
- **Readers and release rule**: `/review/section/:historyId` (`SectionReportPage.tsx`), `PracticeSectionResult` (`/testing/attempts/section/lr/:sessionId`, redirects history ids to `/review/section/:historyId`), `SectionReviewDetail` (redirects `/review/section/:historyId/:qid` to `/review/section/:historyId?walk=1&qid=:qid`), `ReviewQueuePage.tsx` (merges section regret/BR-changed items into journal items strictly by `sitting_id`), `SectionHistoryList`, and `StudentWorkPanel` all read merged history + review records and apply `sectionReleaseState` (`src/lib/sectionRelease.ts`). Assigned sections stay sealed until blind review is complete; practice-test legs stay sealed until the full test ends.
