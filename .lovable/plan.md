

# Spacing & Rhythm Refinement — Drill.tsx

Single file, 5 targeted edits:

## 1. Answer choice rows (line ~1602-1606)
Remove `border-b border-border`, change `py-1.5` → `py-3.5`, add `rounded-lg`:
```
"group relative flex items-start gap-3 py-3.5 px-4 -mx-4 rounded-lg",
"transition-all duration-[120ms] ease-out",
isEliminated && "opacity-55",
showGreenHighlight && "bg-green-50 border-l-4 border-l-green-500"
```

## 2. RadioGroup spacing (line 1891)
`space-y-0` → `space-y-1`

## 3. Left panel padding (line 1795)
`p-5 sm:p-6 max-w-4xl` → `p-6 sm:p-8 max-w-3xl`

## 4. Right panel padding (line 1834)
`p-5 sm:p-6 max-w-3xl` → `p-6 sm:p-8 max-w-3xl` (keep current max-width)

## 5. Stem-to-answer gap (line 1836)
`mb-3` → `mb-6`

No structural, color, or component changes.

