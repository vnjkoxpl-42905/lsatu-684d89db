

## Goal
Make light mode the default for all users (new + existing without a saved preference).

## Root cause
`src/contexts/ThemeContext.tsx` initializes state with `'dark'` when no `localStorage` value exists:
```ts
const saved = localStorage.getItem('lsatu-theme');
return (saved === 'light' ? 'light' : 'dark') as Theme;
```
Also `src/index.css` sets `color-scheme: dark` on `:root` and the dark palette is the default token set, with `.light` overriding. (Note: `.dark` class currently mirrors light values — pre-existing quirk, out of scope.)

## Change
Single file: `src/contexts/ThemeContext.tsx`
- Default to `'light'` when no saved value exists.
- Keep respecting an explicit saved `'dark'` preference so users who chose dark keep it.

```ts
return (saved === 'dark' ? 'dark' : 'light') as Theme;
```

Also add `root.classList.add('light')` on initial mount path (the existing effect already toggles correctly, so just flipping the default is enough — the effect runs on mount and applies the class).

## Out of scope
- No changes to `index.css` token palette.
- No change to the `.dark` class alias quirk.
- No change to `ThemeToggle` UI.
- No migration of existing dark users — they keep their saved choice.

## Files
- `src/contexts/ThemeContext.tsx` — flip default from dark to light.

