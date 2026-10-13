# Verification Notes

Browser / Playwright / MCP verification output lands here.

## Target

- Route/surface: LSAT U app shell / VS Code Agent Cockpit local dev loop
- Local URL: http://localhost:8080
- Tool used: Vite dev server, curl, Playwright, headed Chromium, Claude hook scripts,
  cockpit shell scripts

## Result

- Pass / fail: Pass for dev-server startup and local app load. LocatorJS runtime is
  configured for React + VS Code, but the SWC runtime click path still cannot resolve
  clicked elements reliably; the LocatorJS browser extension is the working path.

## Evidence observed

- 2026-06-17: `npm run dev` started Vite 5.4.19 on `http://localhost:8080` without the
  prior BlockNote/demo dependency scan failure from
  `references/notion-high-end/BlockNote/examples/**`.
- `curl -I http://localhost:8080/` returned `HTTP/1.1 200 OK`.
- Playwright loaded `/` with status 200, title `LSATU`, and visible H1
  `Master the LSAT.Own your future.`
- Playwright observed the dev-only LocatorJS runtime request:
  `/node_modules/.vite/deps/@locator_runtime.js?...`.
- 2026-06-17 headed Chromium verification confirmed React fiber `_debugSource` metadata
  exists on rendered elements, including `src/pages/Auth.tsx:427`.
- 2026-06-17 headed Option/Alt-click still produced `[LocatorJS]: Could not find element
  info. Element: JSHandle@node`; use the LocatorJS browser extension for reliable
  click-to-source in this SWC app.
- `echo $NODE_ENV` returned empty in the shell used for verification. Final cockpit
  checks should repeat this inside a restarted VS Code integrated terminal, because the
  earlier `NODE_ENV=production` leak was inherited by already-running apps until restart.
- `npm run lint:changed` linted `vite.config.ts` and exited 0.
- `npx tsc --noEmit -p tsconfig.app.json` exited 0.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` exited 0 in 2m39s.
- `npm run test` exited 0 with 37 test files passed, 181 tests passed, 1 skipped.
- `git worktree list --porcelain` showed `main`, `cockpit/mainhub`, and
  `cockpit/practice` all at the final cockpit commit after rebasing the worktrees.
- `npm run test:e2e` exited 0 with 1 Chromium smoke test passed.
- Initial e2e failure generated a retained Playwright trace at
  `test-results/.../trace.zip`, confirming trace-on-failure behavior.
- `.claude/statusline.sh` manual check returned `Fable | main | LSATU | ctx 42%`.
- `.claude/notify-hook.sh` manual check exited 0 through macOS `osascript`.
- `scripts/cockpit-status.sh` ran and printed branch, HEAD, worktrees, and tracked-change
  status.
- `scripts/click-to-agent-handoff.sh` wrote
  `docs/agent/handoffs/click-to-agent.md` from active-file and manual-selection inputs.

## Console errors / warnings

- The automated and headed Alt-click probes produced:
  `[LocatorJS]: Could not find element info. Element: JSHandle@node`.
- This is consistent with the known risk that `@vitejs/plugin-react-swc` may not expose
  source metadata in the way LocatorJS runtime needs for every element. Do not switch
  React tooling from SWC to Babel for cockpit work.
- Working path: use the LocatorJS browser extension for click-to-source; allow the
  browser to open `vscode://file/...` links when prompted.
- Existing Tailwind ambiguity warnings for arbitrary `duration-*` and `ease-*` classes
  still appear during Vite/Tailwind processing. They are unrelated to this cockpit fix.

## Failed network requests

- None found for the root app load during the Playwright smoke check.

## Screenshots / snapshots

- Not captured for this tooling-only pass.

## Next fix target if failing

- No app-code fix. The browser extension is the required click-to-source path for this
  SWC setup; keep the runtime as a configured dev-only helper.
- For VS Code UI state that cannot be committed, follow `docs/agent/browser-layout.md`,
  `docs/agent/keybindings.md`, and `docs/agent/profiles.md`.
