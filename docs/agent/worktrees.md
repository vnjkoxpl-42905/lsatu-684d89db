# Worktrees — parallel agent lanes

Git worktrees let multiple agents edit the repo at once without colliding, because each
lane is a separate checkout on its own branch. They share one `.git`, so commits/branches
are visible from any worktree.

## Current lanes

| Folder | Branch | Intended use | Peacock color |
|---|---|---|---|
| `LSATU` (this folder) | `main` | Source of truth. Merge target. Auto-deploys via Lovable. | `#2f6f5e` green |
| `../LSATU-mainhub` | `cockpit/mainhub` | Builder lane (Claude) — heavier feature work | `#315f9f` blue |
| `../LSATU-practice` | `cockpit/practice` | Reviewer / second lane (Codex or a second Claude) | `#6f4aa8` purple |

Only `main` auto-deploys. The `cockpit/*` branches are scratch lanes; nothing ships until
you merge into `main`.

## Setup notes

- `node_modules` is gitignored, so each worktree symlinks the main one:
  `../LSATU-<lane>/node_modules -> ../LSATU/node_modules`. Build/lint/test work immediately.
- Committed `.vscode/tasks.json`, `launch.json`, and `extensions.json` are present in every
  worktree. `settings.json` and snippets are local-only (gitignored), so they live only in
  the main folder.
- Peacock snippets are tracked in `docs/agent/worktree-settings/`. Copy the matching
  snippet into that worktree's local `.vscode/settings.json` without removing existing
  security-bypass flags or other local-only settings.
- Caveat: running two `npm run dev` servers at once shares Vite's `node_modules/.vite` cache
  and can trigger re-optimization. If that bites, run `npm install` inside a worktree to give
  it isolated deps, or run dev in only one lane at a time.

## Workflow

1. Open each worktree in its own VS Code window.
2. Give each window its lane color from the table above. Either use Command Palette →
   "Peacock: Enter Color" or copy the relevant snippet from `docs/agent/worktree-settings/`
   into that worktree's local `.vscode/settings.json`.
3. One agent per lane. One functional area per lane for the duration of a task.
4. Hand off through `docs/agent/handoffs/`, not by both agents editing the same files.
5. Merge or cherry-pick into `main` yourself; agents do not co-own a branch.

## Managing worktrees

```bash
git worktree list                      # see all lanes
git worktree add ../LSATU-admin -b cockpit/admin main   # add a lane
git worktree remove ../LSATU-admin     # remove a lane (must be clean)
git worktree prune                     # clean up stale entries
git branch -d cockpit/admin            # delete the branch after removing
```
