# Product

## Scope

This `PRODUCT.md` governs only the Intro to LR bootcamp inside LSAT U. Specifically:

- Route: `/bootcamp/intro-to-lr/*`
- Page shell: `src/pages/IntroToLrBootcamp.tsx`
- Source tree: `src/bootcamps/main-conclusion/`

All other LSAT U surfaces (Foyer, Inbox, Drills hub, Admin, Diagnostics outside the bootcamp, Hard Sentences outside the bootcamp, Smart Drill, Ask Joshua, etc.) are explicitly out of scope. `/impeccable` invocations against this file should refuse to expand beyond the bootcamp without an explicit scope override from Joshua.

## Register

product

## Users

The Intro to LR bootcamp serves two student types, with one as the design north:

- **Aspiring Attorneys clients (design north).** Paying students inside Joshua's Aspiring Attorneys program. They already know Joshua's voice, trust the method, and are training under his guidance. Voice, density, and pacing are tuned to this student first. They expect to be challenged, not coddled, and they expect every minute on the screen to advance their understanding.
- **Self-study LSAT learners (secondary).** Independent learners who arrived at LSAT U without prior coaching context. The bootcamp must earn their trust without it, and the same surface should give them a path to upgrade into the AA voice rather than dilute it for them.

Both students arrive with the same job to be done: understand Logical Reasoning at a level deeper than pattern-matching to question types. They are not here to memorize. They are here to internalize the structure of an argument so they recognize it cold.

The bootcamp lives inside an authenticated app surface (`has_bootcamp_access` flag, Foyer-led navigation). It is part of an ongoing relationship with the product, not a one-shot landing experience.

## Product Purpose

The Intro to LR bootcamp exists to make Logical Reasoning fluent end-to-end. Main conclusion identification is the first checkpoint, but the real outcome is fluency in the full LR taxonomy: premise versus conclusion roles, indicator behavior, the eight question types, the named traps, Joshua's full method.

Success looks like this: a student who completed the bootcamp can hear an argument once, name the conclusion without re-reading, classify the question type, and predict the trap before they see the answers. Diagnostics, drills, simulator runs, and hard sentences inside the bootcamp all exist to compound toward that one capability. Nothing on the surface exists to entertain or to perform progress; every interaction is paying down the gap between "I read this" and "I understand this."

The bootcamp is on-ramp and method, not a quiz library. It is what the student walks through before they are calibrated to drill at scale on the rest of LSAT U.

## Brand Personality

**Confident, considered, alive.**

- **Confident.** Joshua's authored voice is opinionated about what matters and what does not. The product never hedges. It never softens an instruction into "you might consider." It tells the student what to do, and trusts them to do it.
- **Considered.** Every word, every component, every transition was decided. The bootcamp slows down for a single concept when the concept earns it. Generous whitespace, deliberate hierarchy, no filler.
- **Alive.** Motion and warmth signal a real teacher behind the screen. The runner reveals copy referencing the student's actual attempt. The cleared screen routes back into the next computed step. The product feels like sitting next to a coach who notices what you did.

Voice is coach voice, not editor tone. Eyebrow + display title + subtitle is the canonical surface shape. Reveal copy speaks to the student's actual answer, not a generic "the correct answer is." There is no "Welcome back" copy that is not conditional on real returning state, no fake analytics, no fabricated mastery numbers.

## Anti-references

The bootcamp should explicitly not look or feel like any of the following:

- **Generic LSAT/LSAT prep apps.** 7Sage, Khan Academy LSAT, Manhattan Prep, Blueprint, LSAT Demon, LSAT Lab. Bland card grids, hero-metric dashboards, gamification veneer over thin content, drilling masquerading as understanding.
- **SaaS-cream startup landing aesthetic.** Soft pastels, gradient blobs, illustration sets, big-number metrics tile rows, "Get started in seconds" tone. The currently-saturated AI-product look.
- **Cookie-cutter LMS / Coursera-style course UI.** Linear video-then-quiz pacing, dim sidebars, generic "Lesson 1.1 / Lesson 1.2" shells, no opinion about what mastery means, completion checkmarks that mean only that you stopped scrolling.
- **Edtech gamification, Duolingo-shaped.** Streak flames, mascot animations, XP bars, trophy popovers. Dopamine loops substituted for understanding. Streaks are not earned by attempting; mastery is not earned by tapping. The bootcamp does not reward attendance.

Positive reference family: premium learning craft. Brilliant, Are.na, Loom Studio. Exploratory, confident, willing to slow down for one concept, motion that rewards attention rather than performing for it. The bootcamp is closer to a well-typeset workbook with a coach in the room than to a test-prep platform.

## Design Principles

Five strategic principles for the bootcamp. Every design decision should pass at least one of these; decisions that fail all five should be reconsidered.

1. **Attempt before reveal.** Passive reading is the enemy. Every lesson runs through the phase machine: briefing, demo, attempt, reveal, coach, checkpoint, cleared. Continue is gated until the student submits. Reveal copy references the student's actual attempt, not a generic answer. Submission is never a one-way door.
2. **Truthfulness over performance.** Every progress claim, badge, percentage, streak, and "next step" CTA traces to real persistence (`useModuleProgress`, `useDiagnostics`) or a static registry. Honest empty states beat fabricated content. If we do not track per-section completion, we do not render fake check marks. If the dashboard has no data, the lead action is the one that generates data.
3. **Compute the next step; do not present a grid.** Module hubs lead with one computed CTA, not equal-weight cards. The `RunnerHero` plus path-strip plus `JumpTo` shape is the only acceptable hub shape. Card grids are how generic LSAT prep apps shrug at the student; this product points.
4. **Coach voice, not industry voice.** The bootcamp speaks like a teacher, not like an LSAT industry editor. "Stimulus" is industry vocabulary; "the argument" is student vocabulary. No internal IDs in rendered text. No spec language ("Phase D distractors", "calibration drill"). No em dashes in utility or computed copy. No "Welcome back" without state to back it.
5. **Reuse the system; do not fork.** The 12 bootcamp primitives, the scoped tokens, the `PageHeader` / `RunnerHero` / `TrainingPath` / `JumpTo` interaction tier are the design system. New surfaces compose them first. New primitives only exist when composition is genuinely insufficient. One motion library (framer-motion v12), one icon library (lucide-react), no second of either.

## Accessibility & Inclusion

WCAG 2.1 AA is the floor. The bootcamp commits to AAA-aspirational quality on body text contrast and on focus visibility, since the student spends extended time reading and interacting with attempt primitives.

Concrete commitments:

- Body and label copy meet AAA contrast (7:1) where the underlying token allows; AA (4.5:1) is the absolute minimum.
- Visible focus rings on every interactive element. Focus moves to the score line as `role="status"` after submission so screen readers announce the verdict and keyboard users land in readable content.
- `prefers-reduced-motion` is respected throughout. Motion is decorative on top of static layouts, never load-bearing.
- Identifier chips (sentence numbers, A/B/C/D letter chips, category labels that carry meaning) are not `aria-hidden`. Decorative chips reinforcing a textual label may be.
- Every chip, radio, and selectable candidate is click-again-to-clear and supports keyboard activation. Submission must always have a Try-again path.
- Touch targets meet 44 by 44 pixel minimum.
- Dark theme is the only theme today. Future light-mode swap must preserve all contrast commitments.
