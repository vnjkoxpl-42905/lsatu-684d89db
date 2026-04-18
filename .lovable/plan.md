

## Goal
Make Foyer, Drill, and Tutor (Joshua) usable and polished on phone widths (≤640px), with mobile-specific UI patterns where appropriate — not just shrunk desktop layouts.

## Confirmed mobile problems (from live capture at 390×844)

**Foyer (`/foyer`) — visible in screenshot**
- Orbital ring is wider than viewport: "BOOTCAMPS" clipped to "BOOTCAM", "SCHEDULE" clipped to "SCHEDUL"
- Header: "LSAT U" appears as "L S A T  U" with broken letter-spacing at narrow width; help "?" sits awkwardly
- Bottom utility dock sits on top of the bottom orbital nodes (Analytics/Schedule), creating tap-target collision
- No safe-area padding for iOS home-indicator zone

**Drill (`/practice` → drill session)** — known from code (`src/pages/Drill.tsx`, `DrillTopBar.tsx`)
- Top bar tools (timer + voice coach + flag + tutor) overflow on narrow widths
- Question stem + answer choices use desktop-grade padding; touch targets <44px for radio buttons
- Mode/section selector uses multi-column grid that wraps awkwardly
- BACK button still navigates to `/` → Foyer (Option A from prior plan, applied mobile + desktop)

**Tutor / Joshua modal (`TutorChatModal.tsx`)** — known from code
- Renders as centered Dialog on all viewports — on phones a centered modal with input at bottom of dialog gets covered by mobile keyboard, and side margins waste precious width
- Should be a full-height bottom-sheet on phone (slides up, input docked above keyboard, swipe-down to dismiss)
- "Return to question" button currently full-width but sits in modal footer that scrolls out

## Changes (scoped, mobile-only where possible)

### 1. `src/components/foyer/OrbitalHub.tsx`
- Detect `useIsMobile()` (already exists)
- On mobile: shrink orbit radius to `min(45vw, 160px)`, reduce node label font to `text-[9px]`, allow labels to wrap to 2 lines, anchor right-side labels with `right` instead of `left` so they don't clip viewport edge
- Add `px-4` safe horizontal padding on container
- Center orbit vertically with `pb-32` to clear the bottom dock

### 2. `src/pages/AcademyFoyer.tsx` (header)
- On mobile: replace "L S A T   U" wide-tracked header with compact "LSATU" or icon-only, move help "?" into a kebab menu

### 3. `src/components/ui/animated-dock.tsx` (bottom utility tray)
- Add `pb-[env(safe-area-inset-bottom)]` to clear iOS home indicator
- On mobile: reduce dock icon size from 44 → 40px, tighten gap, add `bg-background/95 backdrop-blur-xl border-t` so it visually separates from orbital

### 4. `src/pages/Drill.tsx` + `src/components/drill/DrillTopBar.tsx`
- **Apply BACK fix (Option A)**: `onBack` clears active session state instead of `handleNavigation('/')`, so user returns to drill setup screen, not Foyer. Same behavior desktop + mobile.
- Top bar on mobile: collapse secondary tools (flag, voice coach chip) into a single "···" overflow popover; keep timer + tutor visible
- Mode/section selector: switch desktop 3-col grid to 1-col stack on `<sm`, increase touch target to `min-h-[56px]`
- Answer choice buttons: ensure `min-h-[48px]`, `text-base` (16px to prevent iOS zoom), full-width
- Add `pb-[env(safe-area-inset-bottom)]` to footer action bar

### 5. `src/components/drill/TutorChatModal.tsx`
- Render as `<Sheet side="bottom">` from shadcn on mobile (`useIsMobile()` branch); keep `<Dialog>` on desktop
- Sheet height: `h-[85dvh]` so input stays above keyboard (use `dvh` not `vh` for iOS keyboard-aware sizing)
- Sticky composer at bottom with `pb-[env(safe-area-inset-bottom)]`
- Sticky "Return to question" CTA pinned above composer, full-width, `min-h-[48px]`
- Drag-handle visual at top of sheet

## Out of scope
- No changes to streaming logic, prompt content, or model selection (Phase 2 work stays as-is)
- No changes to `index.css` design tokens
- No changes to desktop layouts beyond the BACK button fix
- No changes to Bootcamp/Classroom/Analytics pages (separate audit if needed)
- No changes to PWA install flow

## Files
- `src/components/foyer/OrbitalHub.tsx` — mobile orbit sizing + label anchoring
- `src/pages/AcademyFoyer.tsx` — mobile header compaction
- `src/components/ui/animated-dock.tsx` — safe-area + mobile sizing
- `src/pages/Drill.tsx` — BACK fix (Option A), mobile mode selector, safe-area footer
- `src/components/drill/DrillTopBar.tsx` — mobile overflow popover
- `src/components/drill/TutorChatModal.tsx` — mobile bottom-sheet branch

## Verification (after implementation)
- Re-capture screenshots at 390×844 for `/foyer`, drill setup, drill question, tutor open
- Confirm: no horizontal scroll, no clipped labels, all tap targets ≥44px, no dock/orbital collision, tutor sheet doesn't get covered by keyboard

