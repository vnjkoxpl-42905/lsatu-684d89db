# Teacher Desk Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-data-first `/teacher/desk-preview` route that implements the approved soft graphite Teacher Desk / Today design without replacing the existing `/teacher` page.

**Architecture:** Add a preview page under the existing teacher route tree, preserving the current `TeacherShell` and `QuestionBankProvider` coverage. Normalize existing app signals into three task modes inside the page: Reply, Review, and Assign. Keep mutations light and safe: Review draft approval and upload mark-reviewed can use existing hooks/tables; Reply and Assign fast actions route to existing deeper surfaces unless the existing plumbing supports direct action.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, TanStack Query, Supabase hooks, lucide-react, existing teacher hooks.

---

### Task 1: Route Wiring

**Files:**
- Modify: `src/App.tsx`
- Create: `src/pages/teacher/TeacherDeskPreview.tsx`

- [ ] **Step 1: Add the lazy import**

Add near the other teacher lazy imports:

```ts
const TeacherDeskPreview = React.lazy(() => import("./pages/teacher/TeacherDeskPreview"));
```

- [ ] **Step 2: Register the preview route**

Inside the nested `/teacher` route, add:

```tsx
<Route path="desk-preview" element={
  <React.Suspense fallback={<div />}>
    <TeacherDeskPreview />
  </React.Suspense>
} />
```

Expected behavior: `/teacher/desk-preview` renders inside `TeacherShell`, remains admin-only, and stays inside the wildcard route's `QuestionBankProvider`.

### Task 2: Task Adapter And Page Skeleton

**Files:**
- Create: `src/pages/teacher/TeacherDeskPreview.tsx`

- [ ] **Step 1: Build local task types**

Define:

```ts
type DeskMode = 'reply' | 'review' | 'assign';
type ContextKey = 'student' | 'history' | 'analytics' | 'source';
type AssistantScope = 'task' | 'workspace';

interface DeskTask {
  id: string;
  mode: DeskMode;
  verb: 'Reply' | 'Review' | 'Assign';
  subject: string;
  reason: string;
  timing: string;
  sourceLabel: string;
  title: string;
  preview: string;
  studentId?: string;
  studentName?: string;
  suggested?: boolean;
  priority: number;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  openPath: string;
  sourceKind: 'conversation' | 'draft' | 'upload' | 'assignment-gap';
  sourceId?: string;
}
```

- [ ] **Step 2: Reuse real data hooks**

Use:

```ts
const { rows: students = [], loading: studentsLoading, error: studentsError } = useHubStudents();
const { data: drafts = [], isLoading: draftsLoading } = useAITADrafts({ status: 'draft' });
const { data: uploads = [], isLoading: uploadsLoading } = useAdminUploadsQueue();
```

- [ ] **Step 3: Normalize tasks**

Create task arrays:

- Reply tasks from `students.filter((s) => s.has_unread_from_student)`.
- Review tasks from pending `ai_ta_drafts` and `external_work_uploads`.
- Assign tasks from students with no assignments or high completion.

Sort each mode by `priority`, show 3 visible tasks, and preserve a selected task per current mode.

### Task 3: Soft Graphite UI

**Files:**
- Modify: `src/pages/teacher/TeacherDeskPreview.tsx`

- [ ] **Step 1: Build the light graphite canvas**

Use a full-height page with:

- Pale gray/blue-gray background.
- Faint grid via CSS background-image utilities or inline style.
- Top metadata line with date, `Teacher Desk`, and `Next session`.
- Minimal left global rail mirroring the approved IA.
- Inner mode list with Reply, Review, Assign counts.

- [ ] **Step 2: Build dense task rows**

Rows show:

```text
Verb | Subject | Reason | Timing
```

Rows do not show content previews. Selected row uses strong black state.

- [ ] **Step 3: Build the persistent cube and selected work surface**

Use CSS linework for the cube, with a selected-mode marker and small orbit. Below/around it render:

- Selected task title.
- Student/context.
- Source label.
- Two-to-three-line preview.
- Light editing controls:
  - Reply: compact textarea placeholder and open conversation action.
  - Review draft: textarea seeded from draft markdown and approve/open actions.
  - Review upload: mark reviewed/open source actions.
  - Assign: compact material picker and due date input, then open Assign action.

- [ ] **Step 4: Build right action/context panel**

Actions first, compact context second. Include toggles for Student, History, Analytics, and Source. Keep context inside the right panel.

- [ ] **Step 5: Build assistant command line shell**

Add bottom-center command line with `Task / Workspace` scope toggle. It is a truthful shell: disabled when no current assistant execution path is wired.

### Task 4: Safe Mutations And Navigation

**Files:**
- Modify: `src/pages/teacher/TeacherDeskPreview.tsx`

- [ ] **Step 1: Wire Review draft approval**

Use `useUpdateDraftStatus()` and call:

```ts
await updateDraftStatus.mutateAsync({ id: task.sourceId, status: 'approved' });
```

Then show `toast.success('Draft approved')`.

- [ ] **Step 2: Wire upload mark-reviewed**

For upload tasks, update `external_work_uploads`:

```ts
await supabase
  .from('external_work_uploads')
  .update({ processing_status: 'parsed', reviewed_at: new Date().toISOString() })
  .eq('id', task.sourceId);
```

Then invalidate `external-uploads-queue`.

- [ ] **Step 3: Keep Reply and Assign safe**

Reply primary action opens `/teacher/conversations`. Assign primary action opens `/teacher/library/assignments/new` or the selected student detail. Do not fake direct send or assignment creation.

### Task 5: Verification

**Files:**
- Modify only files above unless a type check identifies a direct required fix.

- [ ] **Step 1: Type/lint targeted files**

Run:

```bash
npx eslint src/App.tsx src/pages/teacher/TeacherDeskPreview.tsx
```

Expected: no errors in touched files.

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected: either successful build or the known local `esbuild` native binary mismatch before app compilation. Do not change dependencies unless explicitly required.

- [ ] **Step 3: Browser smoke test**

Start dev server if needed and open:

```text
http://localhost:8080/teacher/desk-preview
```

Expected: route loads or redirects through auth/admin guard. If authenticated, the preview page shows the soft graphite Teacher Desk with Reply, Review, Assign.

- [ ] **Step 4: Commit and push**

Stage only:

```bash
git add src/App.tsx src/pages/teacher/TeacherDeskPreview.tsx docs/superpowers/plans/2026-06-16-teacher-desk-preview.md
git commit -m "feat: add teacher desk preview"
git push origin main
```
