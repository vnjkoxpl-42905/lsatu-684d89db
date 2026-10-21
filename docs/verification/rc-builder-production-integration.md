# RC builder production integration

Authorized 2026-10-20: implement the consolidated final design and release to main.

Use `rc-builder-final-preview.html` as visual guidance, not as production logic. Keep LR unchanged. Replace the RC setup presentation with one compact dark panel, visible selection mode, count/timing/Show answers, applied filter summary, Customize drill and primary Preview drill. Manual selection shows its actual count and Edit selection.

Use a right drawer for either passage filters or passage search, selection and ordering. Drawer edits are transactional: Apply commits; Cancel, close, Escape and outside dismissal discard. Preserve mode-specific applied filter settings and selected passages hidden by filters. Keep keyboard focus contained and restore the opener. Respect reduced motion and narrow screens.

Preserve real bank loading, owner-scoped history, exposure, strict eligibility acknowledgement, preview invalidation, shortfall acknowledgement, exact inspected launch order/settings, pending launch recovery and saved recipes/fixed snapshots. No draft edit creates a session or records exposure. Keep custom timing and PT validation visible and blocking.

Proof: run RcHubSurface tests and relevant RC regression suites, `npm run typecheck`, `npm run build`; inspect actual component in the classroom host harness at desktop, docked, tablet and 320/390 mobile widths. Verify drawer filters, cancel/apply, selection/order, invalid inputs and real component preview/launch with synthetic adapters. Then inspect final production diff with Claude Opus, maximum two fresh inspection rounds. Prototype inspection is not production approval.

Release: stage only production implementation/tests and this scope record; commit branch, create/attach PR, use safe-push to authorized main. Wait for Lovable latest_commit_sha to equal released HEAD, publish with free deploy_project, then verify changed public index bundle and new production UI marker. Verify signed-in production setup when available. No Edge Functions or paid Lovable agent work.
