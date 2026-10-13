# docs/agent — LSAT U Agent Cockpit

This folder is the filesystem-backed coordination layer for the VS Code Agent Cockpit.
The rule is simple: **agents pass context through files here, not through the clipboard.**

## Layout

```
docs/agent/
  current-board.md        # who is doing what right now (one active snapshot)
  handoffs/               # durable agent-to-agent transfers
    current-handoff.md    # the live handoff template, overwritten per task
    recent-changes.diff   # `git diff` artifact for Codex review (generated)
    codex-findings.md     # Codex writes review findings here
    verification-notes.md # browser/MCP/Playwright verification output
  prompts/                # universal markdown prompts (Joshua, Claude, Codex, CLI)
  checklists/             # reusable verification checklists
```

`.github/prompts/*.prompt.md` holds the VS Code-native slash-command versions of the
same prompts. The `prompts/` files here are the universal copies you can paste into any
agent or pipe through the CLI.

## How to use it

1. Before starting parallel work, update `current-board.md` so each lane owns a clear
   scope and no two agents write the same files.
2. When one agent finishes, it writes a handoff into `handoffs/` (use
   `current-handoff.md` as the template) and updates the board.
3. For Codex review, generate the diff artifact, then point Codex at it:
   ```bash
   git diff > docs/agent/handoffs/recent-changes.diff
   ```
   Codex reviews only that diff and writes to `handoffs/codex-findings.md`.
4. Browser/Playwright/MCP verification output goes in `handoffs/verification-notes.md`.

## Conventions

- Keep handoffs boring and concrete: files touched, what changed, what is still wrong,
  exact next instruction, what not to touch.
- Generated artifacts (`recent-changes.diff`) are transient; do not treat them as source.
- This system is for coordination only. It never changes app behavior.
