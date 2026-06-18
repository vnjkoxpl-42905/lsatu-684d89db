---
status: accepted
date: 2026-06-18
---

# The AI Teaching Assistant is an always-visible panel embedded in the Teacher Desk

The Teacher Desk (Today) embeds the AI Teaching Assistant as a permanent center panel, reversing ADR 0001 / the teacher CONTEXT.md rule that the Desk "is not the assistant page" and that Today must avoid "oversized assistant panels." The desk becomes three zones: left = the Reply/Review/Assign task lists, center = the assistant (priority chips → chat → approval-gated action cards), right = a thin per-task context strip. Work happens in the chat: selecting a task or clicking a priority chip seeds the assistant, which drafts a reply/recap/assignment that Joshua approves or rewrites on the card. The per-mode manual editors (reply textarea, draft editor, assign drill-picker) are removed from the desk; their function moves into the cards. There is one assistant with one shared conversation history (`operator_messages`), powered by the existing `teacher-operator-chat` engine, openable from the desk and (optionally) its dedicated home.

## Considered options

- **Keep the assistant separate (ADR 0001 IA).** Rejected by Joshua: he wants the assistant always present where he works, not on a tab he has to leave the desk for.
- **Summon-on-demand / collapsed-by-default command bar.** Rejected: Joshua wants the chat panel always visible, not summoned.
- **Layout B (chips swallow the task list) / Layout C (full-width assistant).** Rejected: both drop the browsable Reply/Review/Assign lists the glossary protects; C turns Today into a generic chat app, the exact "oversized assistant panel" the old rule guarded against.
- **Embedded assistant, layout A, every action as an editable approval card (chosen).** Keeps the three task lists, makes the assistant the work surface, and renders draft content through markdown (which also fixes the raw-`**`-blob bug that started this).

## Consequences

- The `tutor-chat` engine is NOT used here (it is student/question-specific). The desk reuses `useOperatorChat` + `teacher-operator-chat`.
- Every action card has a full manual-edit escape hatch (blank-and-write your own), so Joshua is never forced to send AI-drafted words; the assistant learns his Voice over time (see Teaching Profile).
- The decorative center cube is removed; the assistant takes the prime center real estate.
- The `teacher-operator-chat` body is `{ messages }` only, so per-task scoping is done by prepending task/student context to the seeded message until/unless an explicit context field is added.
- The dedicated assistant page under Teach (`/teacher/command`) must either become the expanded view of the same assistant or be retired; both must share the one history. (Open follow-up.)
- The "Daily Command Sheet" calm bar still applies: the embedded panel must feel precise and quiet, not like a busy SaaS chat app.
