

## Plan: Create "Abstraction" as an Independent Bootcamp

### Summary
Rename and decouple the GitHub repo content (currently labeled "Role Questions") into a fully independent bootcamp called **"Abstraction"**. It gets its own self-contained module directory, separate route, and distinct card in the Bootcamps hub — completely independent from "Main Conclusion & Role" or anything else.

### Changes

#### 1. Create self-contained module: `src/components/bootcamp/abstraction/`
- **`types.ts`** — interfaces (`AbstractionSection`, `AbstractionModule`)
- **`data.ts`** — content from current `src/data/roleQuestions/content.ts`, with module id/title/description updated to reflect "Abstraction" identity
- **`AbstractionBootcamp.tsx`** — full UI component (sidebar, card renderer, completion logic) extracted from current `RoleQuestions.tsx`

#### 2. Create thin page wrapper: `src/pages/Abstraction.tsx`
```tsx
import AbstractionBootcamp from '@/components/bootcamp/abstraction/AbstractionBootcamp';
export default function Abstraction() {
  return <AbstractionBootcamp />;
}
```

#### 3. Update `src/App.tsx`
- Remove `/bootcamp/role-questions` route
- Add `/bootcamp/abstraction` route pointing to the new page

#### 4. Update `src/pages/Bootcamps.tsx`
- Replace the "Role Questions" card with:
  - **Title**: "Abstraction"
  - **Emoji**: 🧬
  - **Description**: TBD — we'll refine together
  - **Route**: `/bootcamp/abstraction`

#### 5. Delete old files
- `src/data/roleQuestions/content.ts` (and empty directory)
- `src/pages/RoleQuestions.tsx`

### Files
| Action | File |
|--------|------|
| Create | `src/components/bootcamp/abstraction/types.ts` |
| Create | `src/components/bootcamp/abstraction/data.ts` |
| Create | `src/components/bootcamp/abstraction/AbstractionBootcamp.tsx` |
| Create | `src/pages/Abstraction.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/pages/Bootcamps.tsx` |
| Delete | `src/data/roleQuestions/content.ts` |
| Delete | `src/pages/RoleQuestions.tsx` |

No functional changes to content — just restructured into its own independent module with a new identity. From here we can iterate on the content and features together.

