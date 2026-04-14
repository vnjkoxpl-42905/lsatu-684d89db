

## Plan: Integrate "Role Questions" Bootcamp

### Summary
Add the "Role Questions" bootcamp from the GitHub repository as a new entry in the Bootcamps hub. The original project uses server-side APIs, so the content will be adapted to a self-contained client-side page matching the existing pattern used by `MainConclusionRole.tsx` and `CausationStation.tsx`.

### What will change

#### 1. Create the Role Questions data file
- New file: `src/data/roleQuestions/content.ts`
- Contains the 5 lesson sections from the GitHub repo's `content.ts`, structured as typed module data with lesson text and section metadata

#### 2. Create the Role Questions bootcamp page
- New file: `src/pages/RoleQuestions.tsx`
- Self-contained page following the same pattern as `MainConclusionRole.tsx`: sidebar module list, section navigation, lesson rendering with markdown-style content, progress tracking
- Uses existing UI components (Button, ThemeToggle, LogoutButton, framer-motion)
- No server API calls — all content is inline/imported from the data file
- Auth-gated (redirects to `/auth` if not logged in)

#### 3. Register the new bootcamp route
- Add `/bootcamp/role-questions` route in `App.tsx` inside the `QuestionBankProvider` wrapper

#### 4. Add entry to the Bootcamps hub
- Update `src/pages/Bootcamps.tsx` — add a new card to the `BOOTCAMPS` array:
  - Title: "Role Questions"
  - Emoji: "🔍"
  - Description based on the content (mastering role questions, identifying statement functions in LSAT arguments)
  - Route: `/bootcamp/role-questions`

### Files to create/modify
- **Create**: `src/data/roleQuestions/content.ts`
- **Create**: `src/pages/RoleQuestions.tsx`
- **Modify**: `src/App.tsx` (add route)
- **Modify**: `src/pages/Bootcamps.tsx` (add card)

