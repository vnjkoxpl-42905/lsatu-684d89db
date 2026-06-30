# Teaching Assistant Command Input Design Spec

## Goal

Joshua should be able to drive the Teaching Assistant without remembering exact syntax. The composer should accept three equivalent input styles:

- Slash menu commands, e.g. `/assign`, `/prep`
- Student mentions, e.g. `@Sofia`
- Rough English, e.g. `reply sofia she cant login`

The implementation must not redesign the whole chat, add fake actions, expose unsupported actions as live, remove existing deterministic commands, or make Gmail the center of the work. Email is only one possible command category; the first pass is about the broader command system.

## Current State Confirmed From Code

### Commands already live

Frontend slash discovery lives in `src/components/ta/slashCommands.ts` and is rendered by `src/components/ta/SlashCommandPalette.tsx` inside `src/components/ta/TAChatView.tsx`.

Live slash entries:

- `/diagnose` - prefill-only prompt for student diagnostic
- `/assign` - prefill-only prompt for assignment drafting/search
- `/plan` - prefill-only prompt for four-week plan
- `/bootcamp` - prefill-only prompt for next bootcamp recommendation
- `/waj` - prefill-only prompt for wrong-answer-journal review
- `/status` - prefill-only prompt for assignment status summary
- `/prep` - prefill-only prompt for session prep
- `/inspect` - deterministic local route in `TAChatView`; invokes `useInspector` instead of the TA backend

Backend action commands in `supabase/functions/ta-agent/index.ts`:

- `assign <resource> to <student>` is deterministic via `ASSIGN_RE` and `tryDeterministic`
- `email <student>: <message>` is deterministic via `EMAIL_RE` and sends through Gmail immediately
- Gemini tool lane can propose:
  - `assign_guided_drill`
  - `assign_homework`
  - `assign_bootcamp_module`
  - `draft_and_assign_note`
  - `answer`

Client-side confirmed action execution is in `src/lib/agentActions.ts` and supports:

- guided drill assignment
- homework assignment
- bootcamp module assignment
- note assignment

### Commands that depend on Gemini

`ta-chat` always depends on the Lovable AI Gateway with `google/gemini-3-flash-preview`. This covers per-student diagnostic, WAJ review, study planning, session prep, library-context assignment drafting, and draft generation.

`ta-agent` depends on direct Gemini tool calling after deterministic routing fails. It uses `GEMINI_API_KEY` and defaults to `gemini-2.5-flash`. This covers fuzzy/generative action routing such as ambiguous assignment requests, notes, bootcamp module proposals, and free-form answers.

### Commands not implemented yet

These are requested but not currently live as first-class command-system capabilities:

- `@` mention picker in the composer
- Client-side mention insertion like `@Sofia`
- Normalization of rough English into a visible command preview before backend execution
- Consistent routing from slash commands, mentions, and rough English into the same intent system
- Clear distinction between live commands, analysis-only commands, confirmation-required actions, and unsupported actions
- First-class command discovery so Joshua can type `/`, `@name`, or rough English without knowing technical syntax
- Recommendation command for `what should @Student do next`
- Prep command for `prep me for @Student`
- Assignment command aliases like `assign causal flaw to @Student` and `give student causal flaw`
- Draft/reply/message-style intents as honest previews or `Coming soon` unless connected to real executors

Important safety mismatch:

- Existing deterministic email syntax sends immediately: `email NAME: body`.
- The new requirement says sends must preview/confirm first.
- The specific email flow is not the priority for this pass.
- Therefore this pass must not broaden email routing or make email examples drive the architecture.
- Existing deterministic email behavior should remain untouched unless a later task explicitly replaces it with a confirmation-backed email proposal.

## Surfaces

### `TAChatView`

`TAChatView` is shared by multiple surfaces:

- Floating per-student TA widget uses default `backend="ta-chat"`
- Student Hub AI Assistant uses default `backend="ta-chat"`
- Admin Chat Hub Teaching Assistant uses `backend="ta-agent"`

The new composer behavior should live mostly in `TAChatView` so slash and mention UX is consistent. Backend-dependent routing should remain backend-aware.

### `ta-chat`

Best for contextual analysis and drafting because it already loads:

- profile display name
- recent attempts
- wrong answer journal
- recent TA assignments
- teaching library search
- guided drill set search
- student context artifacts
- student sessions/transcripts/notes

It returns text and optional `draft_content`. It does not execute action proposals.

### `ta-agent`

Best for actions because it already has:

- global student resolution by `profiles.display_name`
- deterministic assignment resolution
- Gemini tool-call routing
- `action_proposal` persistence
- `ActionCard` confirmation flow
- confirmed execution through `agentActions.ts`

It currently has lighter context than `ta-chat`:

- attempts
- wrong answer journal qtypes
- recent assignments

It does not currently read message history, access settings, student context artifacts, or sessions.

## Desired Routing Model

All three input styles should normalize to the same internal command intent before the backend runs:

```ts
type TACommandIntent =
  | { kind: "analyze"; mode: "diagnose" | "plan" | "waj" | "status" | "next_work" | "prep"; student?: MentionedStudent; text: string }
  | { kind: "assign"; student?: MentionedStudent; resourceQuery: string; text: string }
  | { kind: "draft_or_message"; student?: MentionedStudent; mode: "draft_reply" | "inbox_message"; body: string; text: string; supported: boolean }
  | { kind: "inspect"; target: string }
  | { kind: "unknown"; text: string };
```

Normalization should be deterministic where possible:

- Slash command selection sets the intended mode and a human-readable prefill.
- Mention picker inserts visible `@Name` plus hidden metadata in the client where practical.
- Natural language parser maps common verbs and synonyms before falling through to Gemini.

Backend still resolves final student identity server-side by `profiles.display_name` or selected `student_id`. Client mention IDs are a convenience, not the authority.

## UX Behavior

### Slash menu

Current `/` menu mostly satisfies the requirement, but should be adjusted:

- Open on `/` at the current token, not only when the whole input starts with `/`.
- Keep current keyboard behavior: up/down, Tab/Enter select, Escape close.
- Existing commands stay.
- Add only command entries that can be represented truthfully:
  - `/next` - live analysis command for recommended next work
  - `/prep` - live session-prep command
  - `/assign` - live proposal command when routed through `ta-agent`
  - `/reply` or `/message` - only if clearly marked `Coming soon` or draft-only
- Unsupported commands must be shown as `Coming soon` and should not send fake actions.

### Mention picker

Add a small `MentionStudentPalette` parallel to `SlashCommandPalette`.

Data source:

- Use real `profiles.display_name`
- Query `profiles.select("class_id, display_name").order("display_name")`
- Reuse the query key/data shape from `StudentSelector` where possible

Trigger:

- Open when current token begins with `@`
- Filter by text after `@`
- Selecting a student inserts `@DisplayFirstName` if unique enough for readability, or `@Display Name` if needed
- Store mention metadata in component state:

```ts
type ComposerMention = {
  studentId: string;
  displayName: string;
  token: string;
};
```

Example insertion:

- User types `prep for @sof`
- Picks Sofia Medina
- Composer becomes `prep for @Sofia `
- Metadata stores `{ studentId, displayName: "Sofia Medina", token: "@Sofia" }`

If metadata is lost after manual edits, server-side name resolution still handles `@Sofia` by stripping `@`.

### Command preview

When the input resolves to a known intent, show a compact preview before Joshua sends:

- Analysis preview: `Recommend next work for Sofia`
- Assignment preview: `Prepare assignment proposal: causal flaw for Sofia`
- Prep preview: `Prepare session briefing for Sofia`
- Draft/message preview: `Draft reply for Sofia` or `Coming soon`

The preview is not the final confirmation. It is a non-technical explanation of what the TA thinks Joshua means.

Before any send/assign/student-data mutation, the existing or future action UI must show a real confirmation.

Existing assignment/note proposals already satisfy confirmation through `ActionCard`.

New draft/message/reply intents should initially be preview-only text or clearly marked `Coming soon` unless the real executor exists. Do not create fake confirmation buttons that do nothing.

## Natural Language Routing

Add a lightweight normalization step before backend invocation.

Suggested location:

- `src/components/ta/commandNormalization.ts` for client-side normalization and preview text
- `supabase/functions/ta-agent/index.ts` for server-side deterministic parsing of normalized patterns

Client normalization should produce a plain-English preview line before send:

Examples:

- `assign causal flaw to @Sofia`
  - Preview: `Assign work matching "causal flaw" to Sofia`
  - Route to `ta-agent` as `assign causal flaw to Sofia`
- `draft reply to @Sofia she says she cannot log in`
  - Preview: `Draft reply for Sofia using context: "she says she cannot log in"`
  - If no real reply executor exists, mark as `Coming soon` or route to draft-only analysis
- `what should @Sofia do next`
  - Preview: `Recommend next work for Sofia`
  - Route to analysis lane, not mutation
- `prep me for @Sofia`
  - Preview: `Prepare session briefing for Sofia`
  - Route to `ta-chat` if selected student context is available, or `ta-agent` answer if global

Rough English patterns:

- `reply sofia she cant login` -> draft reply
- `give sofia causal flaw` -> assign
- `what should sofia work on` -> next work recommendation
- `prep for my session with sofia` -> session prep

Parser priority:

1. `/inspect` remains deterministic local route.
2. Explicit slash command metadata.
3. Mentioned student metadata.
4. Rough natural-language regexes.
5. Existing deterministic `assign <resource> to <name>`.
6. Existing backend Gemini fallback.

## Data Use Requirements

Use real app data where available:

- student profile: `profiles`
- recent attempts: `attempts`
- wrong answer journal: `wrong_answer_journal`
- recent assignments: `ta_assignments`
- message history: inbox/conversation tables, only if implementing reply/message routing
- access settings: `profiles` permission columns or existing permission hooks, only if route needs it
- student sessions/context: `student_sessions`, `student_context` via `ta-chat`

Never invent:

- assignment existence
- student status
- access state
- analytics
- unread message state

If data is unavailable, say so explicitly.

## Implementation Plan

### Phase 1 - Composer discovery and mentions

Files:

- `src/components/ta/TAChatView.tsx`
- `src/components/ta/SlashCommandPalette.tsx`
- `src/components/ta/slashCommands.ts`
- new `src/components/ta/MentionStudentPalette.tsx`
- optional new `src/hooks/useTAStudents.ts`

Work:

- Extract student lookup from `StudentSelector` into reusable hook.
- Add mention palette with keyboard support mirroring slash palette.
- Make slash palette trigger from current token, not only beginning of input.
- Keep existing command chips and deterministic `/inspect`.

Verification:

- Type `/` opens slash menu.
- Type `assign /` does not incorrectly replace whole input unless intended.
- Type `@` opens real student picker.
- Selecting Sofia inserts `@Sofia`.
- Keyboard navigation works for both palettes.

### Phase 2 - Normalization preview

Files:

- new `src/components/ta/commandNormalization.ts`
- `src/components/ta/TAChatView.tsx`

Work:

- Parse slash/mention/natural input into `TACommandIntent`.
- Show a compact preview above the send button when an intent is recognized.
- Do not execute anything from the preview alone.
- Send normalized backend text only after Joshua sends.
- Keep unsupported draft/message/reply actions honest: either draft-only or `Coming soon`.

Verification:

- Examples normalize to the expected preview.
- Unknown text remains normal chat.
- Unsupported actions say `Coming soon` instead of pretending.

### Phase 3 - Backend routing safety

Files:

- `supabase/functions/ta-agent/index.ts`

Work:

- Strip leading `@` in `resolveStudent`.
- Add deterministic natural-language aliases for assignment:
  - `give <student> <resource>`
  - `assign <resource> to @<student>`
- Do not broaden immediate Gmail sending.
- Do not add new action kinds unless they have real executors and confirmation UI.

Verification:

- Existing `assign X to Y` still works.
- `assign causal flaw to @Sofia` resolves the student.
- `give sofia causal flaw` resolves as assignment.

### Phase 4 - Tests

Add targeted tests if the repo has nearby test patterns:

- command normalization unit tests
- mention insertion behavior if component tests are practical
- ta-agent parser tests if parser can be extracted to a pure module; otherwise document manual verification

Run:

- `npm run build`
- targeted tests if added

## First-Pass Scope Decision

This pass should implement the broader command-system foundation:

- `/` command discovery
- `@` student mentions using real `profiles.display_name`
- natural-language normalization for common teaching intents
- clear non-technical command previews
- honest `Coming soon` treatment for unsupported actions
- preservation of existing deterministic commands

This pass should not prioritize the Sofia/email example or rebuild Gmail sending.
