

# Messaging System Plan

## 1. Routes & Pages

- **`/inbox`** — new route, gated by auth (no permission flag — messaging is universal)
  - Two-pane layout on desktop: thread list (left, ~360px) + conversation view (right)
  - Mobile: thread list is the page; tapping a thread navigates to `/inbox/:conversationId`
- Update dock Inbox item in `AcademyFoyer.tsx` → real `link: "/inbox"` (remove "coming soon" toast)
- Add route in `App.tsx` (no QuestionBank wrapper needed)

## 2. Database Structure

Four new tables:

**`conversations`**
- `id` uuid PK
- `subject` text (optional)
- `created_by` uuid (auth.users.id)
- `created_at`, `last_message_at` timestamptz

**`conversation_participants`**
- `id` uuid PK
- `conversation_id` uuid → conversations
- `user_id` uuid
- `last_read_at` timestamptz (drives unread count)
- unique (conversation_id, user_id)

**`messages`**
- `id` uuid PK
- `conversation_id` uuid → conversations
- `sender_id` uuid
- `body` text
- `created_at` timestamptz
- Trigger: bump `conversations.last_message_at` on insert

**`message_attachments`**
- `id` uuid PK
- `message_id` uuid → messages
- `storage_path` text (path in bucket)
- `file_name` text
- `file_size` int
- `mime_type` text (validate `application/pdf`)

**RLS** — all gated through participant membership via a `SECURITY DEFINER` helper:
```
is_conversation_participant(_conv_id, _user_id) → bool
```
Avoids recursion. Policies:
- conversations: SELECT/UPDATE if participant; INSERT if admin OR creating with self as participant
- participants: SELECT own + co-participants; INSERT by admin or conversation creator
- messages: SELECT if participant; INSERT if participant AND sender_id = auth.uid()
- attachments: SELECT/INSERT mirroring parent message access
- Admins (`has_role(auth.uid(), 'admin')`) can SELECT/INSERT across all (start conversations with any student)

## 3. Storage

- New private bucket: **`message-attachments`** (public = false)
- Path convention: `{conversation_id}/{message_id}/{filename}`
- Storage RLS on `storage.objects`:
  - SELECT: user is participant of the conversation in path[1]
  - INSERT: same check + admin override
- Client uploads via `supabase.storage.from('message-attachments').upload(...)`, then inserts `message_attachments` row with the path
- Download via signed URLs (60s expiry) on click — no public links
- Client-side: enforce PDF mime + 20MB max before upload

## 4. Permission Model

| Actor | Can do |
|-------|--------|
| Admin | Start conversation with any student; reply in any conversation; see all threads they participate in (admins are added as participants when they start one) |
| Student | Reply in conversations they are a participant of; cannot start new conversations (v1) |
| Anyone | Only sees messages/attachments in their own conversations (RLS-enforced) |

This matches the stated use case ("communicate back and forth with students"). Student-initiated threads can be added later without schema changes.

## 5. Inbox + Thread UI

**`src/pages/Inbox.tsx`** — shell with two panes, fetches thread list

**Components (`src/components/inbox/`)**:
- `ThreadList.tsx` — list rows: avatar/initial, participant name, last message preview, relative timestamp, unread dot. Sorted by `last_message_at` desc.
- `ConversationView.tsx` — header (participant name, back button on mobile), scrollable message list, composer at bottom. On open: marks `last_read_at = now()`.
- `MessageBubble.tsx` — sender-aligned bubbles (own = right, neutral surface; other = left, accent surface), timestamp, attachment cards inline
- `AttachmentCard.tsx` — PDF icon, filename, size, "Open" button → fetches signed URL → opens in new tab
- `MessageComposer.tsx` — textarea (auto-grow), paperclip button (PDF picker), send button. Shows pending attachment chip before send.
- `NewConversationDialog.tsx` (admin only) — student picker + initial subject + first message

**Realtime**: subscribe to `messages` filtered by participant conversation IDs → append on insert. Update thread list `last_message_at` and unread badge live.

**Design**: matches existing premium dark theme — `bg-card`, `border-border`, subtle `shadow-sm`, generous spacing, no flashy gradients. Unread dot uses bronze accent.

## 6. Files Touched

**New:**
- `supabase/migrations/<ts>_messaging.sql` (tables + RLS + helper fn + trigger + bucket + storage policies)
- `src/pages/Inbox.tsx`
- `src/components/inbox/ThreadList.tsx`
- `src/components/inbox/ConversationView.tsx`
- `src/components/inbox/MessageBubble.tsx`
- `src/components/inbox/AttachmentCard.tsx`
- `src/components/inbox/MessageComposer.tsx`
- `src/components/inbox/NewConversationDialog.tsx`
- `src/hooks/useInbox.ts` (data fetching + realtime)

**Edited:**
- `src/App.tsx` — add `/inbox` route (auth-gated, no permission flag, no QuestionBank wrapper)
- `src/pages/AcademyFoyer.tsx` — Inbox dock item: replace toast onClick with real `link: "/inbox"`; keep unread badge wired to real count from `useInbox`
- `.lovable/memory/index.md` + new memory `mem://features/messaging.md`

## 7. Out of Scope (v1)

- Group conversations beyond 2 people (schema supports it; UI is 1:1)
- Student-initiated new threads (admin starts; student replies)
- Message edit/delete
- Non-PDF attachments
- Push/email notifications

