# Scan 3 — Foyer, Inbox, and Realtime

**Scope.** `src/pages/AcademyFoyer.tsx`, `src/pages/Inbox.tsx`, `src/components/foyer/*`, `src/components/inbox/*`, `src/hooks/useInbox.ts`, all `supabase.channel(...)` usage, `src/lib/askJoshua.ts`, `supabase/migrations/20260416234013_*.sql` (conversation RLS), `supabase/migrations/20260419000001_shorten_admin_display_name.sql`.

## Executive Summary

Confirms three of the old playbook's remaining issues (#1 mobile nav trap, #3 channel sprawl, #5 optimistic chat) and surfaces a severe product defect the old playbook did not name: **the "Ask Joshua" button on the Foyer is a dead button for any student who has not been messaged first.** The RLS policy on `conversations` INSERT is admin-only, so a student clicking Ask Joshua, writing a first message, and hitting Send gets a toast error and is stuck. The button is the single most-advertised student-to-admin affordance on the primary landing page.

On mobile, the Foyer is no longer a navigation surface. `FoyerSidebar` is `hidden md:block`. `FloatingMessenger` is explicitly suppressed on `/foyer`. The hero ring offers Smart Drill + Ask Joshua and a center focus card, and that is the entire navigable surface. Classroom, Practice, Bootcamps, Analytics, Schedule, WAJ, Flagged, Admin, and the Inbox list view are unreachable.

`formatParticipantName` is a well-designed utility used in 3 of 4 inbox surfaces. `FloatingMessenger` bypasses it and relies on a destructive DB migration (`20260419000001_shorten_admin_display_name.sql`) to mutate `display_name` at rest. The conversation RLS (`20260416234013`) is the strongest piece of security-aware schema work in the repo.

## Deep Findings

### F3.1 — Mobile Nav Trap confirmed (Playbook Issue #1)
**Evidence.** `src/pages/AcademyFoyer.tsx:89`: `<div className="hidden md:block pr-4"><FoyerSidebar .../></div>`. `src/components/inbox/FloatingMessenger.tsx:15`: `HIDDEN_ROUTES = ['/auth', '/onboarding', '/inbox', '/reset-password', '/foyer']`.
**Behavior.** On `<md` (768px) the sidebar (which holds the Workspace nav: Classroom, Practice, Bootcamps, Analytics, Schedule, plus inbox preview plus user footer) is hidden. The hero ring exposes two nodes (Smart Drill → `/drill`, Ask Joshua → inbox composer, sometimes broken per F3.4) and a center focus card with one CTA (also → `/drill`). `FloatingMessenger` is suppressed on Foyer. A student on a phone has three actions: drill, message admin (if thread exists), log out.
**Severity: 9/10.**
**Fix.** Do not add a bottom dock (forbidden by product rules). Options:
- **(A) Preferred:** hamburger in the existing 44px header that opens a `Sheet` exposing the `FoyerSidebar` content at fullscreen on mobile.
- (B) Convert `FoyerSidebar` to a slide-in sheet on mobile, pinned on desktop.
- (C) Collapse nav to a single-row icon tray above the ring that expands to full nav on tap.

### F3.2 — WebSocket channel sprawl via `Math.random` (Playbook Issue #3)
**Evidence.** `src/hooks/useInbox.ts:141`: `.channel(`inbox-feed-${user.id}-${Math.random().toString(36).slice(2)}`)`. Contrast with line 215: `.channel(`conv-${conversationId}`)` (correct deterministic name).
**Behavior.** Every mount or remount of `useInbox` creates a channel with a new random suffix. Hook is consumed by multiple components per route:
- `/foyer`: `AcademyFoyer` (1 channel) + `FloatingMessenger` hook runs before its `/foyer` early-return (2nd channel) = 2 active channels.
- `/inbox`: `Inbox` page (1) + `FloatingMessenger` hook (2) + `useConversationMessages` (3, deterministic, fine) = 2 `useInbox` channels + 1 conv channel.
- `/drill`, `/waj`, `/analytics`, etc.: `FloatingMessenger.useInbox` (1 channel).

The `supabase.removeChannel` cleanup unsubscribes on unmount, but the random suffix means the server sees a unique topic per component instance even though the intent is identical.
**Severity: 6/10.**
**Fix.** Drop the random suffix: `` `inbox-feed-${user.id}` ``. Better: hoist `useInbox` into `<InboxProvider>` so there is exactly one subscription per tab.

### F3.3 — No optimistic chat (Playbook Issue #5)
**Evidence.** `src/components/inbox/MessageComposer.tsx:64-101`. `send()` inserts `messages` row, awaits, optionally uploads attachment, then calls `onSent?.()`.
**Behavior.** Message does not appear until `useConversationMessages.refresh()` completes OR the realtime INSERT event arrives. Typical latency 200–800ms on good connections, worse on spotty. No pending message bubble, only a disabled `Send` button during `sending`. Compared to any modern messaging surface, it feels broken.
**Severity: 7/10** against premium UX benchmark; 5/10 against pure technical risk.
**Fix.** On send: synchronously append a local `Message` with `status: 'pending'`, clear composer, fire the insert. On success, reconcile via client-generated UUID. On failure, mark `status: 'failed'` with retry affordance. Realtime channel becomes a reconciler for other-party messages only.

### F3.4 — "Ask Joshua" is a dead button for students without an existing thread
**Evidence.** `src/pages/AcademyFoyer.tsx:57-68` (`handleAskJoshua`). `src/lib/askJoshua.ts:findAdminConversationId`. `src/components/inbox/NewConversationDialog.tsx:92-130` (`create` function). `supabase/migrations/20260416234013_49bfd508-03f2-4942-a636-2763f1f3af5b.sql:74-75`: `CREATE POLICY "Admins can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());`.
**Behavior.** If `findAdminConversationId` returns null (student has never been messaged by admin), `handleAskJoshua` navigates to `/inbox` with `composeWith: ADMIN_USER_ID`. `NewConversationDialog` auto-opens. Student writes message, hits Send. `create()` attempts `supabase.from('conversations').insert(...)`. RLS blocks (admin-only). Student gets toast error. Stuck. The code acknowledges this in a comment on `AcademyFoyer.tsx:63-64`: "Students can't INSERT conversations per RLS; composer surfaces the error. Admin-level plumbing to allow student-initiated threads is a separate ticket."

The button is fully enabled (only dimmed when user is admin themselves). Students see a bright, clickable button. They click it. They are blocked.
**Severity: 9/10.**
**Fix options:**
- **(A) Today stopgap:** pass `onAskJoshua={undefined}` when `findAdminConversationId` returns null. Button dims. Add a tooltip "Joshua will reach out to start your first conversation."
- **(B) Right fix:** Edge Function `start-admin-conversation` with service-role credentials that creates the conversation, inserts both participants, returns the conversation ID. Call it from `handleAskJoshua` when no thread exists.
- (C) Add a second INSERT policy on `conversations` permitting students to create exactly one thread that includes the admin as participant. More fragile.

Ship (A) immediately; plan (B) within the week.

### F3.5 — Hero ring has 2 nodes, CLAUDE.md says 3
**Evidence.** `src/components/foyer/FoyerHeroRing.tsx` defines `TOP` (Smart Drill, 12 o'clock) and `BOTTOM` (Ask Joshua, 6 o'clock). No "Resume" node. The center focus card is the Resume affordance. `CLAUDE.md:27` describes it as "3 nodes: Smart Drill, Resume, Ask Joshua."
**Severity: 3/10.**
**Fix.** Update CLAUDE.md to "2 nodes plus center focus card" or ship a third node. Decide and align.

### F3.6 — `FloatingMessenger` bypasses `formatParticipantName`
**Evidence.** `src/components/inbox/FloatingMessenger.tsx:32-39`:
```
const realNames = others
  .map((o) => o.display_name?.trim())
  .filter((n): n is string => !!n);
return realNames.join(', ') || active.subject || 'Conversation';
```
Contrast: `ThreadList`, `ConversationView`, `InboxPreviewCard` all use `formatParticipantName(display_name, is_admin)` which returns `"Joshua"` for admin unconditionally. The migration `20260419000001_shorten_admin_display_name.sql` mutates the DB (`SET display_name = SPLIT_PART(display_name, ' ', 1) WHERE class_id IN (SELECT user_id::text FROM user_roles WHERE role = 'admin')`) so even the unformatted path renders "Joshua" today.

**Failure modes this exposes:**
- New admin added with full name, migration not re-run → full name leaks in FloatingMessenger.
- Admin updates profile via Onboarding/Profile page → overwrites "Joshua" with whatever they typed.
- Two sources of truth (helper + DB-normalized value) that will drift.

**Severity: 5/10.**
**Fix.** Replace the bypass with `formatParticipantName(o.display_name, o.is_admin)`. Consider reverting the `shorten_admin_display_name` migration after all four surfaces use the helper.

### F3.7 — `NewConversationDialog` fetches up to 200 profiles, client-side filter
**Evidence.** `src/components/inbox/NewConversationDialog.tsx:52-60`: `supabase.from('profiles').select('class_id, display_name').neq('class_id', user.id).limit(200)`.
**Severity: 4/10.** Latent. Fine for current cohort; silently truncates at 200.
**Fix.** Replace client filter with server-side `.ilike('display_name', '%${filter}%')` and drop the 200 cap.

### F3.8 — `useInbox` and `useConversationMessages` have unread-state race
**Evidence.** `useInbox.loadConversations()` computes `unread` from `lastMsg.created_at > lastRead`. `useConversationMessages` updates `last_read_at` on mount and on every `messages.length` change. When a thread is open and a new message arrives, three things fire near-simultaneously: conv-channel INSERT → `load()` → `last_read_at` update; inbox-feed INSERT → `loadConversations` runs with stale `last_read_at` → unread briefly true.
**Behavior.** Visible flicker.
**Severity: 3/10.**
**Fix.** Compute unread locally on receive, or serialize the `last_read_at` update before the unread recalc.

### F3.9 — `ConversationView` auto-scrolls on every message change
**Evidence.** `src/components/inbox/ConversationView.tsx:24-26`: `useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length]);`.
**Behavior.** Reader scrolls up to re-read an earlier message, new message arrives, view yanks back to bottom. Standard chat UX bug.
**Severity: 4/10.**
**Fix.** Capture `isNearBottom = (scrollTop + clientHeight >= scrollHeight - 40)` before the append. Only auto-scroll if true.

### F3.10 — `MessageComposer` attachment upload has no rollback
**Evidence.** `src/components/inbox/MessageComposer.tsx:74-94`. Sequence: insert `messages` row → upload to storage → insert `message_attachments` row. No rollback on partial failure.
**Behavior.** Step 2 fails after step 1 → message row without attachment indication. Step 3 fails after step 2 → orphaned PDF in storage.
**Severity: 4/10.**
**Fix.** Server-side RPC for atomic send. Or at minimum, storage cleanup on attachment-row-insert failure.

### F3.11 — `ADMIN_USER_ID` hardcoded
**Evidence.** `src/lib/askJoshua.ts:8`. Comment explains: avoids per-foyer-click round-trip.
**Behavior.** Pragmatic but rotation requires hand-edit + deploy. UUID semi-public (visible in bundle to any authenticated user inspecting network).
**Severity: 3/10.**
**Fix.** `useAdmin()` hook with cached `user_roles` lookup + localStorage persistence.

### F3.12 — SVG Hero Ring rule respected
**Evidence.** `FoyerHeroRing.tsx` renders via SVG circles with `viewBox="0 0 500 500"`, trig-positioned nodes, shared `R=215`.
**Severity: 0 (positive confirmation).**

### F3.13 — `FloatingMessenger` is single-surface, correctly gated
**Evidence.** Mounted globally in `App.tsx:31` below `<Routes>`, inside `BrowserRouter`. Hidden via `HIDDEN_ROUTES` on Foyer/Inbox/Auth/Onboarding/ResetPassword.
**Severity: 0 (positive confirmation).**

### F3.14 — `InboxPreviewCard` renders admin correctly
**Evidence.** `src/components/foyer/InboxPreviewCard.tsx:60-62` uses `formatParticipantName(other.display_name, other.is_admin)`.
**Severity: 0 (positive confirmation).**

### F3.15 — Realtime `conversation_participants` subscription correctly scoped
**Evidence.** `useInbox.ts:144`. INSERT filter `user_id=eq.${user.id}`. Fires only when the current user is added to a new conversation.
**Severity: 0 (positive confirmation).**

### F3.16 — Admin-only `polish-message` correctly gated
**Evidence.** `MessageComposer.tsx:21`: `const showPolish = !permissions.loading && permissions.is_admin;`. Edge function `supabase/functions/polish-message/index.ts` also runs `verifyAdmin` server-side.
**Severity: 0 (positive confirmation).**

### F3.17 — `get_conversation_participant_names` RPC is a standout
**Evidence.** `supabase/migrations/20260419055223_*.sql`. `SECURITY DEFINER` function returning `user_id, display_name, is_admin` only for users who share a conversation with the caller. Lets the client resolve names + admin flag in one round-trip without widening RLS on `profiles` or `user_roles`.
**Severity: 0 (positive confirmation). This is the reference quality for schema work in this repo.**

## Scores (Scan 3 slice)

| Axis | Score |
|---|---|
| Architecture quality | 66 / 100 |
| Maintainability | 70 / 100 |
| UI/design consistency | 74 / 100 |
| Product vision alignment | 62 / 100 |
| Bug/risk level | 60 / 100 |

## Next Actions (ranked)

1. Fix mobile nav trap. Option A (hamburger sheet) is ~2 hours of work.
2. Fix dead Ask Joshua button. Stopgap: dim + tooltip today. Right fix: `start-admin-conversation` Edge Function.
3. Optimistic message send in `MessageComposer`.
4. Drop `Math.random` from `useInbox.ts:141` inbox-feed channel name.
5. Replace `FloatingMessenger` raw-display_name with `formatParticipantName`. Then unwind the `shorten_admin_display_name` migration.
6. Hoist `useInbox` into `<InboxProvider>`. Pairs with `<PermissionsContext>` from F1.1.
7. Fix `ConversationView` auto-scroll to respect reader position.
8. Update CLAUDE.md — 2 nodes + center card, or ship a Resume node.
9. Server-side search for `NewConversationDialog`.
10. Server-side transactional send RPC for messages with attachments.

## Known Open Questions

- Is the `shorten_admin_display_name` migration intended to be load-bearing or a one-time cleanup? Decides whether F3.6's migration revert is safe.
- What is the current user count? Decides urgency on F3.7 (200-cap) and F3.2 (channel sprawl compounding).
