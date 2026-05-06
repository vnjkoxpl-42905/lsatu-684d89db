## Problem

The landing page (`src/pages/Auth.tsx`) currently shows "Sign in" three times:

1. Top-right of `ArcNav` (sticky header)
2. Inside `ArcProof` quote section, paired with "Begin training"
3. Inside `ArcFinalCTA` (bottom), paired with "Begin training"

There is no explicit "Sign up" entry point — new visitors only see "Begin training", which is ambiguous (it routes into the auth modal but doesn't read as account creation).

## Recommendation

Standard SaaS landing pattern, and the cleanest fit here:

- **Sign in** → lives only in the top nav (one place, persistent, expected location).
- **Hero (beginning of page)** → primary CTA pair: **Begin training** (opens modal in sign-up mode) + **Sign up** as a secondary explicit option, OR collapse into a single "Get started — it's free" style CTA. Since you asked for an explicit Sign up, we'll show both.
- **Mid-page proof + final CTA sections** → keep ONE primary CTA each ("Begin training"). Remove the duplicated "Sign in" buttons — anyone scrolling that far who wants to sign in will use the sticky nav.

Result: Sign in appears once (nav). Sign up appears once (hero, next to Begin training). Marketing CTAs below stay focused on conversion without repeating auth options.

## Changes (all in `src/pages/Auth.tsx`)

1. **`ArcHero`** — add a second button "Sign up" next to "Begin training". Both open the modal; "Sign up" sets `isSignUp = true`, "Begin training" keeps current behavior. Wire via a new `onSignUp` prop.

2. **`ArcProof`** — remove the "Sign in" ghost button. Keep only "Begin training". Drop the `onSecondary` prop.

3. **`ArcFinalCTA`** — remove the "Sign in" ghost button. Keep only "Begin training". Drop the `onSecondary` prop.

4. **`Auth` component body** — update the JSX call sites:
   - Pass `onSignUp={() => { setIsSignUp(true); setModalOpen(true); }}` to `ArcHero`.
   - Remove `onSecondary` from `ArcProof` and `ArcFinalCTA` calls.
   - `ArcNav` Sign in button stays as-is.

5. Ensure the existing modal already supports opening directly into Sign up mode (it does — `isSignUp` state already exists at line 381).

## Out of scope

- No visual redesign of the landing page.
- No changes to the modal, auth flow, or routing.
- No copy changes beyond the new "Sign up" button label.
