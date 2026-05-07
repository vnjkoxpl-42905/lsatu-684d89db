## Goal

Make the `/drill?layout=official` surface visually identical to the official LawHub testing UI (image 1). Today's version (image 2) is close in skeleton but drifts on the backdrop color, the way the white paper sits inside it, button styling, icons, answer choice shape, and a missing bottom navigator on non-full-section runs.

## Differences I found (image 2 → image 1)

1. **Background "blue ocean"**
   - Now: `bg-[#0f172a]` (almost black slate).
   - Target: a true deep navy with a slight blue cast (≈ `#0B1F3A` / `hsl(217 55% 14%)`), matching the LawHub canvas.

2. **How the white paper "sits"**
   - Now: rounded-md card, big shadow, only as tall as its content → a small white box floating in a huge dark void below.
   - Target: the paper is essentially a full testing surface — square corners (or 2px radius max), thin 1px dark navy border, no drop shadow, and it stretches to fill the viewport height so there is no dark void below the choices. Bottom navigator is *always* attached at the bottom of the paper.

3. **Outer max-width / padding**
   - Now: `max-w-[1180px]`, `py-3 sm:py-6`, paper hugs content height.
   - Target: `max-w-[1280px]`, slightly tighter top padding, paper uses `min-h-[calc(100vh-72px)]` and `flex flex-col` so the question pane grows and the navigator pins to the bottom edge of the paper.

4. **Session strip (top, on the navy)**
   - Breadcrumb: looks right. Keep "Library" gray, "PrepTest …" sky blue link, "Section N" rose.
   - Buttons: today they're transparent with a slate border. Target is **solid white pills with dark slate text** (`bg-white text-slate-900 border border-slate-300`) and slightly larger horizontal padding.

5. **Toolbar row**
   - Order in image 1: `Directions | Find Text | U | yellow | pink | orange | eraser | Aa | line-spacing | Section Time Remaining` — current order matches, but:
     - `U` underline button: keep, but render as a real underlined "U" glyph (current code uses a Lucide `Underline` icon — close enough; just confirm spacing).
     - Highlighter pen icons: bigger (24×24) and visibly slanted with a clearly colored tip — current SVG is correct but needs ~+2px and slightly thicker stroke so the tip reads as colored, not gray.
     - Eraser: chunky two-tone (pink top / white bottom) — current is OK; just enlarge to match.
     - Pipe separators: a touch taller and lighter color (`bg-slate-300` → `bg-slate-200`, height `h-6`).
     - Timer box: dark-red border + dark-red text, narrow vertical padding — currently good; tweak border width to 1.5px and font to medium tabular.

6. **Question pane (the biggest visual delta)**
   - Now: two-column grid, `min-h-[420px]`, content top-aligned, lots of empty white below (because the paper itself doesn't expand).
   - Target: stimulus left / stem+choices right with the **stimulus column wider** and choices column slightly narrower (≈ `40% / 60%` instead of `50/50`). Pane should `flex-1` so it expands to fill the paper.
   - Answer choice "bullets": currently perfect circles. Target is **elliptical ovals** (≈ `28×18px`, `rounded-full`) with the letter centered inside, thin slate border. Selected = filled dark slate w/ white letter (already correct).
   - Each choice row has the eye/eliminate icon on the far right — already present, just align baseline with the choice letter.
   - Stem flag icon: blue outline flag (`text-[#2563eb]`) — already correct, just bump to `w-5 h-5` and align top-right.

7. **Bottom answer navigator**
   - Now: only renders when `isFullSection === true` (so single-question drills like the current `/drill?layout=official` test render with no bottom strip and a giant void).
   - Target: **always** render the bottom navigator inside the paper (even for 1-question drills it should show a single oval with "1" and the prev/next arrows disabled). This is the single change that makes the paper "feel right" — it caps the white surface and removes the dark void.

8. **Typography**
   - Frame already scopes Helvetica/Arial — keep. Bump body size from `15px` to `16px` and line-height to `1.6` to match the LawHub spacing.
   - Question number `2.` rendered to the LEFT of the stem (already correct).

## Files to change

```text
src/components/drill/official/OfficialDrillFrame.tsx     // background color, paper border/shape, full-height layout
src/components/drill/official/OfficialSessionStrip.tsx   // white-pill buttons
src/components/drill/official/OfficialDrillToolbar.tsx   // icon sizing, separator styling
src/components/drill/official/OfficialQuestionPane.tsx   // 40/60 columns, oval bullets, flex-1 height, type sizes
src/components/drill/official/OfficialAnswerNavigator.tsx// no functional change (just confirm always-mount)
src/pages/Drill.tsx                                       // remove `showOfficialAnswerNavigator = isFullSection` gate; always show navigator inside the paper
```

No business logic, no handler changes, no new dependencies — pure presentation.

## Acceptance check

After the change, on `/drill?layout=official` with both a 1-question drill and a full section:
- Backdrop reads as deep navy, not near-black.
- The white paper fills the viewport vertically, with the toolbar at the top and the answer-oval navigator pinned to the bottom edge.
- "Pause Section" / "Complete Section" appear as solid white pills.
- Answer choices show oval letter bullets, not perfect circles.
- Side-by-side compared to image 1 at 1453×1012, the layouts line up within a few pixels.
