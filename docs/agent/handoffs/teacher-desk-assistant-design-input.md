# Handoff to Codex — Teacher Desk AI Assistant (design input requested)

- Created: 2026-06-18
- From: Claude + Joshua
- To: Codex
- Status: **NEEDS FULL CONTEXT. Design input requested BEFORE we write the final spec. Do NOT implement yet.**

## Read this first (you need the full context)

This is not a code task yet. Joshua wants your independent design input before we lock a final spec. To give useful input you must load the full context. Read, in order:

1. This file (the conversation arc + decisions).
2. `docs/adr/0003-teacher-desk-embeds-ai-assistant.md` — the decision record.
3. `docs/superpowers/plans/2026-06-18-teacher-desk-terminal-assistant.md` — the locked gameplan.
4. `docs/superpowers/specs/2026-06-18-teacher-desk-claude-inspection.md` — the prior inspection that started this.
5. `src/pages/teacher/CONTEXT.md` — the teacher glossary (note the updated Command / Daily Command Sheet / AI Teaching Assistant entries).
6. Code: `src/pages/teacher/desk/` (esp. `TeacherDeskPreview.tsx`, `WorkSurface.tsx`, `AssistantCommandLine.tsx`, `DeskCube.tsx`, `deskTasks.ts`), `src/hooks/useOperatorChat.ts`, `src/components/teacher/ai-ta/OperatorChat.tsx` + `ActionCard.tsx`, `supabase/functions/teacher-operator-chat/`.
7. Visual mockup (throwaway, currently live): `public/desk-lab.html` at `http://localhost:8080/desk-lab.html` — toggle A/B/C layouts.

## What we are working on

The Teacher Desk at `/teacher` (Soft Graphite "Today" surface: Reply / Review / Assign). The trigger: the Review draft card was low quality (raw markdown blob `**Monday...**`, duplicated text, clipped editor, no hierarchy). Joshua decided not to just polish it but to **rework the desk around an embedded AI assistant**.

## The decision arc (how we got here, via a grilling session)

Joshua and I ran `/grill-with-docs`. Branch by branch:

- **Q1 — assistant on the desk at all?** The glossary deliberately kept the AI Teaching Assistant *off* the Desk ("Desk is not the assistant page"). Joshua chose to **override it**: the assistant belongs on the desk.
- **Q2 — visible how?** I recommended collapsed/summon-on-demand to protect the "no oversized assistant panel" rule. Joshua chose **always visible**.
- **Q3 — layout / what it displaces?** Chose **Layout A**: assistant takes the center, the decorative cube is removed.
- **Q4 — how tasks complete?** Work happens **in the chat**, via **priority chips** (top desk tasks) that seed the assistant and return **approval-gated cards**. (Joshua showed a ChatGPT-style suggestion-chips reference + a recent-chats reference.)
- **Q5 — side columns?** Confirmed **Layout A**: keep left Reply/Review/Assign lists, center assistant, right thin context strip.
- **Q6 — AI-draft vs write-your-own?** Chose **B**: AI drafts by default, but every card has a blank-and-write escape hatch, so Joshua is never forced to send AI words.

Backend resolved: reuse **`teacher-operator-chat` + `useOperatorChat`** (one shared history, reopenable recent chats). NOT `tutor-chat` (student/question-specific). The existing `OperatorChat` already does chat + markdown + file attach + approval-gated `ActionCard`s, but is dark zinc/amber — reuse the hook + ActionCard logic, restyle to graphite.

Glossary + ADR were updated inline to match (the IA reversal is recorded in ADR 0003).

## Locked design (subject to your input)

Three zones:
- **Left (300px):** Workspace rail + Reply / Review / Assign task lists + Next.
- **Center:** the AI Teaching Assistant — priority chips row → chat transcript → approval cards → command input. Always visible. Cube gone.
- **Right (320px):** thin read-only context strip (student + source). No action buttons (approve moves into the cards).

Selecting a task or clicking a chip seeds the assistant; it drafts a reply/recap/assignment; Joshua approves or rewrites on the card. Markdown rendering fixes the original blob bug for free.

## Open follow-ups (still undecided)

1. Fate of the dedicated assistant page `/teacher/command` (`TeacherAITA`): becomes the expanded view of the same assistant, or retires? Must share one history.
2. Per-task context injection: `teacher-operator-chat` body is `{ messages }` only today. First slice prepends task/student context to the seeded message; explicit `context` field later?
3. Mobile stacking of the 3-zone layout.

## What we want from you (the ask)

Give your **independent design input before we finalize the spec.** Specifically:

- **Push back on the big call:** is embedding an always-visible assistant on the Desk the right move, or does it risk turning Today into a chat app (the thing the old rule guarded against)? If you'd do it differently, say so concretely.
- **Layout A critique:** better arrangements? Does the right context strip earn its space? Should chips and the left list coexist or is that redundant?
- **Interaction model:** the chip → seed → editable approval card → approve flow. Failure modes? Anything slower than it should be? Better patterns for the "write it myself" path?
- **Reuse vs build:** any reason `teacher-operator-chat` / `useOperatorChat` / `ActionCard` won't carry this cleanly? Gaps you foresee (context scoping, streaming, history UI)?
- **The three open follow-ups** above — your recommendation on each.
- **Anything we're missing** — edge cases, the transcript→recap pipeline interaction, mobile, performance, scope creep risk.

Write your input back as a doc in `docs/agent/handoffs/` (e.g. `teacher-desk-assistant-codex-input.md`) or append a section here. **We are waiting on your input before writing the final design spec. Do not start implementation.**
