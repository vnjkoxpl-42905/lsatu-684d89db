# One-round independent review of the RC Practice design

Date: 2026-10-20. Coordinator/designer/builder: Codex. Requested independent reviewer: Claude Opus 5.5. Exactly one review round. Existing implementation is local and uncommitted; nothing has been published. Review the actual design and code, not just this document. Be candid about mistakes and blind spots; report only evidence-backed issues and useful concrete refinements.

## What the user wants

The user wants RC to correspond visually and structurally to the LR LANDING PAGE in the supplied screenshot, not merely LR's deeper setup form. An earlier iteration opened RC directly into a long builder; the user corrected that misunderstanding. LR must remain unchanged. RC Recall is out of scope.

The accepted RC direction:
- Same light Practice shell: Drills/Practice Exams, Create/In progress/Completed/Saved sets, LR/RC switch, Open a question.
- Plain neutral dark two-part entry panel. Two equally visible choices: Choose for me and Pick your passages. No gold/brass/bronze, texture, glow, gradients or unnecessary cards within RC.
- Below the panel, Your practice on the left with an identifiable RC drill to resume, Assigned work on the right. This should look like a sibling of the LR page in the screenshot.
- Each entry opens the detailed RC builder in its corresponding mode. Builder has configuration/selection left and persistent Your drill summary right, and adapts to narrow screens.
- Count, timing and reveal stay accessible. Advanced filters and explanations disclose progressively. Applied restrictions remain visible, precise PrepTest bounds, separate mode drafts, no silent broadening, exact passage and question identity, one Preview -> Start path.
- RC saved navigation distinguishes exact passages from reusable settings.
- Preserve hidden-result/exposure protections, preview invalidation, content snapshots, owner scope, timing, saved work and launch/retry safeguards. Do not suggest new backend work or imitate competitor branding.

## Visual evidence to actually inspect with Read

User's LR landing reference:
`C:/Users/Joshu/AppData/Local/Temp/codex-clipboard-e2c1c6f6-9a9a-4a0d-8091-5fa817ee727b.png`

Current RC landing, real components with synthetic adapters:
- `docs/verification/rc-landing-preview.jpg` (normal Codex browser view)
- `docs/verification/rc-landing-desktop.jpg` (measured 1440 CSS pixels)
- `docs/verification/rc-landing-mobile.jpg` (390 CSS pixels)
- `docs/verification/rc-landing-320.jpg` (320 CSS pixels)

Detailed builder evidence from preceding iteration:
- `docs/verification/rc-builder-desktop.jpg`
- `docs/verification/rc-builder-mobile.jpg`
- `docs/verification/rc-builder-mobile-summary.jpg`

Those builder screenshots predate the landing entry correction. Distinguish the two surfaces. Do not infer production acceptance from the fixture. Its Open a question is only a scaffold control, while production uses unchanged QuestionJump. Its account/history/assignment values are synthetic; its landing/resume/AssignedWorkPanel/builder components are actual source components. No browser tools or tests are available to you in this read-only review. Say if image viewing is unsupported.

## Implementation to inspect

All paths relative to this checkout, `C:/Users/Joshu/dev/ai-os-projects/lsatu-rc-builder-layout`:
- `src/features/rc/components/RcPracticeLanding.tsx`
- `src/pages/AcademyMainhub.tsx`, especially RC routing, landing entry callbacks, resume data scope, setup/back/deep-link handling. LR's MainhubHero is inline here as reference and must remain unchanged.
- `src/features/rc/components/RcHubSurface.tsx`
- `src/features/rc/components/RcAdaptiveSummary.tsx`
- `src/features/rc/components/RcSavedSetsPanel.tsx`
- `src/features/rc/rc.css`, scoped landing and builder rules.
- `src/components/drill/QuestionPicker.tsx` and `src/components/drill/lr-builder.css` as deeper builder reference only.
- `src/components/classroom/classroom.css` relevant host rules and `src/components/mainhub/AssignedWorkPanel.tsx`.
- Targeted tests: `src/pages/AcademyMainhub.section.test.tsx`, `src/features/rc/components/RcHubSurface.test.tsx`, saved/adaptive tests as needed.
- `docs/verification/rc-builder-verification.md` gives actual proof and limitations.

## Review priorities

Evaluate hierarchy, cohesion with LR screenshot, relative proportions/spacing/typography/control treatment, choice clarity and redundancy, mobile scanning and density, summary usefulness, discoverability, empty/error states, keyboard/focus and semantics, filter/search language and count accuracy. Consider correctness around landing-to-builder transitions, mode drafts, back navigation, saved work and preview/launch. Identify things the designer missed; do not rubber stamp based on tests or color matches. Separate a measurable defect from taste and from an explicit product tradeoff. Avoid introducing slogans, decorative effects, hidden essential timing/reveal settings, new navigation proliferation or changes to LR.

Use NN/g progressive disclosure, Baymard visible applied filters, Carbon precise range inputs as interaction principles only. Existing historical comparison is in the vault at `C:/Users/Joshu/dev/ai-os/research/2026-10-16-rc-7sage-audit/AUDIT.md` if useful; no new competitor browsing is necessary.

## Prior verification and remaining limits

Coordinator ran 81 builder tests and 36 routing tests, final typecheck and build successfully after the landing correction. Codex visually exercised both entry modes, back, keyboard Tab/Enter, widths 320/390/1440 CSS pixels and measured no horizontal overflow. Earlier builder proof exercised no-results with retained selection, simulated history/preview/start failures and exact preview-to-launch IDs/timing/reveal. These are historical coordinator claims, not tests run by you; examine the record and report your own actual coverage. Signed-in production persistence, physical devices and screen-reader speech are unverified.

Return a structured APPROVED/REVISE/BLOCKED verdict with findings (path, concrete visual/source evidence, severity and fix), actual inspected coverage and limitations. This is one advisory round on an existing implementation. Do not edit any files, run commands, launch models or send messages.
