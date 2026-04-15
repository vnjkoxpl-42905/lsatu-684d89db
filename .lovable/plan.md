

## Analysis: Why the Third Bootcamp Card Is Missing

### What happened
The code in `Bootcamps.tsx` **does** contain 3 entries — Causation Station, Main Conclusion & Role, and Abstraction (lines 38-47). The route in `App.tsx` is registered. All 5 abstraction module files exist. **The code looks correct on paper.**

The most likely cause: the content overhaul edit (rewriting `data.ts` with 345 lines of content, creating `InteractiveStemDrill.tsx` and `AdvancedQuizViewer.tsx`) introduced a **build failure**. When the build fails, the preview serves a stale cached version — which is the 2-card version from before the Abstraction card was added or before it compiled successfully.

### Secondary issue: stale metadata
Even if the build succeeds, `Bootcamps.tsx` line 44 still says:
```
stats: ['5 Sections', 'Worked Examples', 'Structural Analysis']
```
This is leftover from the old content. It should now reflect the 2-module structure: `['2 Modules', '15 Stem Exercises', '6 Quiz Questions']`.

### What the plan will fix

| Step | File | Change |
|------|------|--------|
| 1 | `src/pages/Bootcamps.tsx` | Rename title from "Abstraction" to **"Abstract"**. Update stats to `['2 Modules', '15 Exercises', '6 Questions']`. Update description to match the new content. |
| 2 | `src/components/bootcamp/abstraction/AbstractionBootcamp.tsx` | Change all UI text from "Abstraction" to **"Abstract"** (header label line 45, sidebar label line 57). |
| 3 | All abstraction module files | Verify no syntax errors — re-save `data.ts`, `InteractiveStemDrill.tsx`, `AdvancedQuizViewer.tsx`, `types.ts` cleanly to ensure the build passes. |
| 4 | Build verification | Confirm the preview loads `/bootcamps` with all 3 cards visible. |

### Root cause summary
The content overhaul likely caused a silent build failure. The preview fell back to a cached build that predates the Abstraction card. The fix is to ensure all files compile cleanly and update the naming to "Abstract" per your preference.

