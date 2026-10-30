---
name: mobile-qa
description: Check an LSAT U route on a mobile viewport for layout breakage.
agent: ask
---

Check the specified LSAT U route at a mobile viewport (375x812) against desktop.
Admin and all primary surfaces must work on mobile.

Check:
- no horizontal overflow / clipped content
- tap targets reachable and not overlapping
- navigation (Foyer orbital; dock only on /foyer) is usable
- text legible, hierarchy preserved
- modals, inbox, and drill surfaces fit the viewport
- no desktop-only assumptions (hover-only actions, fixed widths)

Do not edit files.

Return:
1. What holds up on mobile
2. What breaks
3. Layout/spacing/z-index/overflow cause
4. Likely files/components
5. Smallest fix path
