---
status: accepted
date: 2026-07-27
---

# The Classroom frame is one pathless layout route, and pages join it without changing their URL

Every route drawn in the Classroom frame hangs off a single pathless `<Route element={<ClassroomLayout />}>` in `src/App.tsx`. `/classroom/*` sits under it behind `has_classroom_access`; `/flagged` and `/flagged/:qid` sit under it behind `has_flagged_access`. Each branch keeps its own guard, and no page changes its URL or its position in the rail when it moves into the frame.

This exists because the Review links in the Classroom rail pointed at pages mounted in `StudentShell`. Clicking one tore down the whole page and rebuilt it in a different shell with a different rail, so the rail visibly changed underneath the student.

## Considered options

- **Nest the page under `path="/classroom"`.** Rejected on two counts. React Router forbids an absolute child path that does not begin with the parent's path, so `/flagged` would have to become `/classroom/flagged` — changing the URL, breaking `returnTo=/flagged` handoffs from the drill, and moving the page in a way the design explicitly did not want. It would also inherit `has_classroom_access`, silently changing who can reach it.
- **A second sibling route holding its own `<ClassroomLayout />`.** Rejected after measuring. Two sibling routes each carrying their own layout element make React unmount one and mount the other on navigation, which reproduces the exact remount the change exists to remove. The rail looks identical and is a different DOM node; state, scroll and in-flight fetches are all lost. This was built, measured (`railSurvived: false`), and rewritten.
- **One pathless layout route wrapping every branch (chosen).** React reconciles the same component at the same position across both URL families, so the rail is genuinely the same element before and after. Verified by tagging the sidebar node, navigating, and asserting the tag survives.

## Consequences

- Adding a page to the Classroom frame means moving its `<Route>` under this one parent and nothing else. The URL, the guard and the rail entry all stay as they are.
- Guards move from the layout to the branch. `ClassroomLayout` itself checks only auth and the onboarding `display_name`; it must never gain a feature-flag check, or every page in the frame would inherit it.
- The layout mounts before a branch's guard resolves, so a student without the flag sees Classroom chrome briefly before `ProtectedRoute` redirects. Accepted as cheaper than duplicating the frame per guard.
- "The rail did not remount" is a behavioural requirement, not a visual one. It is not observable in a screenshot, so it needs an explicit DOM-identity assertion in any test covering this frame.
