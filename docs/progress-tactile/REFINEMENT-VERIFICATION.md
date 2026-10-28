# Local Progress refinement: actual verification

2026-10-28. This is a demonstration prototype, not a published change. No signed-in student account or RLS verification is claimed.

## Checks that passed

- `npm run typecheck`: final exit 0.
- Focused Vitest run: 45 tests passed across four files. This includes 10 projection tests, 4 first-answer detail tests, 14 prototype model tests and 17 interaction tests.
- `npm run build`: exit 0, 7,950 modules, final build duration 1m 14s. The postbuild scan checked 783 files and found no canonical guide content.
- Production exclusion: no emitted `progress-prototype.html`; no preview, fixture or new chart markers in dist JavaScript, HTML or CSS.
- CSS PostCSS parsing and `git diff --check` passed.

Full typecheck, test and build logs are in `verification/refinement/`. The build passed before the final DEV-only list, focus and interval-caption fixes. Production source did not change afterward. Those final fixes passed typecheck and tests; no later production build is claimed.

Existing build warnings remain: large chunks, mixed static/dynamic imports, ambiguous Tailwind duration utilities and an unresolved noise.png reference. No new runtime dependencies or lockfile changes.

Vite generated unrelated `supabase/functions/mcp/index.ts` collateral. It was clean before building, then restored with a file-scoped checkout of base `dbf78f7e68f995e68cdbe9fa1d83337f9d386ad2`. No backend changes remain.

## What was exercised in the browser

CUA rendered all three designs at measured CSS widths 1441, 1024, 768 and 390. No horizontal document or main overflow was observed. A requested 320px width was clamped to 358px by this browser; only 358px is claimed as checked. Screenshots are in `verification/refinement/`.

- Selected Weaken from the focus suggestion, filtered its 7 missed and 6 correct records, and retained the 13-question denominator and 46% result.
- Final Flaw desktop/phone screenshots show 3 missed records, with 10 correct of 13 and 77% retained above.
- Opened saved records, verified inspector focus, then verified Close returns focus to the exact opener.
- Explicitly expanded 10 correct records and opened the ninth row, PT 101 Section 2 Question 8. All 10 rows remained mounted during inspection; Close returned focus to that connected ninth row. A regression test covers this case.
- Exposed every type through Show all types, selected Strengthen, then confirmed its selected row remained visible when collapsing the compact list.
- Selected a count-chart interval and inspected its corresponding records. Changed 30 to 7 days, switched LR/RC, and confirmed selection resets. Timeline has its own subject control; selecting RC retained focus on that control and showed 15 first answers.
- Inspected exact Toronto interval times. The first 7-day-window interval showed Oct 20, 11:00 PM EDT to Oct 22, 3:00 AM EDT, with explicit end ownership. Adjacent intervals can share a calendar date.
- Filtered phone History to 12 repeats; opened a repeat and saw first-answer and repeat chronology. Records outside the chosen period are explicitly included in that chronology.
- Exercised partial-source, empty, sparse, loading and error demo states. Affected LR percentages, recommendations and charts were withheld; unaffected RC remained available. Sparse 2/2 and empty 0/0 displayed no percentage.
- Used keyboard Tab with a visible focus outline and the Alt+Right design shortcut. Reduced-motion emulation produced 0s transition and no transform on chart controls.

The initial tablet chart aside was cramped. The layout was changed to provide a full-width chart through 900px, then re-inspected. Phone scrolling through records, detail, method and chart was exercised. Natural selection and click feedback were observed, but no video timing or assistive-technology audit is claimed.

## Review and remaining limits

Two Claude plan rounds produced approval for the recorded plan hash. Two fresh Claude implementation inspections returned REVISE and led to fixes. The final inspection result is `C:/Users/Joshu/AppData/Local/Temp/claudex-cnx4ujs7/result.json`.

All reported findings were addressed. The last expansion/focus, compact-list and interval-label fixes were host-tested, but were not independently re-inspected after the two-inspection budget was used. No independent approval of the final source is claimed. Full responses and dispositions are preserved in `REFINEMENT-REVIEW-LOG.md`.

Two research agents used Firecrawl and primary sources. Tavily was unavailable. 21st MCP catalog scouting succeeded, but code retrieval hit its daily quota. No 21st code was imported, no quota bypass or upgrade occurred, and no rendered reference interaction is claimed from source-text research alone.

The preview uses demonstration data and contextual static navigation. Full-question review and new-practice launches are explicitly unconnected. No commits, push, merge, deployment, assignments or backend writes occurred.
