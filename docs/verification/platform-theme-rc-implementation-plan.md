# Approved palette and final RC builder implementation

User-authorized local implementation, 2026-10-21. No deployment, push, merge, or commit is authorized by this work order.

## Outcome

Apply the exact palette in `docs/design/approved-platform-palette.md` to shared platform theme roles and effective classroom/reader light surfaces. Preserve semantic success, warning, error, and correctness roles and saved immersive dark/high-contrast preferences. Keep LR layout and behavior intact.

Effective palette owners include `src/index.css`, classroom.css, Reading Center light theme, booking-theme.css (including portal dialogs), testing-centre.css, Activity Centre shared workbook/entry styles, and Academy Hall neutral grounds/text. Preserve authored teaching-world palettes, imagery, Hall bronze/cyan/film effects, and semantic feedback. This is neutral-role alignment, not indiscriminate recoloring of authored teaching content.

Implement the open Direct lookup composition in the real RC builder: cream intro and refined optional PrepTest/Section/Passage lookup on the left, asymmetric charcoal settings on the right. No enclosing dark box, question dropdown, extra Add passage/Open preview action, or competing main selection-mode buttons. Main controls are passage count beside timing, Show answers below, Customize drill, and one primary Review passages action. Selection methods remain available inside the drawer. Separate Review and Start remain mandatory.

Direct lookup must use authoritative IDs without revealing protected content. Inactive automatic/manual drafts and previously reviewed selections remain recoverable. Timing and answer changes preserve automatic IDs. Exact sets and reusable settings remain distinct. Launch validation, exposure requirements, duplicate-launch guards, assignments classification, Apply/Cancel, clearing, ordering, and saved-set behavior must remain intact. No draft persistence is introduced.

An active direct lookup temporarily overrides the underlying draft. Customize is disabled while that override is active, with a clear instruction to clear lookup first; clearing restores the previous automatic/manual draft and review snapshot. Strict exposure requirements remain visible and enforced. Error, shortfall, and strict-block notices must be readable on both light and dark host canvases. Keep Back aligned with the working content rather than the legacy 980px inner column.

Include Home's independent `src/components/classroom/home/home.css` neutral roles in the palette rollout. Primary fill follows the implemented approved dark-surface role (#131718), focus ring follows ink on light and cream on dark, with a visibly distinct hover. Design records must describe these actual mappings.

## Verification

- Run meaningful affected component regression tests, TypeScript checks, and production build.
- Visually inspect the real-component fixture at 1440, 980, 768, 390, and 320 CSS pixels, normal zoom. Capture setup, drawer, review, and representative mobile states.
- Exercise direct lookup, automatic/manual, ordering, Apply/Cancel/clear, timing, saving, Review/Edit/Start, shortfalls and failures as feasible in the fenced fixture.
- Read computed palette/font styles. Verify shared light/dark roles and semantic contrast through a representative CSS gallery. This does not prove authenticated platform screens or backend persistence.
- Independent Claude Opus inspection after implementation and checks, up to two inspections. Record findings, dispositions, coverage, and limits. Freeze reviewed code during each inspection. Prior prototype approval does not cover these changes.

## Scope accounting

Baseline commit: `aeecce9bd038eb6e5b637f1ab22f348b2fa860c1`. The checkout already contains substantial authorized RC/search/assignment work and prototype artifacts. Preserve it. Current work authorship: Codex and Codex subagents; Claude is read-only reviewer. Review the resulting accumulated RC changes where relevant, explicitly distinguish current palette/direct-lookup changes from preexisting modifications, and report incomplete coverage honestly.

Before screenshot: `C:/Users/Joshu/Downloads/Platform-Palette-RC-Implementation-2026-10-21/before-rc-1440.jpg`.
