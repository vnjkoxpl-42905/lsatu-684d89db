# Compact LR Recall and Reading Progress, 2026-10-16

Source commit: `1c247a0c`.

- Hub members/admins no longer see the aggregate progress chart/history in LR Recall. Dashboard keeps its compact summaries. Reading Progress defaults to LR Recall with owned graded-run history, graph and existing report links; Speed Reading retains its statistics, goals and preferences behind a separate activity tab.
- Legacy LR-only accounts retain their sole history panel because they do not have broad Reading Progress access. No grants were widened.
- Compact LR introduction is opt-in, preserving shared defaults, artwork, animations, accents, copy, demonstrations, section chooser and per-section attempts.
- Dashboard/progress loader reuse remains paginated and account-scoped. High-contrast semantic tokens and keyboard tab navigation are supported.
- 169 tests passed across 29 files. Production build and postbuild content guard passed (758 files). Scoped ESLint had zero errors or warnings. Read-only review found no high-confidence bugs.
- Local browser: no aggregate progress on the hub LR page; section chooser works. Reading Progress history is readable in white workspace despite saved dark reader preference. Speed Reading Overview/Charts, Options and pace controls remain accessible. LR and Reading Progress fit 320/600/768/1024/1440 widths without horizontal document overflow. Screenshots and responsive-checks.json in this directory.
- No new microphone, grading/provider calls, assignments, database changes or student impersonation. Generated MCP file changes remain excluded.

## Published and verified

Lovable matched `1c247a0c140f8243bd7b63533e35f8899231a774` before free publication request `c28decb7-a3b5-49c5-aead-2b5a09c51b61`. Custom domain now serves changed asset `/assets/index-Der6UY5S.js`. Signed-in live checks confirmed compact LR hero, no aggregate chart on the hub's LR page, working section chooser, owned LR history in Reading Progress, and Speed Reading Overview/Charts/Options still available. No console errors. Left live LR section chooser open in Codex. Screenshots: live-compact-lr.png, live-reading-progress.png, live-section-chooser.png.
