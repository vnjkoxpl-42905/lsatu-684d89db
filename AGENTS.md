# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the React app. Key areas are `src/pages/` for route-level screens, `src/components/` for shared UI, `src/hooks/` for data and permission hooks, `src/lib/` for utilities, and `src/integrations/supabase/` for client and generated types. Feature-specific systems live under `src/features/`, `src/bootcamps/`, and `src/topics/`. Backend logic lives in `supabase/functions/`, and database migrations are in `supabase/migrations/`.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server.
- `npm run build` creates a production bundle.
- `npm run lint` runs ESLint across the repo.
- `npm run test` runs the Vitest suite once.
- `npm run test:watch` keeps Vitest running in watch mode.

## Coding Style & Naming Conventions
Use TypeScript and React function components. Follow the existing code style: 2-space indentation, single quotes in many app files, and path aliases like `@/components/...`. Name page components with `PascalCase` (for example `TeacherShell.tsx`) and keep route files grouped by domain under `src/pages/teacher/` or `src/pages/admin/`. Prefer small, local changes that match the surrounding patterns over introducing new abstractions.

## Testing Guidelines
Vitest is the primary unit-test runner, with React Testing Library available for component tests. Keep test filenames close to the code they cover, typically `*.test.ts` or `*.test.tsx`. Add tests for route logic, permission gating, and backend helpers when a change affects shared behavior. Run `npm run test` and `npm run build` before handing off significant UI or routing work.

## Commit & Pull Request Guidelines
Recent commits use short, imperative messages, sometimes prefixed by scope, such as `feat(admin-inbox): ...` or `Fix ...`. Keep commits focused and descriptive. Pull requests should summarize the user-visible change, call out route or permission impacts, and include screenshots for UI work when relevant.

## Agent Workflow
After completing any code or documentation change, automatically stage the changed files, commit with a concise message, and push to `origin main` unless the user says otherwise. Use the explicit flow `git add <files>`, `git commit -m "message"`, then `git push origin main`.

Operate with maximum available autonomy. Do not ask before reading files, editing files, running terminal commands, installing dependencies, building, testing, committing, pushing, or accessing project-related local and connected files when relevant. Proceed automatically unless the user explicitly says `ask first`, `plan only`, or `do not edit`. When a tool or system permission prompt appears, choose the broadest available approval option; if permanent approval is not available, prefer session or one-time approval over stopping.

After any code fix, run the default delivery flow: make the fix, run `npm run build`, stage intended files, commit with a clear message, and push to `origin/main`. Final reports should include what changed, files changed, build result, commit hash, and whether the change was pushed.

## Smart Drill State Notes
On `/drill`, adaptive Smart Drill can display a `currentQuestion` that is not represented by `session.questionQueue[session.currentIndex]`. UI state keyed by question, such as eliminated/scratched answers, must read and write by `currentQuestion.qid`. Do not derive active-question state from the queue index unless the code path is explicitly limited to queued section/type drills.

## Security & Configuration Tips
Treat Supabase calls as sensitive. Do not hardcode secrets or service keys in client code. Update generated Supabase types when schema changes affect queries, and verify permission-sensitive routes with an admin account before merging.
