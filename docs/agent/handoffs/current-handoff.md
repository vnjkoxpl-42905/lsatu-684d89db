# Current Handoff

Overwrite this per task. It is the live transfer between Claude, Codex, and Joshua.

## From

Codex

## To

Joshua / next agent

## Task

LSAT U VS Code Agent Cockpit core completion

## Route or surface

Developer tooling only: Vite dev server, VS Code cockpit handoff docs, cockpit worktrees

## Files touched or inspected

- `vite.config.ts`
- `docs/agent/handoffs/verification-notes.md`
- `docs/agent/handoffs/codex-findings.md`
- `docs/agent/handoffs/current-handoff.md`
- `../LSATU-mainhub`
- `../LSATU-practice`

## What changed

- Vite dependency scanning is scoped to the real app entry so the dev server does not
  crawl nested reference/demo apps under `references/notion-high-end/**`.
- Verification notes now record the dev-server result, app-load result, and LocatorJS
  fallback status.
- Codex findings now record the remaining optional/later cockpit items and local-only
  security/package-manager decisions.
- `../LSATU-mainhub` and `../LSATU-practice` were rebased onto the final cockpit commit.

## What is still wrong

- Nothing blocks the core cockpit dev loop after the Vite scan fix.
- LocatorJS runtime source-jump remains best-effort with the React SWC stack; use the
  LocatorJS browser extension if manual runtime jumps are unreliable.
- Playwright e2e smoke specs, terminal multiplexing, Peacock colors, and custom
  click-to-agent automation remain optional/later.

## Evidence

- Screenshot: not captured for this tooling-only pass.
- Console: automated Alt-click produced `[LocatorJS]: Could not find element info.`
- Network: root app load returned HTTP 200, no failed root-load requests found.
- Playwright: root app load returned title `LSATU` and visible H1.
- MCP: not used for this pass.
- Diff: review the current git diff before commit.

## Exact next instruction

Use `main`, `../LSATU-mainhub`, or `../LSATU-practice` for the next cockpit lane; all
three point at the same final cockpit commit.

## Do not touch

- LSAT U product UI or behavior
- Auth, routing, Supabase, or Lovable plumbing
- BlockNote/demo dependencies
- `bun.lock` during this npm-canonical pass

## Verification needed

- `npm run lint:changed`: passed, linted `vite.config.ts`.
- `npx tsc --noEmit -p tsconfig.app.json`: passed.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`: passed.
- `npm run test`: passed, 37 files / 181 passed / 1 skipped.
- `git worktree list --porcelain`: passed; `main`, `cockpit/mainhub`, and
  `cockpit/practice` all point at the final cockpit commit.
