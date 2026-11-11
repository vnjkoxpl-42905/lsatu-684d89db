# Windows dev machine: setup, pitfalls, test baseline

Verified on Joshua's Windows 11 machine, 2026-11-11, at commit `903d1973`.

## Installed and working

| Tool | Version | Check |
| --- | --- | --- |
| git | 2.56.0 | `git --version` |
| GitHub CLI | 2.103.3 (WinGet) | `gh auth status` |
| Node / npm | 26.13.0 / 11.20.0 | `node -v` |
| Claude Code | 2.1.322 | `claude --version` |
| Project packages | from `package-lock.json` | `npm ls --depth=0` |
| Playwright Chromium | 1217 (Chrome for Testing 147) | `npm run test:e2e` |

`npm run typecheck`, `npm run build` (with `prebuild` and `postbuild` checks) and `npm run test:e2e` all pass here.

## Pitfalls we hit, and the fix

**git cannot authenticate (`gh.exe: No such file or directory`).** `~/.gitconfig` pointed at an old `gh` install path. Fix: `gh auth setup-git`. Check: `git push --dry-run origin HEAD:main` with no prompts.

**`npm run build` fails with `RC authority report hash changed`.** The checkout had CRLF line endings in files git stores with LF, so the sha256 check in `scripts/verify-rc-answer-keys.mjs` no longer matched. Global `core.autocrlf` is `input`, which keeps new checkouts LF. If it recurs, find the offenders with `git ls-files --eol | grep "i/lf *w/crlf"`, convert those working files to LF, then `git update-index --stdin` the paths that have no real diff, so `git status` does not show thousands of phantom modifications.

**`npx playwright install chromium` hangs.** Under Node 26 the unzip step freezes after the download completes. Run the installer under Node 22 instead: `npx -y node@22 ./node_modules/@playwright/test/cli.js install chromium`. If a killed install leaves `%LOCALAPPDATA%\ms-playwright\__dirlock` behind, remove that empty folder once no installer is running.

## Unit test baseline (not caused by this machine)

`npm run test` on 2026-11-11: 765 files, 746 pass, **19 files / 30 tests fail**. The identical set fails on Node 22 and when run in isolation, and no `src/` file differs from `HEAD`, so these are existing failures in the committed code, not environment problems. Two more files fail only under full-suite load (timeouts) and pass alone: `ConditionalOpeningLesson.review.test.tsx` and `AssistantComposer.test.tsx`.

Failing files: `src/pages/PracticeTestRun.test.tsx` (mock missing `CANONICAL_QTYPES`), `src/lib/singleSessionCore.test.ts` (unresolvable Deno `npm:` import from `supabase/functions/_shared/sendAppEmail.ts`), `src/lib/firstAnswerLiveReplay.test.ts`, `src/lib/timedContentManifest.test.ts`, `src/components/booking/BookingOfferHub.test.tsx`, `src/bootcamps/main-conclusion/data/practiceDrillPools.test.ts`, `src/bootcamps/main-conclusion/components/reference-templates/nativeLabSave.test.tsx`, four files under `src/bootcamps/conditionals/components/`, four under `src/features/activity-centre/components/`, and four under `src/features/activity-centre/worlds/switchyard/`.

Use this list as the baseline: a test failing that is not on it is new.
