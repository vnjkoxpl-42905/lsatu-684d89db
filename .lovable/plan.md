

## Plan: Dynamic HUD for OrbitalHub

### Summary
Replace the center "reading pocket" hover display with an elite top-center floating HUD card that activates after a 750ms intentional hover. The HUD shows the node name, a fixed description, and a live access status badge.

### Changes (single file: `src/components/foyer/OrbitalHub.tsx`)

**1. Add 750ms intentional hover logic**
- Replace the instant `hovered` state with an `activeHoverNode` state + a `useRef` timeout
- `onMouseEnter`: start a 750ms timeout that sets `activeHoverNode`
- `onMouseLeave`: clear the timeout and set `activeHoverNode` to null
- Keep the existing instant `hovered` state for the dot glow/ring effects (those should remain instant)

**2. Accept permissions prop**
- Add `permissions` to `OrbitalHubProps` (type from `useUserPermissions`)
- Pass it from `AcademyFoyer.tsx`

**3. Define HUD content map**
Static object with exact copy as specified:
- Practice: "Full practice tests and timed sections."
- Bootcamps: "Guided drills for advanced question types."
- Classroom: "Video lessons and past coaching sessions."
- Analytics: "Track your progress and spot weak areas."
- Schedule: "Your daily study calendar."

**4. Replace center reading pocket with top-center HUD**
- Remove the existing `AnimatePresence` center hover display (lines 357–404)
- Add a new `AnimatePresence` block rendering a `fixed top-8 left-1/2 -translate-x-1/2 z-50` card
- Styling: `bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl p-5 w-96`
- Fade-in + slide-down animation via framer-motion
- Content layout:
  - Header: node label in `text-xs tracking-widest uppercase text-zinc-400`
  - Brief: 1-sentence description in `text-zinc-100 font-medium`
  - Badge: Lock icon (amber) + "Access Restricted" if locked; Check icon (emerald) + "Access Granted" if unlocked. Practice is always unlocked.

**5. Update AcademyFoyer.tsx**
- Pass `permissions` prop to `OrbitalHub`

### Files Modified
| File | Change |
|------|--------|
| `src/components/foyer/OrbitalHub.tsx` | Add intentional hover logic, HUD component, permissions prop |
| `src/pages/AcademyFoyer.tsx` | Pass `permissions` prop to OrbitalHub |

