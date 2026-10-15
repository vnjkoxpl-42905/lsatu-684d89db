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
