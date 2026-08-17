# Context Map

The repo has more than one bounded context, each with its own language. This map points to where each glossary lives.

## Contexts

- [Public surface](./src/pages/CONTEXT.md) — the unauthenticated landing + sign-in page (`Auth.tsx`): how LSAT U describes itself to a prospective student.
- [Teacher workspace](./src/pages/teacher/CONTEXT.md) — Joshua's admin operator surface (`/teacher`): assigning prepared material to students and the transcript pipeline.
- [Teacher Desk page](./src/pages/teacher/desk/CONTEXT.md) — the named visual regions of the desk page itself (the boxes on screen), nested under the teacher workspace. Names the layout so we can revise it precisely.
- [Guided Drills & Explanations](./src/components/drill/CONTEXT.md) — the practice domain: guided drills, the question bank, drill instruction cards, and per-question explanations (the Phase 2 authoring work).
- [Classroom](./src/components/classroom/CONTEXT.md) — the student's own room: the Classroom frame, its sections, and the flag-versus-wrong-answer distinction.
- [Reading Comprehension](./src/features/rc/CONTEXT.md) — full-passage RC drilling: passages, sessions, attempts, reveal modes, status, and the adaptive picker.
- [Booking](./src/components/booking/CONTEXT.md) — paying for and scheduling tutoring time: Packages, Booking Passes, the public microsite, and the Single Session (Slots, Holds, Bookers).

## Relationships

- Both surfaces describe the same product but to different audiences (prospective student vs. operator), so a word can carry different weight in each. Check the right glossary before reusing a term.
- A **flag** (Classroom) and a **wrong answer** (Wrong Answer Journal) are different things on different tables: a flag is chosen mid-question, a wrong answer is earned by missing one. Never collapse the two, and never let "flagged" drift into meaning "struggled with".
- **Set** means different things in two contexts: in Guided Drills it is a group of questions ("Build a Set"), while in Reading Comprehension it is a passage's position within its section. Check which context you are in before reusing it.
