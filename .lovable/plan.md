## What you're seeing

Inside `/bootcamp/intro-to-lr` three floating buttons stack in the bottom-right:

1. **Sparkles (gold)** — AI Tutor (⌘J), mounted by `WorkspaceShell` → `FloatingActions`
2. **Graduation cap** — `FloatingTAWidget` (admin/TA only — appears for you because you're admin)
3. **Chat bubble with "1"** — `FloatingMessenger` (the Facebook-Messenger-style one you want to keep)

Also, there is no way back to the Foyer from inside the bootcamp — the `LeftRail` only lists module sections (Lessons, Reference, Drills, etc.). No Home/Exit.

## Fix

### 1. Add a Home / Back-to-Foyer entry inside the bootcamp

In `src/bootcamps/main-conclusion/components/workspace-shell/LeftRail.tsx`:
- Add a small "← Foyer" link at the top of the left rail (above the "Intro to LR" title block, or just under it). It navigates to `/foyer`.
- For phone breakpoint (left rail is `phone:hidden`), also surface a small fixed top-left "← Foyer" pill so mobile users have a way out.

### 2. Student side: keep only the chat bubble

Students should see exactly one floating element: the Messenger chat bubble.

- **`WorkspaceShell.tsx`** — gate `<FloatingActions />` (the gold Sparkles + ⌘ Command palette buttons) behind `is_admin`. Use `useUserPermissions()`. Non-admin students get nothing from this surface. ⌘K and ⌘J keyboard shortcuts can stay (no visible buttons either way).
- **`FloatingTAWidget`** is already admin-only, so it already disappears for students. No change needed there. (Your screenshot shows it because you're signed in as admin.)
- **`FloatingMessenger`** — leave as-is. It already shows on bootcamp routes, has unread badge, and opens a Messenger-style fly-out. This is the single chat surface for students.

### 3. Result

Student on `/bootcamp/intro-to-lr`:
- Top of left rail: "← Foyer" link to return home.
- Bottom-right: just the chat bubble (with unread count). No Sparkles, no graduation cap, no command palette button.

Admin on `/bootcamp/intro-to-lr` (you):
- Same Home link.
- Bottom-right keeps Sparkles + Command palette + TA cap + Messenger (admin tools stay).

## Files to edit

- `src/bootcamps/main-conclusion/components/workspace-shell/LeftRail.tsx` — add Home link.
- `src/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell.tsx` — conditionally render `<FloatingActions />` only when `is_admin`. Keep keyboard shortcuts.
- (Optional) small mobile back-pill if the left rail isn't visible on phone.

## Out of scope

- No changes to chat behavior, TA widget logic, or routing.
- Keyboard shortcuts (⌘K, ⌘J) stay wired so admins can still trigger them.
