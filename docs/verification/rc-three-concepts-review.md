# Three RC builder design concepts

## Scope and authority
Joshua approved three interactive design alternatives, followed by exactly two Claude review rounds. These are local design prototypes, not production implementation or publication. LR remains unchanged. Existing uncommitted RC component work remains preserved.

## Shared requirements
- Ground all three in the current LSAT U LR visual language: warm classroom surroundings, restrained dark panels, clear type and modest borders.
- Simplify the default RC setup to passage count, timing, selection summary and one primary Preview drill action.
- More options opens a right drawer; on mobile it fills the viewport. Automatic filters and manual passage selection live there.
- Drawer edits are drafts. Apply commits them to the concept; Cancel, Escape and close discard them. Preserve applied selections when reopening.
- Preserve inactive manual picks when switching modes; only the active mode controls preview. Explain retained picks in the drawer. Reopening preview regenerates it from current settings and resets demo completion.
- Automatic filters are illustrative configuration only and must be explicitly marked as samples at controls, summary and preview. Report actual topic-matching fixture availability against requested count, without claiming other sample filters select real passages.
- Preview then Start represents the existing inspected-selection safeguard. Prototype starts must explicitly say no real drill was created.
- Never invent backend saves, adaptive analytics, passage availability, microphone activity or unsupported training features. Fixture data is labeled.
- Keyboard accessibility: focus enters dialog, stays inside, Escape dismisses, focus returns to opener; background inert. Meaningful labels and focus indicators.
- Distinct concepts: 1 LR-like split hero, 2 compact focused console, 3 editorial stacked composition. Differences must change hierarchy, not just colors.

## Artifact and review contract
Artifact: docs/verification/rc-builder-three-designs.html, a standalone interactive gallery with version=1/2/3 URL selection. No production files modified for these concepts.

Claude should inspect this specification AND the finished HTML/CSS/JS for all three concepts. Compare fit to requirements, visual hierarchy from source and supplied host screenshots where readable, workflow clarity, accessibility, responsiveness, and truthful fixture boundaries. Give a preferred concept with evidence. Read-only reviewer cannot run the browser; disclose that limitation. Host runs Codex browser checks.

Round 1: review all three finished designs. Host evaluates every finding and revises warranted issues. Round 2: resume same reviewer with dispositions and final artifacts. Stop after two rounds even if material findings remain; report them honestly. No third inspection/review.

## Host verification
Open all three in Codex browser at desktop and narrow mobile widths. Exercise options opening, manual search/selection, Cancel versus Apply, preview reset on changed selection, Escape/focus restoration, and no horizontal overflow. Capture screenshots. The result remains design-only and needs user selection before production replacement.

## Risks
Static fixture prototypes cannot prove production recording, saved progress, adaptive selection, exposure history or launch correctness. Existing RC functionality must be integrated and tested separately after a concept is selected. Current LR source is a style reference only.

## Review evidence
Host screenshots: docs/verification/rc-concept-1-desktop.jpg, rc-concept-2-desktop.jpg, rc-concept-3-desktop.jpg, rc-concept-1-mobile.jpg, rc-concept-2-mobile.jpg, rc-concept-3-mobile.jpg and rc-concept-drawer-mobile.jpg. Reviewer should inspect these with Read if supported and report actual image coverage. If images cannot be read, give only a qualified source-based structural recommendation, not a visual endorsement. Host browser results are documented in rc-three-concepts-verification.md. Original blocked authentication statements in that file are historical, superseded by subsequent successful review log entries.
