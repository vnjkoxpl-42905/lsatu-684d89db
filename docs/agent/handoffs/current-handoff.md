# Current Handoff

Overwrite this per task. It is the live transfer between Claude, Codex, and Joshua.

## From

Codex

## To

Joshua / next agent

## Task

LSAT U VS Code Agent Cockpit full completion

## Route or surface

Developer tooling only: VS Code cockpit, Vite dev loop, Playwright e2e, Claude hooks,
worktree lanes, handoff automation.

## Files touched or inspected

- `playwright.config.ts`, `vitest.config.ts`, `e2e/smoke.spec.ts`, `package.json`
- `.vscode/tasks.json`, `.vscode/launch.json`, `.vscode/extensions.json`
- `.claude/settings.json`, `.claude/notify-hook.sh`, `.claude/statusline.sh`
- `scripts/cockpit-status.sh`, `scripts/click-to-agent-handoff.sh`
- `docs/agent/**`
- `../LSATU-mainhub`, `../LSATU-practice`

## What changed

- Playwright e2e now lives in top-level `e2e/`, runs through `npm run test:e2e`, starts
  or reuses Vite on `http://localhost:8080`, and retains traces on failure.
- `verify-full` now runs `lint:changed -> typecheck -> build -> test -> test:e2e`.
- LocatorJS is configured with the React adapter and explicit VS Code URL target. Headed
  verification confirmed React source metadata exists, but the SWC runtime click path
  cannot reliably resolve clicked elements; the documented working path is the LocatorJS
  browser extension.
- Claude Code repo settings now include a committed Notification hook and statusline.
- Keybindings, Builder/Reviewer/Writing profile templates, Peacock worktree color snippets,
  integrated browser layout, and locked-lane instructions are tracked under `docs/agent/`.
- `cockpit:launch` starts the dev server, Vitest watch, and status pane through VS Code
  compound/background tasks because `tmux` is not installed.
- `click-to-agent` captures the active file plus a manual selection/range/note argument
  into `docs/agent/handoffs/click-to-agent.md`.
- `.DS_Store`, nested `.DS_Store`, `test-results/`, and `playwright-report/` are ignored.
- `../LSATU-mainhub` and `../LSATU-practice` were rebased onto the final cockpit commit.

## What is still wrong

- No Core Cockpit item remains intentionally optional/later.
- Repo code cannot install a Chrome Web Store extension or persist VS Code locked editor
  group UI state. Exact manual steps are documented in `docs/agent/locatorjs.md` and
  `docs/agent/browser-layout.md`.

## Evidence

- `npm run test:e2e`: passed after filtering pre-existing known question-loader warnings.
- Trace-on-failure: confirmed by the initial failing e2e run, which wrote
  `test-results/.../trace.zip`.
- LocatorJS headed probe: React fiber `_debugSource` existed for a rendered element at
  `src/pages/Auth.tsx:427`; runtime Alt-click still logged `[LocatorJS]: Could not find
  element info. Element: JSHandle@node`.
- Claude statusline manual check returned `Fable | main | LSATU | ctx 42%`.
- Claude notification hook exited 0 through `osascript`.
- `cockpit-status.sh`: ran and showed branch, HEAD, worktrees, and tracked changes.
- `click-to-agent-handoff.sh`: wrote `docs/agent/handoffs/click-to-agent.md`.
- `git worktree list --porcelain`: `main`, `cockpit/mainhub`, and `cockpit/practice`
  all point at `4fd352536560b6f4dafc112ae9aa8302f216600f`.

## Exact next instruction

Use `cockpit:launch` for the local operator cockpit, `verify-full` before high-confidence
handoffs, and `click-to-agent` when sending active-file context to Claude or Codex.

## Do not touch

- LSAT U product UI or behavior
- Auth, routing, Supabase, or Lovable app plumbing
- BlockNote/demo dependencies
- `bun.lock`
- Local-only `.vscode/settings.json` security flags

## Verification needed

Final full sweep after this handoff update:

- `npm run lint:changed`
- `npx tsc --noEmit -p tsconfig.app.json`
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
- `npm run test`
- `npm run test:e2e`
- `git worktree list --porcelain`
- `echo $NODE_ENV`
