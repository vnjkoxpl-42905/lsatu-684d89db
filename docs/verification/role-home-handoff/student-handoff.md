# Reimagine the LSAT U student homepage in Claude Code

Take full creative ownership. Use the accompanying student-dashboard.html and screenshot to understand the current product, then design and implement a substantially better homepage. This is an ambitious redesign, not a cosmetic review. Impress the owner with an original, coherent, exceptionally well-crafted result.

## Creative freedom

The current export is a starting reference, not a visual specification. You may rethink the entire composition, information hierarchy, typography, palette, spacing, navigation within Home, calendar presentation, controls, and motion. No current card shape, seven-day strip, color token, or layout is mandatory. Keep or replace elements according to your strongest design judgment. Do not let the existing screenshot become a ceiling on the result.

Build a clear visual point of view around the real jobs below. Use relevant installed taste, frontend design, motion, and component skills when helpful. Study suitable references and understand why they work; synthesize an original direction rather than copying a template. Invest in typography, proportion, interaction details, and responsive composition. Avoid decorative complexity that makes useful actions harder.

## Product truth

The student Home should help a learner know what to do next, resume work, finish assignments, understand progress, and reach teacher communication. Keep teacher administration separate.

Preserve account permissions, real functionality, assignment identity and completion semantics. Message read receipts should clear unread status without deleting history. Use honest data, loading and error states. Unknown counts are not zero; platform sessions do not establish complete calendar availability. These are functional responsibilities, not restrictions on visual creativity.

## Work and verify

Read the companion role handoff and render both HTML files to understand the two audiences. Identify the highest-impact weaknesses, choose a bold coherent direction, and implement it locally without stopping at a list of suggestions. Use the actual source components when repository access is available. If working only from the export, produce a self-contained revised HTML prototype and clearly distinguish it from production integration.

Visually inspect the finished experience at desktop and phone widths. Exercise its primary interactions, keyboard navigation, reduced motion, empty and loading/error states. Refine based on what you actually see. Deliver the finished result, screenshots, a concise rationale for the major choices, and verified versus unverified behavior. Do not claim browser verification when you could only read source.

## Files and limits

This portable HTML contains sample data and embedded fonts/CSS/JavaScript. It has no live backend and simulated actions do not prove persistence. The companion screenshot is visual reference only. Read README.md and START-HERE-PROMPT.md for exact local paths. Do not deploy, push, send messages, change roles, or modify live student records without authorization.

## Source orientation if the repository is available

- `src/components/classroom/home/ClassroomHomeView.tsx`: student presentation and existing launch/briefing behavior.
- `src/components/classroom/home/homeModel.ts`, `useClassroomHome.ts`, `useHomeFreshness.ts`: projection, identity, counts and actor-scoped refresh.
- `src/components/classroom/home/home.css`, `useHomeEntrance.ts`: shared visual and GSAP behavior.
- `src/components/classroom/home/ClassroomHome.tsx`, `src/hooks/useUserPermissions.ts`: role gate and account identity.
- `src/hooks/inboxSummaries.ts`, `src/hooks/useInbox.ts`: canonical unread summaries and rendered-message receipts.
- `docs/verification/role-home-preview.tsx`: typed sample data and simulation callbacks used by this export.
- `docs/verification/role-home-20261022.md`: earlier app verification and its limits.

The export may include generated/bundled code. Review the named source components when repository access exists. No final Claude approval or production deployment should be inferred from this package.
