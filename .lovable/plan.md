## Goal

Make the section-runner visually emulate the official LawHub screenshot. Current preview drifts on header structure, card placement/height, toolbar weight, timer label, typography scale, pane split, and bottom navigator presence. Presentation-only — no business logic, no handler signatures, no new deps.

## Mode flags (verified in Drill.tsx)

- Full Section → `session.mode === 'full-section'`
- Build-a-Set → local boolean `isPracticeSetMode` (set when a practice-set is detected at session boot)
- Smart Drill → `session.mode === 'adaptive'`

These names are used as-is below.

## Files to change

```text
src/components/drill/official/OfficialDrillFrame.tsx       // white global header band + deep-purple body
src/components/drill/official/OfficialSessionStrip.tsx     // restyle into white-header bar, gray pill buttons
src/components/drill/official/OfficialDrillToolbar.tsx     // chunkier toolbar, bigger icons, real separators, big red timer
src/components/drill/official/OfficialQuestionPane.tsx     // 55/45 split, bigger type, larger bubbles, darker eye icons
src/components/drill/official/OfficialAnswerNavigator.tsx  // larger ovals, stronger arrow buttons
src/pages/Drill.tsx                                         // default-on for full-section + build-a-set; navigator unchanged
```

## Structural changes

### 1. Frame (white header + lower card)

Rewrite `OfficialDrillFrame` so the page is split into a true global header row and a separately-colored body, with the white test card pushed down and not stretching to the viewport bottom.

```text
<div min-h-screen bg-[#1A1635] flex flex-col>
  <header bg-white border-b border-slate-200 px-6 py-3>{header}</header>
  <main flex-1 px-6 sm:px-10 pt-10 sm:pt-14 pb-10>
    <div mx-auto w-full max-w-[1200px] bg-white border border-slate-300
         rounded-md shadow-[0_4px_18px_rgba(0,0,0,0.35)] overflow-hidden
         flex flex-col>
      {children}                                {/* toolbar + pane + navigator */}
    </div>
  </main>
</div>
```

- Body bg `#1A1635` (deep purple-navy from reference).
- Card no longer uses `min-h-[calc(100vh-…)]`; height is driven by content, leaving visible dark gap below.
- Drop the `flex-1 min-h-0` chain on the question pane (see §4).

### 2. Session strip (white header)

`OfficialSessionStrip` becomes the content of the white header row:

- Outer container: `flex items-center justify-between gap-4 w-full`.
- Breadcrumb left, `text-[14px]`, separators rendered as light-gray slashes:
  - `Library` and PrepTest title in `text-blue-700 hover:text-blue-800`.
  - Section label in `text-[#7f1d1d] font-medium`.
- Right: Pause Section + Complete Section restyled as **light-gray pills**:
  - `rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-blue-900 px-5 py-1.5 text-[14px] font-medium`.

### 3. Toolbar (chunkier, big timer, real separators)

In `OfficialDrillToolbar`:

- Outer row: `bg-slate-50 border-b border-slate-200 px-4 py-3` (taller).
- Directions button: `border border-slate-400 bg-white px-3 py-1.5 text-[14px]`.
- Find input: `border border-slate-400 px-3 py-1.5 text-[14px] w-[260px]`, placeholder `Find Text, Type Here`.
- `PipeSeparator` → real bar: `<span className="w-px h-7 bg-slate-300 mx-2" />`.
- Annotation buttons: `p-2`; marker SVG `26×26`, eraser `30×20`.
- Aa button: `<span class="text-[18px] font-semibold">A<span class="text-[12px]">A</span></span>`.
- Line-spacing icon enlarged to `22×22`.
- Timer cluster (right):
  ```tsx
  <div className="ml-auto rounded-sm border-2 border-[#7f1d1d] px-3 py-1.5
                  text-[14px] font-medium text-black tabular-nums whitespace-nowrap">
    {isFullSection ? "Section Time Remaining" : "Elapsed"}: {timerLabel || "00:00"}
  </div>
  ```
  No green progress fill. Full sections always read `Section Time Remaining: 00:00`.

### 4. Question pane (split, type, bubbles, eyes)

In `OfficialQuestionPane`:

- Grid: `grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]` (passage wider, divider farther right). Remove `flex-1 min-h-0`.
- Both columns: `px-8 py-8 text-[17px] leading-[1.65] text-black`.
- Stem block at same `text-[17px]`.
- Answer list: `space-y-5 mt-5`, each `text-[16px] leading-[1.55]`.
- Bubbles: `w-7 h-7 border-[1.5px] border-slate-500 text-[13px] font-semibold` (round, larger, stronger outline). Selected keeps `slate-900` fill.
- Eye icon: `Eye` `w-[18px] h-[18px] text-slate-500 hover:text-slate-800 strokeWidth={2}`.
- Flag icon stays blue, `w-[22px] h-[22px]`.

### 5. Bottom navigator (Full Section + Build-a-Set only)

In `OfficialAnswerNavigator`:

- Strip: `border-t border-slate-200 bg-white px-6 py-3`.
- Ovals: `w-[22px] h-[12px] border border-slate-500`.
- Number under each oval: `text-[12px]`, current bold.
- I-beam tick: `w-[2px] h-[8px] bg-slate-900`.
- Prev/next: `border border-slate-400 px-3 py-2 rounded-sm`, arrow icons `w-5 h-5 strokeWidth={2.25}`. Next button gets `border-2`.

`Drill.tsx` already gates the navigator with `showOfficialAnswerNavigator = isFullSection || isPracticeSetMode`. Keep as-is — Smart Drill (`session.mode === 'adaptive'`) does not render the navigator.

### 6. Default to official layout for Full Section and Build-a-Set

In `src/pages/Drill.tsx`, replace:

```ts
const isOfficialLayout = searchParams.get('layout') === 'official';
```

with:

```ts
const layoutParam = searchParams.get('layout');
const officialEligible =
  session?.mode === 'full-section' || isPracticeSetMode;
const isOfficialLayout =
  layoutParam === 'official' ||
  (officialEligible && layoutParam !== 'classic');
```

Result:

- Full Section (normal app flow) → official layout, with bottom navigator.
- Build-a-Set (normal app flow) → official layout, with bottom navigator.
- Smart Drill (`adaptive`) → unchanged surface, no bottom navigator (the official layout is not auto-applied).
- `?layout=classic` → escape hatch back to the previous default for any mode.
- `?layout=official` → still forces the official layout for any mode (dev/QA).

## Acceptance check

With a Full Section drill launched from the normal app flow (no query param):

- Top is a full-width **white** bar with breadcrumb (left) and two **light-gray pill** buttons (right).
- Below it, a deep purple-navy field; the white test card sits lower with a visible dark gap above and below.
- Toolbar is taller; icons clearly larger; vertical bars (not pipes) separate clusters.
- Timer at far right shows `Section Time Remaining: 00:00` in a thick red-bordered box, black text.
- Passage column wider than the question column; body type ≈ 17px.
- A/B/C/D/E circles larger with stronger gray outline; eye icons visibly darker.
- 1–25 oval strip with prev/next arrows pinned at the bottom of the card; current question number bold with I-beam tick above its oval.

With a Build-a-Set session: same as above, including the bottom navigator.

With a Smart Drill session: surface is unchanged (no bottom navigator, no auto-switch to the official frame).

`/drill?layout=classic` still renders the previous default surface for any mode.
