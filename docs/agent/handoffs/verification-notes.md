# Verification Notes

Browser / Playwright / MCP verification output lands here.

## Target

- Route/surface: LSAT U app shell / VS Code Agent Cockpit local dev loop
- Local URL: http://localhost:8080
- Tool used: Vite dev server, curl, Playwright

## Result

- Pass / fail: Pass for dev-server startup and local app load. LocatorJS runtime loads,
  but automated Alt-click did not prove editor source-jump in headless Playwright.

## Evidence observed

- 2026-06-17: `npm run dev` started Vite 5.4.19 on `http://localhost:8080` without the
  prior BlockNote/demo dependency scan failure from
  `references/notion-high-end/BlockNote/examples/**`.
- `curl -I http://localhost:8080/` returned `HTTP/1.1 200 OK`.
- Playwright loaded `/` with status 200, title `LSATU`, and visible H1
  `Master the LSAT.Own your future.`
- Playwright observed the dev-only LocatorJS runtime request:
  `/node_modules/.vite/deps/@locator_runtime.js?...`.
- `echo $NODE_ENV` returned empty.
- `npm run lint:changed` linted `vite.config.ts` and exited 0.
- `npx tsc --noEmit -p tsconfig.app.json` exited 0.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` exited 0 in 2m39s.
- `npm run test` exited 0 with 37 test files passed, 181 tests passed, 1 skipped.
- `git worktree list --porcelain` showed `main`, `cockpit/mainhub`, and
  `cockpit/practice` all at the final cockpit commit after rebasing the worktrees.

## Console errors / warnings

- The automated Alt-click probe produced:
  `[LocatorJS]: Could not find element info. Element: JSHandle@node`.
- This is consistent with the known risk that `@vitejs/plugin-react-swc` may not expose
  source metadata in the way LocatorJS runtime needs for every element. Do not switch
  React tooling from SWC to Babel for cockpit work.
- Fallback: use the LocatorJS browser extension for click-to-source if the runtime
  overlay cannot jump directly in VS Code.
- Existing Tailwind ambiguity warnings for arbitrary `duration-*` and `ease-*` classes
  still appear during Vite/Tailwind processing. They are unrelated to this cockpit fix.

## Failed network requests

- None found for the root app load during the Playwright smoke check.

## Screenshots / snapshots

- Not captured for this tooling-only pass.

## Next fix target if failing

- No immediate app-code fix. If source-jump remains unreliable in manual VS Code testing,
  install/use the LocatorJS browser extension and keep the runtime as a best-effort
  dev-only helper.
