# RC builder simplification

2026-10-20. Local implementation, not published.

The live LR builder was inspected in the Codex browser. Its compact configuration panel, optional filters, and Preview rail informed this design. The requested rc_builder_simple_concept.html was not found in the checkout or Downloads during a bounded search.

The RC builder now has a single heading, a compact passage-selection switch, labelled Timing and Reveal answers selects, and passage count beside Preview/Start. Detailed filters, presets, timing defaults, search tools, status/adaptive explanations and saved setups remain available behind disclosures. Current status and PrepTest scope remain visible. Blocking exposure choices and invalid ranges open their required controls automatically.

The palette follows LR: #09090b base, #18181a panels, #111113 controls, #38383a borders, #efefed primary text and #b6b6b3 secondary text. Existing Outfit typography is retained. A two-column configuration/summary layout becomes one column on narrow containers. Native selects and visible focus rings retain keyboard access.

## Verification

- 560 RC and LR builder tests passed across 55 files, including 84 RcHubSurface tests.
- Typecheck passed. Production build and content checks passed; pre-existing dependency-age and bundle-size warnings remain.
- Codex browser used actual RcHubSurface and CSS in the classroom/student-destination/drill host wrapper, with local fixture identity, passage bank and backend. No production student attempts were created.
- Desktop 1440x1000, mobile 390x844, minimum 320px, tablet 768px and normal docked browser were checked. No horizontal overflow; mobile select text computes to 16px with at least 44px controls.
- Computed primary text rgb(239,239,237), panel rgb(24,24,26), and sentence-case heading verified inside the host wrapper.
- Invalid 0:00 custom pace blocks Preview. Valid 6:30 and end-of-drill review produced a two-passage/seven-question preview. Fixture launch readback retained both exact IDs, end_of_set and 390 seconds per passage.
- Preview hides passage text and answers. Preview failure preserves configuration, shows an error and retains Preview rather than offering Start.
- Manual add/remove, selected order controls, advanced filters and saved-setup disclosure were exercised. Existing tests cover exposure tracking, preview invalidation, shortfall, account scoping, saved recipes and launch recovery.
- Read-only review found no major functional regression. Original standalone h1 was retained.

Preview: http://127.0.0.1:8096/docs/verification/rc-builder-simple-preview.html

Screenshots: rc-builder-simple-desktop.jpg and rc-builder-simple-mobile.jpg.

This verifies local UI and fixture-backed behavior. It does not establish signed-in production backend acceptance.

## Manual picker correction

Joshua clarified that the manual passage picker was the main source of overload. Its initial view now leads with a search field, a compact Filters disclosure and the passage list. Timing and answer review move to a closed Drill settings disclosure in the summary rail. The disabled manual count stepper is removed. Selected passage management appears only after adding passages and starts collapsed.

Rows show a prominent title, one quiet address/question-count line and Add. Opening text and topic/format/difficulty/history metadata remain accessible through native Passage details disclosures. Pagination now shows 12 rows and the nested catalogue scrollbar is removed.

The Codex browser verified search/add/clear-search retaining selected items, two-passage selection, reordering through the secondary disclosure, optional settings, exact preview and fixture launch readback with source manual, IDs 1188/1189, end_of_set and 525 seconds per passage. Required invalid settings still open their controls. Initial settings and row details are collapsed. Narrow 320px/390px, mid 768px and wide 1440px layouts were checked with no horizontal overflow.

Manual preview: http://127.0.0.1:8096/docs/verification/rc-builder-simple-preview.html?builder=manual

Manual screenshots: rc-builder-manual-desktop.jpg and rc-builder-manual-mobile.jpg. No production launch or publication was performed.
