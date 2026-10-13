# Teacher Workspace IA Rebuild — Audit + Staged Plan

Companion to the in-repo decision docs:
- Glossary: `src/pages/teacher/CONTEXT.md`
- Decision: `docs/adr/0001-teacher-workspace-ia.md`

Source of the redesign: a grill-with-docs session (2026-06-11). Governing rule from Joshua: **nothing already in the teacher workspace gets left out or broken. Especially Guided Drills — do not mess that up.**

---

## Stage 0 — Audit: every existing surface and where it lands

23 teacher pages + the Guided Drills subsystem. Every one has an explicit destination in the new IA. Nothing is deleted; surfaces are relocated or relabeled, never dropped.

### Current top-level nav (sidebar)
`Command · Students · Conversations · Schedule · Bootcamps · Library · Templates · Bootcamp References · Admin`

### Current Library sub-nav (buried second layer)
`Assignments · Guided Drills · Recaps · Uploads · Bootcamps · Smartboard · Analytics`

### Full inventory → destination map

| Existing surface | File | What it really does | New home |
|---|---|---|---|
| Command (index) | `TeacherAITA.tsx` | Triage + AI operator chat + draft approval queue | **Command** (unchanged role; add transcript inbox later) |
| Today | `TeacherToday.tsx` | Stats dashboard (pending drafts, uploads) | Merge into **Command** (it duplicates Command's job) |
| Students | `TeacherStudents.tsx` | Roster list | **Students** (door 1) |
| Student detail | `TeacherStudentDetail.tsx` | One student's page | **Students > [student]** — gains assign + recap + insights tabs |
| Conversations | `TeacherConversations.tsx` | 1:1 message threads | **Conversations** (own tab, confirmed) |
| Schedule | `TeacherSchedule.tsx` | Week view across students | **Schedule** (own tab) |
| Weekly plans | `TeacherWeeklyPlans.tsx` | (redirects to schedule already) | folds into **Schedule** |
| **Guided Drills** | `pages/admin/GuidedDrills.tsx` | **Drill library + filters + assign flow + HTML manifest** | **Library > Guided Drills** — PRESERVED WHOLE (see below) |
| Assignments overview | `TeacherAssignmentsOverview.tsx` | All active assignments grouped | **Library** landing OR **Students** (cross-cut view) |
| Assignment builder | `TeacherAssignments.tsx` | Create an assignment | **Assign** action (two doors) |
| Bootcamps (assign) | `TeacherBootcamps.tsx` | Toggle a bootcamp on for a student | **Assign** (door from Library or Student) |
| Bootcamps (analytics) | `TeacherBootcampsHub.tsx` / `BootcampsHub` | Per-topic completion/accuracy | **Insights** |
| Bootcamp detail | `TeacherBootcampDetail.tsx` | One topic's metrics | **Insights > [topic]** |
| Student bootcamp detail | `TeacherStudentBootcampDetail.tsx` | One student in one topic | **Insights** or **Students > [student]** |
| Analytics bridge | `TeacherAnalyticsBridge.tsx` | Analytics entry | **Insights** |
| Recaps | `TeacherRecaps.tsx` | Compose/send recap | **Students > [student] > Recap** (transcript-driven; no tab) |
| Uploads | `TeacherUploads.tsx` | Review student-submitted external work | **Command** (inbound review) or **Students > [student]** |
| Smartboard | `TeacherSmartboard.tsx` | Excalidraw canvas, saved per student | **Whiteboard** (own tab + template gallery) |
| Templates | `TeacherTemplates.tsx` | Canned message/email text | tuck into **Command** / settings (utility) |
| Bootcamp References | `BootcampReferences.tsx` | Joshua's private inspiration shelf | **References** (demoted, separate; never assignable) |
| Reference detail | `BootcampReferenceDetail.tsx` | One reference | **References > [ref]** |
| Admin | `TeacherAdmin.tsx` | Accounts + feature flags | **Admin** |

### Guided Drills — handle with care (Joshua's explicit flag)

It is a complete, working subsystem. **Do not refactor its internals. Relocate only.**
- `lib/guidedDrills.ts` — `listGuidedDrills`, `resolveGuidedDrillPool`, `createAssignments`.
- `data/guidedDrillHtmlManifest.ts` — 1003-line manifest, ~25+ real drills (slug, htmlPath → `/guided-drill-html/*.html`, time, question count). **Content. Leave intact.**
- Surface has: week filter, reasoning-type filter (Conditional / Causation / Comparative), search, preview sheet, multi-student assign + schedule + notify, `bank_filter` resolving question pools by question features.
- Mounted twice today: `/admin/guided-drills` (standalone) and `/teacher/library/guided-drills`. Keep a working route; redirect the other. **Do not remove either mount until the replacement is verified.**

### New top-level nav (target)
`Command · Students · Conversations · Library · Whiteboard · Schedule · Insights · Admin` + **References** demoted below the divider.

Library sub-types (content store, all assignable): `Bootcamps · Guided Drills · Question Sets · Notes` (+ future Whiteboard Templates surfaced under Whiteboard).

---

## Stage 1 — IA skeleton (nav + relabel + redirects, no content risk)

Goal: change the *shell* and routes; touch no working subsystem internals.
1. Rewrite `TeacherShell.tsx` NAV to the 8-item target + demoted References.
2. Rebuild `TeacherLibrary.tsx` as a **content store** (Bootcamps / Guided Drills / Question Sets / Notes), not an action wrapper.
3. Move bootcamp *analytics* (`BootcampsHub`, detail pages) under a new **Insights** route. Move bootcamp *assign* (`TeacherBootcamps`) under Library/Assign.
4. Add **Whiteboard** as a top-level route (wraps `TeacherSmartboard` + a template gallery shell).
5. Add **all legacy redirects** so no URL 404s (`/teacher/library/bootcamps` → assign, old `/teacher/bootcamps` → Insights, etc.). Mirror the existing redirect pattern in `App.tsx`.
6. Verify: every old route resolves; Guided Drills still loads and assigns from its new Library home.
**Checkpoint — pause for Joshua.**

## Stage 2 — Two-door Assign + student-centric plan
1. Student detail page (`TeacherStudentDetail`) gains tabs: Plan / Assign / Recap / Insights / Conversation.
2. "Assign from Library" door: an `Assign to…` action on each Library item (reuse `createClassroomItem` / `createAssignments` / `notifyStudentOfClassroomItem` — already exist).
3. "Assign from Student" door: add-material picker inside the student.
4. Both write to the same student plan/feed. No new assignment backend; reuse `classroomItems` + guided-drill assign.
**Checkpoint — pause for Joshua.**

## Stage 3 — Ingestion + transcript pipeline (the spine)
1. Gmail/Drive import → Library material (Notes as HTML, question sets).
2. Session Transcript ingest (Gmail) → transcript inbox in Command.
3. Pipeline: transcript → AI-drafted Recap + matched existing HTML notes → approve in Command → attach to student.
4. "Auto-suggested" assignment state.
New schema/edge-function work; design after Stages 1–2 are solid.

## Stage final — Verify (manual checklist for Joshua)
- [ ] Every old `/teacher/*` URL still resolves (no 404).
- [ ] Guided Drills: list, all filters, preview, multi-student assign + schedule + notify all work from the new Library home.
- [ ] Bootcamp assign still toggles + sets date range + student sees it.
- [ ] Bootcamp analytics reachable under Insights.
- [ ] Whiteboard opens; saved sessions intact; (template gallery if built).
- [ ] References reachable, still read-only, never shows an Assign action.
- [ ] Recaps reachable inside a student.
- [ ] Conversations + Schedule + Admin unchanged and working.
- [ ] Mobile bottom-tab nav reflects new structure.
