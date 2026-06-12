---
name: pickup
description: Load LSAT U project state from the Obsidian vault at the start of a session so a fresh chat knows exactly where to continue. Runs the vault Session Start Protocol and reports open tasks. Trigger with /pickup.
---

Load the current LSAT U / Aspiring Attorneys project state from the Obsidian vault so this session can continue immediately, with no re-explaining from Joshua. Be fast and terse. Do NOT start doing work after this; brief, then wait.

Vault root: `~/Documents/Obsidian Vault/`.

## Steps (in order)

1. Read `wiki/tasks.md` first. This is the living ledger of what is in progress (`## Now`), queued (`## Next`), and finished (`## Done`, struck through). The open items here are the spine of the briefing.
2. Read `wiki/hot.md` (last-session handoff cache).
3. Read `wiki/dashboard.md` (product ground-truth).
4. Skim `wiki/index.md` to learn what pages exist. Do NOT crawl individual pages.
5. Read only the most recent entry in `wiki/log.md`.

Do not read deeper synthesis/concept/plan pages yet. Pull those lazily only when Joshua points at a specific task. The goal is orientation per token, not loading everything.

## Output: a briefing, then stop

Emit 6 to 8 lines, then wait for Joshua. Do not begin work.

```
Where we left off: <1 line from hot.md / tasks.md "Now">
Now (in progress): <the open ## Now items from tasks.md, terse>
Next (queued): <top 1-3 ## Next items>
Open threads: <anything blocking or unresolved>
Hot right now: <the single most recent thing>
Suggested next: <one concrete action>
```

If `wiki/tasks.md` does not exist yet, say so and offer to seed it from hot.md, then fall back to the old 4-line briefing (hot.md, dashboard.md, index.md, log.md).

## Rules

- No em dashes. Terse. Opinionated.
- `raw/` is immutable; never read it for knowledge (read `wiki/`).
- This is scoped to LSAT U work only.
- End by waiting. `/wrapup` is the mirror skill for session end.
