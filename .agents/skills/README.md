# Repository Skills

Repository-local Codex skills live here.

Activate a skill by **symlinking it out of the vault DB** (`~/ai-os/skills/codex/<name>`), not by copying it. Copies fork: the previous copies of `pickup`/`wrapup` here drifted and kept pointing at the pre-consolidation vault path long after it was dead. Do not place repository-local skills in `.codex/skills/`.

## Available skills

- `pickup/` — start-of-session. Loads LSAT U project state from the Obsidian vault (`wiki/tasks.md` first, then `hot.md`, `dashboard.md`, `index.md`, latest `log.md` entry) and emits a 6-8 line briefing, then waits. Run this before doing LSAT U work so the session has full context with no re-explaining.
- `wrapup/` — end-of-session. Proposes which tasks finished (confirm first), strikes them through in `wiki/tasks.md` with a date so they are never re-run, refreshes `hot.md`, appends a dated `log.md` entry. Run when wrapping up a session.

Both are symlinks into the vault DB (`~/ai-os/skills/codex/{pickup,wrapup}`), so they stay identical to the Claude twins by construction. The canonical protocol lives in `~/ai-os/CLAUDE.md` (Session Start / Session End).
