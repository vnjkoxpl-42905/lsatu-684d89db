# Review the LSAT U student dashboard

You are reviewing an implemented dashboard design, not starting a new visual direction. Open the accompanying `student-dashboard.html` in a browser first. If you cannot render HTML, inspect `student-dashboard.png` and the HTML source, and state that limitation. Do not claim browser or interaction verification from source alone.

## What the attachment represents

This is a self-contained offline export of the current LSAT U student Home presentation, compiled from its actual React components and typed sample-data preview. Fonts, CSS, JavaScript and GSAP are embedded. It has no login and must make no backend requests. Changes inside this export are sample interactions only. It does not establish production authentication, authorization, persistence, assignment freshness, unread receipt behavior or backend correctness.

The companion `teacher-dashboard.html` has a separate role and job. Compare them if it is attached, without importing teacher controls into the student experience. Preserve existing role and permission boundaries.

## The owner's direction

- Keep the approved warm white paper and deep ink contrast. Key colors are canvas `#f7f4ee`, ink `#252b26`, dark action surface `#131718`, action paper `#eeebe2`, and on-dark text `#efede6`. Do not introduce gold decoration, glass effects or arbitrary brand changes.
- Preserve the editorial display type and readable interface type. Use restrained, coherent motion, clear focus and immediate interaction response.
- The primary student job is to understand the next piece of assigned work, resume saved progress, finish it, and understand what remains.
- Show one featured assignment. Do not duplicate that exact instance in Up next. Repeated assignments with different instance keys remain distinct. Total open counts include the featured work.
- Practice tools and supporting context must not push the next assignment down on a phone.
- Joshua specifically liked the sleek calendar strip from the older design. Preserve the next-seven-days concept and explore how to make it visually useful. Do not substitute invented availability, decorative Open/Rest labels, or unsupported events.
- Opening a conversation clears unread only after the displayed incoming message has loaded; replying is a separate action. History must remain available. These backend semantics are requirements to inspect in source, not claims proved by this offline export.
- The full inbox redesign is a separate queued work item. Do not expand this review into unrelated drill builders, lessons, payments, bookings or platform-wide navigation changes.

## Inspect before recommending changes

1. Review the actual rendered full-data page at 1440, 980, 768, 390 and 320 CSS pixels. Check the first viewport and below the fold. Include a narrow content pane equivalent to a docked sidebar.
2. Trace the hierarchy: greeting, primary assignment and progress, Up next, then tools, messages and calendar context. Ask whether the next action is obvious without reading every label.
3. Use the state controls to inspect empty, loading, error, cold-role loading/error and cached-role refresh-error states. Unknown counts must not look like zero. Failed work loads must not say the student is caught up.
4. Try Continue, explicit Mark done, Refresh, message actions, state retry and theme controls. Note which actions are simulated and which only log a route. Check that sample counts and copy agree after completion.
5. Check keyboard order, focus visibility, accessible names, contrast, wrapping, long titles, touch targets, zoom and reduced motion. Do not infer that all interactive controls work merely because they look clickable.
6. Watch the entrance. It should be a brief GSAP fade-up/stagger, with no blur, no delayed control availability, no replay when a count changes, and no motion when reduced motion is enabled.

## Output requested

Lead with a candid overall assessment. Then give only concrete findings, prioritized by severity, with the visible problem, evidence, affected selector or source path, student impact and a specific correction. Separate defects from design opportunities. A short annotated screenshot or precise before/after proposal is more useful than abstract adjectives.

Preserve what works. If you propose a revised design, explain how it improves hierarchy and interaction without inventing data or removing useful functionality. Identify any risk to featured-work identity, assignment completion, permissions, loading/error states or responsive behavior.

Finish with a coverage table: widths, states, interactions, motion, accessibility and anything untested. Do not describe a recommendation as implemented or a fixture action as production persistence. This request is for review; do not publish, contact students or change live records.

## Source orientation if the repository is available

- `src/components/classroom/home/ClassroomHomeView.tsx`: student presentation and existing launch/briefing behavior.
- `src/components/classroom/home/homeModel.ts`, `useClassroomHome.ts`, `useHomeFreshness.ts`: projection, identity, counts and actor-scoped refresh.
- `src/components/classroom/home/home.css`, `useHomeEntrance.ts`: shared visual and GSAP behavior.
- `src/components/classroom/home/ClassroomHome.tsx`, `src/hooks/useUserPermissions.ts`: role gate and account identity.
- `src/hooks/inboxSummaries.ts`, `src/hooks/useInbox.ts`: canonical unread summaries and rendered-message receipts.
- `docs/verification/role-home-preview.tsx`: typed sample data and simulation callbacks used by this export.
- `docs/verification/role-home-20261022.md`: earlier app verification and its limits.

The export may include generated/bundled code. Review the named source components when repository access exists. No final Claude approval or production deployment should be inferred from this package.
