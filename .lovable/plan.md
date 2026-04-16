

# Dock Routing Fix

## Routing plan per dock item

| Item | Destination | Type | Rationale |
|------|------------|------|-----------|
| **Homework** | `/practice` | Route | The practice page is the student's active work center — closest existing match to "homework" |
| **Inbox** | No route — placeholder toast | Local action | No inbox/messages system exists yet. A toast saying "Inbox coming soon" is honest; a dead route is not |
| **Scheduling** | `/schedule` | Route | Already correct, no change needed |
| **Settings** | `/profile` | Route | The profile page already handles account and preferences — this is the existing settings destination |
| **Help / Tour** | Trigger `setShowTour(true)` | Local action | The foyer already has a fully built `FoyerTour` component with replay logic. Clicking this should replay the tour directly, not navigate anywhere |

## Implementation

### 1. `src/components/ui/animated-dock.tsx`
- Add optional `onClick?: () => void` to `DockItemData`
- Make `link` optional (some items are local actions, not routes)
- In the button handler: if `onClick` exists, call it; otherwise navigate

### 2. `src/pages/AcademyFoyer.tsx`
- **Homework**: change `link` from `/homework` to `/practice`
- **Inbox**: remove `link`, add `onClick` that fires a toast ("Inbox coming soon")
- **Settings**: change `link` from `/settings` to `/profile`
- **Help / Tour**: remove `link`, add `onClick` that calls `setShowTour(true)` and `setTourChecked(false)` to replay the tour
- **Scheduling**: unchanged

No new pages created. No dock placement or orbit changes.

