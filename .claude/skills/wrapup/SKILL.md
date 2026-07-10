---
name: wrapup
description: Close an LSAT U session by updating the Obsidian vault so the next chat picks up cleanly. Marks finished tasks done (struck through) in the task ledger, refreshes the handoff cache, and appends to the log. Trigger with /wrapup.
---

Close the current LSAT U / Aspiring Attorneys session. Leave the next session a clean, accurate handoff and mark completed work as done so it is never re-run. Vault root: `~/Documents/Obsidian Vault/`.

## Step 0: read the anchor

Before writing anything, re-read `wiki/tasks.md` and `wiki/hot.md` so the handoff reflects the real goal, not just the last thing touched. If a `plans/` file or README framed this session, skim it too.

## Step 1: propose task changes, then CONFIRM (do not write yet)

From this session (commits made, files shipped, what actually got done), build a proposal and show it to Joshua before touching files:

```
Proposing for wiki/tasks.md:
  -> Done (strike through): <items you believe are finished this session>
  -> Stays in Now: <still in progress>
  -> New Next: <anything surfaced that should be queued>
```

Wait for Joshua to approve or correct in one line. Completion MUST be correct: a wrong "Done" is the exact failure this prevents. Do not mark something done on a guess; if unsure, leave it in Now and say so.

## Step 2: write the vault (after approval)

1. **`wiki/tasks.md`** — move approved finished items into `## Done`, wrapping each in `~~...~~` with a date, e.g. `~~Wire AI tutor into official drill surface~~ (2026-06-12)`. Update `## Now` and `## Next` to be true as of now. Keep `## Done` to the most recent ~15 items; older ones are already captured in `wiki/log.md`.
2. **`wiki/hot.md`** — rewrite the `## Most recent (YYYY-MM-DD): <title>` block with 4 to 8 bullets of what changed. Refresh `## Active priorities` and `## Open threads` so they are true now.
3. **`wiki/log.md`** — append a new dated entry at the TOP of the entries, newest first: `## YYYY-MM-DD (<short label>)` with a short bullet list. Append-only; never edit older entries. Multiple sessions per day are normal, so make the label distinct (`(session 2: ...)` or `(pm: ...)`). Never overwrite an earlier same-day entry.
4. **Task anchor** — if a README, plan, or wiki page advanced, make a surgical status update. Touch only what changed.

## Step 3: confirm, then stop

```
Handed off: <1 line headline of this session>
Tasks: <N marked done, M still in Now>
Logged: <the wiki/log.md entry label you added>
Next session starts at: <the top open item in tasks.md / hot.md>
```

## Rules

- No em dashes. Terse. Surgical changes only (Karpathy: touch only what changed).
- `raw/` is immutable; never write there.
- `/pickup` is the mirror skill for session start.
