# Repository Skills

Repository-local Codex skills live here.

When `.claude/skills/` exists, copy important Claude skills into this directory and keep each skill's `SKILL.md` together with its supporting files. Do not place repository-local skills in `.codex/skills/`.

## Available skills

- `pickup/` — start-of-session. Loads LSAT U project state from the Obsidian vault (`wiki/tasks.md` first, then `hot.md`, `dashboard.md`, `index.md`, latest `log.md` entry) and emits a 6-8 line briefing, then waits. Run this before doing LSAT U work so the session has full context with no re-explaining.
- `wrapup/` — end-of-session. Proposes which tasks finished (confirm first), strikes them through in `wiki/tasks.md` with a date so they are never re-run, refreshes `hot.md`, appends a dated `log.md` entry. Run when wrapping up a session.

Both mirror the user-global Claude skills (`~/.claude/skills/pickup`, `~/.claude/skills/wrapup`). The canonical protocol lives in `~/Documents/Obsidian Vault/CLAUDE.md` (Session Start / Session End).
