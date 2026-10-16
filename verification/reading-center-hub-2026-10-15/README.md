# Reading Center activity hub verification

Date: 2026-10-15. App commit: b6e09031c9cc34398828e3961f5e1a1ed212c529.

## Confirmed scope

Two independent Reading Center activities: Read, Recall, Colour and Speed Reading. Separate collections. Existing RRC sections, recordings, attempts, results and assignability remain. Existing reader URLs and imported Speed Reading passages remain. New RRC runner/report addresses preserve original assignment identifiers; legacy RRC routes retain query/hash/launch state.

## Checks completed

- `npm run typecheck`: passed, including safe-push gate on the committed checkout.
- `npm run build`: passed after the final phone-layout change; postbuild canonical-content check passed (759 dist files).
- Reading Center, ReadingCenterGate and narrow RRC gate suite: 20 files, 104 tests passed. Log: tests.log.
- Existing/new RRC navigation, resume, report, redrill and ownership checks passed in worker suites; additional exit tests cover legacy individual-only and library-only assignments with no hub grant.
- SectionProgress existing suite: 5 tests passed after changing the chart layout to fit 42 runs on a phone.
- Scoped ESLint for new hub/RRC/navigation/access-test files: passed.
- Source diff whitespace check: passed. Review found and fixed legacy exits into locked routes; second review confirmed the fix.
- Signed-in administrator in running local app: opened both hub cards; existing RRC collection showed 42 graded runs; reopened saved report dcf39d3a-279f-4f9b-8d2d-f856356120ba with retained report/transcript; Done returns to RRC; library returns to hub. No new microphone recording or paid ASR/grading calls were made.
- Existing Plants and Geological Time Speed Reading passage opened; Back to library returns to speed-reading. All three imported titles remain in Speed Reading.
- Legacy `/activities/sections?from=legacy#sections` redirected to `/reading-center/rrc?from=legacy#sections`.
- Hub + RRC tested at widths 320, 600 (side panel), 768, 1024 and 1440. Corrected the progress-chart horizontal overflow at 320. Corrected measurements and screenshots in responsive-checks.json and hub/rrc-width PNG files. Viewport override reset afterward.
- Keyboard Enter on Open RRC opens the RRC collection. Preview error-console readback: no errors.

## Publication

GitHub main updated through .claude/safe-push.sh. Lovable latest_commit_sha matched b6e09031 before publishing. Free publish operation returned pending deployment 21d82876-ca54-4618-a76f-f3a6b757779f. Production verification is recorded separately after the changed custom-domain bundle/UI is observed.

## Explicit limits

Signed-in browser checks used the legitimate teacher account, not Celia impersonation. Student access boundaries were tested with isolated mocked account/gate cases and the real saved assignment was previously verified. Fresh microphone recording and grading were not rerun because their implementation is unchanged. Local screenshots/logs remain outside the source commit.

## Production verified

Custom domain served changed module `/assets/index-BmB1aNAc.js` with new RRC attempt route. Signed-in teacher opened the live two-card hub, entered RRC and loaded real sections (including PT101.S2), returned to hub, entered Speed Reading and confirmed all three imported titles, then returned to the hub. `live-hub.png`, `live-rrc.png`, `live-speed-library.png` and `release.json` record this check. The production view is verified, not inferred only from GitHub or publish acknowledgement.
