# Codex Review Findings

Scope is VS Code Agent Cockpit tooling/config/docs/scripts only. Do not broaden into LSAT
U product behavior.

## Reviewed

- Date: 2026-06-17
- Diff / files: cockpit configuration, Playwright e2e, Claude hooks, VS Code task/profile
  docs, worktree docs, automation scripts, final handoff docs.

## Critical issues

- None.

## Medium issues

- LocatorJS runtime is configured, and React source metadata exists in headed Chromium,
  but the SWC runtime click path still cannot resolve clicked elements. This is not fixed
  by installing BlockNote packages or by switching to Babel. Working path is the LocatorJS
  browser extension, documented in `docs/agent/locatorjs.md`.

## Minor issues

- `.vscode/settings.json` still contains local-only security bypass flags. Per the task
  guardrail, they were not changed.
- `bun.lock` remains untouched. npm and `package-lock.json` remain canonical.
- VS Code locked editor groups, user keybindings, browser extension installation, and
  profile imports are user/UI state. Repo-persistable templates and exact manual steps are
  tracked under `docs/agent/`.

## Completed items

- Dev-server blocker fixed by scoping Vite optimizer entries to `index.html`.
- Playwright e2e smoke spec added under top-level `e2e/`.
- `playwright` and `test:e2e` npm scripts added.
- `playwright.config.ts` has `baseURL`, `webServer`, and `trace: retain-on-failure`.
- `vitest.config.ts` explicitly excludes `e2e/**`.
- `verify-full` task added; `verify-current-lane` left unchanged.
- Claude Notification hook and statusline added to committed `.claude/settings.json`.
- Keybinding reference added with verified Codex and Claude command IDs.
- Builder, Reviewer, and Writing profile templates added.
- Peacock color snippets added for `main`, `cockpit/mainhub`, and `cockpit/practice`.
- VS Code compound/background `cockpit:launch` added instead of tmux.
- Click-to-agent handoff automation added with active file plus manual selection/range.
- Integrated browser and locked-lane setup documented.
- `.DS_Store` and Playwright output hygiene added.
- Cockpit worktrees rebased to the current final commit.

## What is correct

- Scope stayed in tooling/config/docs/scripts.
- LSAT U product UI, auth, routing, Supabase, and Lovable app behavior were not changed.
- No BlockNote/demo dependencies were installed.
- `@vitejs/plugin-react-swc` stayed in place.
- `bun.lock` was not modified.
