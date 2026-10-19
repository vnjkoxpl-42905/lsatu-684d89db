# Handoff — VS Code Agent Cockpit (Cowork/Claude → Codex)

Date: 2026-06-17
From: Claude (Cowork)
To: Codex
Branch: `main` (latest pushed commit at handoff time: `50dff9b6`)
Scope: VS Code Agent Cockpit setup only. NOT an app/product change.

---

## Paste-ready Codex kickoff prompt

> You are auditing and finishing the LSAT U "VS Code Agent Cockpit" setup. Read
> `AGENTS.md` and `docs/agent/handoffs/2026-06-17-vscode-cockpit-codex.md` first.
> The cockpit is mostly built and pushed to `main`; your job is to verify it and
> close the open items in the "Remaining work" section, smallest safe change each.
> Audit before editing. Do NOT touch app/product code, auth, routing, Supabase, or
> Lovable plumbing. Do NOT broaden scope. For each open item: confirm current state,
> state the smallest fix, implement only that, then run `npm run lint:changed`,
> `npx tsc --noEmit -p tsconfig.app.json`, and `npm run build`, plus `npm run test`
> if tests are touched. Commit in small conventional commits and push to `main`.
> Items B (security flags) and E (lockfile strategy) need Joshua's decision: surface
> them, do not decide unilaterally.

---

## What is already done (do not redo)

All committed and pushed to `main`. Commit trail:

- `71d3793d` docs(agents): correct stale no-tests gap notes
- `4a44360d` chore(repo): remove byte-identical duplicate files
- `c10524f8` feat(cockpit): add VS Code agent cockpit prompts and handoffs
- `b69f1f0f` fix(cockpit): scope verify-current-lane lint to changed files
- `afaa0fc8` fix(cockpit): give build task 8GB heap to avoid Node 26 OOM
- `ddf4ab24` test(intro-lr): align guided-path order test with current data
- `52cf528d` docs(cockpit): document worktree lanes and setup
- `3576eaeb` fix(test): force NODE_ENV=test in vitest config
- `ca9a6f2d` feat(cockpit): add LocatorJS dev click-to-source
- `50dff9b6` chore(repo): force npm to install devDependencies

Concretely, in place and verified:

1. **`docs/agent/`** — `README.md`, `current-board.md`, `handoffs/` (current-handoff,
   codex-findings, verification-notes), `prompts/` (8 universal prompts),
   `checklists/verification.md`, `worktrees.md`.
2. **`.github/prompts/`** — 8 `*.prompt.md` slash prompts (visual-audit, implementation,
   codex-review, browser-verification, route-audit, mobile-qa, console-error-fix,
   screenshot-to-fix).
3. **`.vscode/`** — `tasks.json` and `launch.json` are TRACKED (force-added past the
   `.vscode/*` gitignore). `settings.json` and `lsatu.code-snippets` are LOCAL-ONLY
   (gitignored) and live only in the main checkout. `extensions.json` expanded to the
   full recommended set.
4. **Tasks** — `dev`, `build` (8GB heap via `NODE_OPTIONS`), `lint`, `lint:changed`,
   `typecheck`, `test`, `playwright`, and `verify-current-lane`
   (= `lint:changed → typecheck → build → test`, sequence).
5. **`scripts/lint-changed.sh`** + `npm run lint:changed` — lints only changed
   `.ts/.tsx` (committed vs origin/main + staged + unstaged + untracked), so the repo's
   pre-existing ESLint debt does not block verify.
6. **`vitest.config.ts`** — forces `process.env.NODE_ENV = "test"` (see env note below).
7. **`.npmrc`** — `include=dev` (see env note below).
8. **Worktrees** — `../LSATU-mainhub` (`cockpit/mainhub`) and `../LSATU-practice`
   (`cockpit/practice`), each with `node_modules` symlinked to the main checkout.
9. **LocatorJS** — `@locator/runtime` wired dev-only in `src/main.tsx` via
   `import.meta.env.DEV` dynamic import; tree-shaken from production (verified absent
   from `dist/`).
10. **MCPs** — Playwright MCP and Chrome DevTools MCP already installed and connected in
    Claude Code (Playwright in Codex too). All 9 recommended VS Code extensions already
    installed.

`verify-current-lane` passes end to end from a cold cache (lint:changed ✓, typecheck ✓,
build ✓, test ✓ — 181 passed / 1 skipped / 0 failed).

---

## Critical environment context (root cause of earlier breakage)

The machine has/had `NODE_ENV=production` leaking into the shell (was set via
`launchctl`, now cleared with `launchctl unsetenv NODE_ENV`). It is inherited by
already-running apps (VS Code, terminals, MCP servers) until they restart.

Two consequences, both now fixed at the repo level so they cannot recur here:

- It made `npm install` prune devDependencies (vite/vitest/eslint). Fixed by
  `.npmrc` `include=dev`.
- It made Vitest pre-bundle React in production mode (no `jsxDEV`), failing 28
  component tests on a cold cache. Fixed by `NODE_ENV=test` in `vitest.config.ts`.

Do not remove either fix. If you run `npm install`, use it as-is (the `.npmrc` handles
dev deps). The worktrees share the main `node_modules` via symlink.

---

## Remaining work (close these, smallest safe change each)

**A. Verify LocatorJS click-to-source actually jumps to source.** Only smoke-tested so
far (dev server boots 200, prod build excludes it). Not verified that Option/Alt+click on
a rendered element opens the file in VS Code. The stack is `@vitejs/plugin-react-swc`
(no Babel), so source mapping relies on React dev source info. Action: boot `npm run dev`
(port 8080), open the app, Option/Alt+click an element, confirm it opens the source in
VS Code. If it does not jump, document it in `verification-notes.md` and flag that the
LocatorJS Chrome extension is the fallback for SWC. Do NOT switch the React plugin to
Babel.

**B. (Needs Joshua) `.vscode/settings.json` security flags.** It carries
`geminicodeassist.agentYoloMode: true` and `claudeCode.allowDangerouslySkipPermissions:
true` (preserved as-is, flagged inline). These bypass confirmation prompts. Surface the
decision; do not change unilaterally. Note: this file is gitignored, so it is local-only.

**C. Worktree branches are stale.** `cockpit/mainhub` and `cockpit/practice` were created
at `ddf4ab24` and do not include the later fixes. If they will be used as live lanes,
rebase each onto `main` (`git -C ../LSATU-mainhub rebase main`). Otherwise leave them as
scratch and note it. Do not force-push shared branches without reason.

**D. Confirm `NODE_ENV` is gone.** After Joshua restarts VS Code/terminal (or reboots),
check `echo $NODE_ENV` in a fresh terminal — should be empty. If it still shows
`production`, hunt the re-setter (a LaunchAgent plist, an installer, or a dev tool). No
shell-profile source was found at handoff time.

**E. (Needs Joshua) Reconcile `bun.lock` vs `package-lock.json`.** `bun.lock` (Jun 12
07:54) is newer than `package-lock.json` (Jun 12 05:22), so npm and bun installs diverge.
The original working `node_modules` was bun-installed; bun is not currently on PATH.
`@locator/runtime` was added to `package.json` + `package-lock.json` but NOT `bun.lock`
(harmless: the LocatorJS import is dev-only and tree-shaken from prod). Decide one package
manager and reconcile. CLAUDE.md says npm is canonical; the timestamps say bun was used
last. Surface; do not switch tooling unilaterally.

**F. Optional polish (only if asked).** First Playwright e2e smoke spec + a `playwright`
npm script (currently `@playwright/test` + `playwright.config.ts` exist but there are no
app e2e specs); Peacock colors per worktree window; terminal-multiplexing one-command
cockpit launch. None are blockers.

---

## Guardrails

- Follow `AGENTS.md`. Audit before editing. Smallest safe change.
- Do NOT touch app/product code, auth, routing, Supabase, or Lovable plumbing
  (`lovable-tagger`, the SW guard in `src/main.tsx`, PWA bits) for cockpit work.
- Do NOT remove the `.npmrc`, the `vitest.config.ts` NODE_ENV line, or the build-task
  heap setting.
- `.vscode/settings.json` and `.vscode/lsatu.code-snippets` are gitignored (local-only).
  `.vscode/tasks.json` and `.vscode/launch.json` are tracked.
- Commit small, conventional, push to `main`. Run `verify-current-lane` after changes.

## Acceptance criteria (job complete when)

- A resolved: LocatorJS click-to-source verified or documented + fallback noted.
- B, E surfaced to Joshua with a clear recommendation.
- C resolved (rebased or explicitly left as scratch with a note).
- D confirmed (`NODE_ENV` empty in a fresh terminal) or re-setter found.
- `verify-current-lane` still green end to end.
- Findings written to `docs/agent/handoffs/codex-findings.md`.
