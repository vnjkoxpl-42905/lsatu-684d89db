# RC builder production integration

Authorized 2026-10-20: implement the consolidated final design and release to main.

Use `rc-builder-final-preview.html` as visual guidance, not as production logic. Keep LR unchanged. Replace the RC setup presentation with one compact dark panel, visible selection mode, count/timing/Show answers, applied filter summary, Customize drill and primary Preview drill. Manual selection shows its actual count and Edit selection.

Use a right drawer for either passage filters or passage search, selection and ordering. Drawer edits are transactional: Apply commits; Cancel, close, Escape and outside dismissal discard. Preserve mode-specific applied filter settings and selected passages hidden by filters. Keep keyboard focus contained and restore the opener. Respect reduced motion and narrow screens.

The picker must allow its own draft passage filters to be adjusted before any selection is made, including when every passage has already been attempted. A compact Filter passages disclosure may reuse the same passage-filter controls inside the selection context. It must not duplicate selection-mode or Show answers controls. Keep closing content stable during the exit animation, and only announce selection changes in the picker. Mobile form controls use 16px text to avoid focus zoom. Automatic shortfall hints require a successfully loaded nonempty catalogue and never describe manual selections. Hidden graded results receive a concise visible disclosure.

Preserve real bank loading, owner-scoped history, exposure, strict eligibility acknowledgement, preview invalidation, shortfall acknowledgement, exact inspected launch order/settings, pending launch recovery and saved recipes/fixed snapshots. No draft edit creates a session or records exposure. Keep custom timing and PT validation visible and blocking.

Proof: run RcHubSurface tests and relevant RC regression suites, `npm run typecheck`, `npm run build`; inspect actual component in the classroom host harness at desktop, docked, tablet and 320/390 mobile widths. Verify drawer filters, cancel/apply, selection/order, invalid inputs and real component preview/launch with synthetic adapters. Then inspect final production diff with Claude Opus, maximum two fresh inspection rounds. Prototype inspection is not production approval.

Release: stage only production implementation/tests and this scope record; commit branch, create/attach PR, use safe-push to authorized main. Wait for Lovable latest_commit_sha to equal released HEAD, publish with free deploy_project, then verify changed public index bundle and new production UI marker. Verify signed-in production setup when available. No Edge Functions or paid Lovable agent work.

## Inspection evidence and boundaries

Inspect only the production diff in `src/features/rc/components/RcHubSurface.tsx`, its test file, and `src/features/rc/rc.css`. Historical untracked concepts and screenshots are background, not shipped application code. The static final HTML is design guidance only. Evidence screenshots are outside the checkout: `C:/Users/Joshu/AppData/Local/Temp/rc-production-desktop.jpg`, `rc-production-drawer.jpg`, `rc-production-mobile.jpg`. The host exercised the actual component with synthetic adapters, including exact inspected launch, filters, ordering, cancellation, validation, focus return and reduced motion. The browser confirmed no horizontal overflow at 320, 390, 768, 1013 and 1440 CSS pixels. Production authenticated setup is accessible and will be checked after publication; no real student attempt is created for verification.
