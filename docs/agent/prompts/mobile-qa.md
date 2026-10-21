# Mobile QA (universal)

VS Code slash version: `.github/prompts/mobile-qa.prompt.md`.

Check the specified LSAT U route at a mobile viewport (375x812) against desktop. Do not edit files.
Admin and all primary surfaces must work on mobile.

Check:
- no horizontal overflow / clipped content
- tap targets are reachable and not overlapping
- navigation (Foyer orbital, dock on /foyer only) is usable
- text remains legible, hierarchy preserved
- modals, inbox, and drill surfaces fit the viewport
- no desktop-only assumptions (hover-only actions, fixed widths)

Return:
1. What holds up on mobile
2. What breaks
3. Layout/spacing/z-index/overflow cause
4. Likely files/components
5. Smallest fix path
