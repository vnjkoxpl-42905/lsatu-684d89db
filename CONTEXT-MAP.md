# Context Map

The repo has more than one bounded context, each with its own language. This map points to where each glossary lives.

## Contexts

- [Public surface](./src/pages/CONTEXT.md) — the unauthenticated landing + sign-in page (`Auth.tsx`): how LSAT U describes itself to a prospective student.
- [Teacher workspace](./src/pages/teacher/CONTEXT.md) — Joshua's admin operator surface (`/teacher`): assigning prepared material to students and the transcript pipeline.

## Relationships

- Both surfaces describe the same product but to different audiences (prospective student vs. operator), so a word can carry different weight in each. Check the right glossary before reusing a term.
