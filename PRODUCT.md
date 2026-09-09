# Product

<!-- impeccable:product-schema 1 -->

## Scope

App-wide only. Every statement in this file must be true of all of LSAT U.

A rule that binds one surface does not belong here. It goes in that surface's brief under `.impeccable/surfaces/`. This split is deliberate and is the correction to a real failure: the previous PRODUCT.md was written on 2026-05-02 for the Intro to LR bootcamp alone, then widened app-wide on 2026-05-08 in a commit whose stated purpose was adding messenger principles. Bootcamp anti-references silently became binding on the drills, and stayed binding for four months. A one-surface rule written into an app-wide file has no boundary that can hold it. Keeping the file app-wide only removes the mechanism.

The repo already carries eight bounded contexts with their own glossaries (`CONTEXT-MAP.md`). Surface-specific product truth follows those boundaries, not this file.

## Platform

web

## Users

**Primary: Aspiring Attorneys clients.** Students who are paying Joshua for one-to-one LSAT coaching. They have consultations, scheduled sessions, transcripts, assigned work, and a real back-and-forth with him. The platform is where their coaching lives between sessions. They arrive already knowing who their coach is, and design decisions are made for them first.

**Secondary: independent self-study learners.** Students using the platform without an active coaching relationship. They are served by the same surfaces but are not the audience a tradeoff is resolved in favour of.

**Operator: Joshua.** The sole instructor and the product, voice, and content authority. He assigns work, publishes material, reviews student activity, and answers messages. He works from any device at any hour, so operator surfaces are as responsive as student surfaces.

## Product Purpose

LSAT U is the operational platform for Joshua's coaching practice. It delivers the method, holds the student's work, and keeps the coaching relationship live between sessions.

For a student: one place that knows what they have done, what they got wrong, and what to do next.

For Joshua: one workspace to assign, publish, review, and reply without losing the one-to-one feel that his practice is sold on.

Success is a student who logs in without being chased, knows the next action without asking, and can point to what improved.

## Positioning

**A real coach is in it.**

The claim a competing product cannot truthfully copy is that a named human being is on the other side of the platform, has met this student, and has looked at this student's work. Assignments come from him. Messages are answered by him. The material was authored by him. Nothing in the product should be built in a way that would still be true if the coach were removed, and nothing should imply a coach is present where one is not.

## Operating Context

The platform sits inside a coaching practice that runs partly outside it. Future work must not assume the app is the whole system.

- Coaching sessions happen on video and are transcribed. Session records, notes, and recaps originate outside the app.
- Booking and payment run through their own flow (packages, booking passes, a public booking microsite, single sessions).
- Students also practice on third-party platforms. Work done elsewhere is real work, and the app is not the only record of a student's effort.
- Joshua authors material ahead of time and assigns it, rather than the system generating it on demand.
- Students use both desktop and mobile, in focused study blocks and in short check-ins.

## Capabilities and Constraints

Confirmed surfaces: authentication and onboarding, the foyer, the classroom, guided drills and the question bank, full-passage Reading Comprehension, the Activity Centre, the Testing Centre and practice test runs, the wrong answer journal, saved sets, analytics and history, scheduling and booking, the inbox, the bootcamps, and an admin and teacher workspace.

Technical constraints:

- React, TypeScript, Vite, Tailwind, shadcn/ui and Radix primitives, React Router, TanStack Query, Supabase.
- One motion library (`framer-motion`). One primary icon library (`lucide-react`). New work composes existing primitives before introducing a new dependency.
- Deployment is not a side effect of pushing to `main`. Production at lsatprep.study requires an explicit publish step.
- Database migrations in `supabase/migrations/` are an archive, not an applied ledger. Production schema changes go through their own path, and UI must not assume a table exists because a migration file does.

Terminology is not defined here. It is defined per bounded context and mapped by `CONTEXT-MAP.md`. A word can carry different weight in different contexts, and collapsing them has already caused real bugs (a **flag** is not a **wrong answer**; **Set** and **Position** were separated for this reason).

## Brand Commitments

- **Name:** LSAT U, operating under Aspiring Attorneys. Production domain lsatprep.study.
- **No em-dashes in anything a student or prospect reads.** Joshua does not type them. A stray em-dash reads as machine-written and costs trust. This binds computed copy, utility copy, and authored copy alike.
- **Voice: undecided, deliberately.** The previous record carried a "coach voice, not industry voice" principle and two named voice registers (R1 procedural, R2 metaphor-led). Both were removed on 2026-09-05 by Joshua's decision, on the grounds that they were not stated clearly enough to be usable. They are being redone. Until a replacement is written, no work should cite the old voice rules, and no work should invent a voice rule to fill the gap. Route student-facing copy to Joshua.

## Evidence on Hand

Real:

- A live production deployment at lsatprep.study with real enrolled students.
- Authored LSAT curriculum: bootcamp modules, guided drill banks, RC passages with per-question explanations, and practice test content.
- Real student work in the database: attempts, sessions, flags, wrong answers, assignments.
- A real named instructor with a real coaching practice behind the product.

Absent, and never to be fabricated:

- No testimonials, case studies, press coverage, score-improvement statistics, or named customer references exist in this repo. Do not write them into any surface.
- No pricing, licensing, or availability claims are established here.
- No third-party or copyright framing anywhere in student-facing copy.

## Product Principles

1. **Truthfulness over performance.** Every number, badge, streak, status, and progress claim traces to real stored data. An honest empty state beats invented content. If nothing has been assigned, the product says so and stops. This is the one principle carried forward unchanged from the previous record, and it is the hardest of the five.

2. **Compute the next step; do not present a grid.** A student arriving at a surface should be told what to do, not shown a menu and left to choose. A card grid is what a product offers when it does not know the student.

3. **Attempt before explanation.** The student commits to an answer before the product explains anything. Passive reading does not build the skill. Reveal copy addresses what the student actually chose, not a generic key.

4. **A measurement is never a gate.** Drills and checks measure after teaching. A miss is framed as the next thing to work on, not a grade or a failure. Nothing in the product rewards attendance rather than work.

5. **The coach is not simulated.** Where the product speaks for Joshua, it is because Joshua said it. Where he has not, the product does not fill the silence with something that sounds like him. This is the operational form of the positioning claim.

## Accessibility & Inclusion

**WCAG 2.1 AA is a binding floor across every surface.** It is a defect gate, not an aspiration. A finding below the AA bar is a bug and is fixed, not argued.

- Text contrast is at least 4.5:1 against its actual rendered background, and at least 3:1 for large text and for the visual boundaries of interactive controls. Students read dense argument text on this platform for hours at a time.
- Every interactive element has a visible focus indicator.
- `prefers-reduced-motion` is respected. Motion is never load-bearing for understanding or for completing a task.
- Touch targets are 44x44px, and meet it by being that size rather than by a side effect such as wrapped text. This one is a house standard above the floor, not part of it: 44x44 is WCAG 2.5.5, which is Level AAA. The binding target-size rule is 2.5.8 at 24x24, so a control that clears 24x24 on a fine pointer clears the floor and is not a defect.
- A dense row of marks that exists to be read at a glance is the one place the 44x44 house standard yields. The Report Card's ledger is 22 to 26 ticks inside an 820px card; at 44px wide they would need 968 to 1144px, so meeting the standard means scrolling or wrapping, and the ledger stops being a single picture of the run. They are 44 tall and 28 to 30 wide, they clear 2.5.8, and that is the settled answer rather than an open defect. Joshua's call, 2026-09-09.
- Where a control has to stay small because it sits in chrome set in 11 or 13px type, the 44x44 target may be an explicit transparent overlay centred on the control instead of the control's own box. An overlay is a target somebody designed and it is proved by hit-testing the four edges; wrapped text is an accident and still does not count. The runner's rail controls, the door's crumb out and the demonstration's Play button are all built this way.
- Screen readers are informed of state that changes without a page load: unread counts, send confirmations, and live updates.
- Contrast is verified against what actually renders in the browser, not against the token values a theme is assumed to apply. The theme layer has shipped a light card on a near-black page while the token file read as correct.
