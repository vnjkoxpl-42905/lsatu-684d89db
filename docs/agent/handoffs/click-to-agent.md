# Click-to-Agent Handoff

- Created: 2026-06-17T09:05:11Z
- Target agent: Codex
- Active file: src/main.tsx
- Manual selection/range/note: lines 1-20: dev-only LocatorJS runtime

## Instruction

Inspect the active file and the manual selection/range/note above. Stay within the
current LSAT U task scope. Do not broaden into unrelated app behavior.

## Context

VS Code tasks can pass the active file via \`src/main.tsx\`, but they cannot pass
the current editor selection text directly. Put the selected line range or pasted
selection summary into the task prompt when running this handoff.
