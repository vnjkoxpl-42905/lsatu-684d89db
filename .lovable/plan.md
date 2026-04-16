

## Plan: In-App Interactive Tour on First Foyer Visit

### Summary
Build a multi-step guided tour overlay that triggers automatically the first time a user visits the Foyer. It highlights each orbital node and key UI elements with a spotlight + tooltip system. A `has_seen_tour` flag on the `profiles` table prevents replays. Users can skip or dismiss at any time.

### 1. Database Migration
Add a `has_seen_tour` boolean column to `profiles`, defaulting to `false`.

```sql
ALTER TABLE public.profiles ADD COLUMN has_seen_tour boolean NOT NULL DEFAULT false;
```

### 2. New Component: `FoyerTour.tsx`

**`src/components/foyer/FoyerTour.tsx`**

A full-screen overlay component with these mechanics:

- **Spotlight mask**: A dark semi-transparent overlay (`bg-black/70 fixed inset-0 z-[100]`) with a CSS `clip-path` or SVG cutout that highlights the current target area.
- **Tooltip card**: Positioned near the highlighted element. Minimal dark-glass style (`bg-zinc-950/95 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 max-w-sm`). Contains step title, description, step indicator dots, and Next/Skip buttons.
- **Steps array** (6 steps):
  1. **Welcome** — center of screen, no spotlight. "Welcome to LSAT U. This is your hub — everything starts here."
  2. **Practice** — spotlight the Practice node. "Start here. Timed sections, full PTs, and adaptive drills."
  3. **Bootcamps** — spotlight the Bootcamps node. "Guided skill-building modules for advanced question types."
  4. **Classroom** — spotlight the Classroom node. "Video lessons and past coaching sessions."
  5. **Analytics** — spotlight the Analytics node. "Track your accuracy, trends, and weak areas over time."
  6. **Schedule** — spotlight the Schedule node. "Your daily study calendar and milestones."
- Each step animates in with a fade transition via Framer Motion.
- "Skip Tour" link on every step. "Next" button advances. Last step shows "Get Started".
- On completion or skip: call Supabase to set `has_seen_tour = true`, then unmount.

### 3. Spotlight Targeting

Each orbital node already has a computed position via `pct()`. The tour component will:
- Accept the list of `FOYER_NODES` and the container ref
- Calculate each node's screen position from its percentage coordinates
- Render an SVG mask with a circular cutout at the target node's position
- Transition the cutout smoothly between steps

### 4. Integration in `AcademyFoyer.tsx`

- After the hub reaches `idle` phase, check if `has_seen_tour` is `false` on the user's profile.
- If false, render `<FoyerTour>` above the hub (z-100).
- Pass a callback `onComplete` that sets the flag in the DB and hides the tour.
- The tour only renders once the welcome animation is done (not during `ghost` or `materializing` phases).

### 5. Re-watch Option

Add a small "?" or "Tour" button in the top-right controls area (next to theme toggle) that resets `has_seen_tour` to `false` and re-triggers the tour. This lets users replay it anytime.

### Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add `has_seen_tour` boolean to `profiles` |
| `src/components/foyer/FoyerTour.tsx` | New — full tour overlay component |
| `src/pages/AcademyFoyer.tsx` | Query `has_seen_tour`, render tour after idle, add re-watch button |

### Technical Details
- Spotlight uses an SVG `<mask>` with a `<circle>` cutout animated via Framer Motion's `animate` prop for smooth repositioning between steps
- Step content is a static array — no AI generation, no API calls
- DB update is a single `supabase.from('profiles').update({ has_seen_tour: true }).eq('class_id', user.id)`
- Tour is non-blocking: clicking outside the tooltip or pressing Escape also dismisses it

