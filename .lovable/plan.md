## Problem

On the admin side there are currently up to **three separate floating chat surfaces** stacked in the bottom-right:

1. **Sparkles (gold)** — AI Tutor / `FloatingActions` (bootcamp only)
2. **Graduation cap** — `FloatingTAWidget` (Teaching Assistant — pick a student → AI-assisted TA chat)
3. **Chat bubble** — `FloatingMessenger` (real 1:1 student↔admin inbox)

Each opens its own panel, with its own student picker, on its own keyboard shortcut. As an admin you want **one** floating button that opens **one** panel where you can:

- Message any student directly (real Inbox threads)
- Talk to the Teaching Assistant (assign tasks, ask it things)

…without juggling three different fly-outs.

## Plan

Consolidate into a **single admin "Chat" surface** with two tabs inside one panel.

### 1. New unified component: `AdminChatHub`

Location: `src/components/chat-hub/AdminChatHub.tsx` (plus a small `ChatHubFab.tsx`).

- Single floating bubble bottom-right (replaces all three admin FABs).
  - Icon: `MessageSquare` with a small badge for unread inbox count.
- Opens a right-side fly-out (same Radix Dialog pattern as today's `FloatingTAWidget`) with **two tabs at the top**:
  - **Students** — reuses existing `ThreadList` + `ConversationView` from `src/components/inbox/`. Admin sees all their threads, can pick any and message. "New conversation" entry uses existing `NewConversationDialog`.
  - **Teaching Assistant** — reuses existing `StudentSelector` + `TAChatView` from `src/components/ta/`. Admin picks a student context (or "no student") and chats with the TA, including assigning tasks.
- Footer "Open full page" links: Students tab → `/inbox`, TA tab → `/admin/ta`.
- Remembers last active tab in `localStorage` (`admin-chat-hub-tab`).
- Keyboard shortcut `⌘J` opens the panel on the TA tab; existing `subscribeTAWidget` bus is rewired to open the hub on TA tab so existing triggers keep working.

### 2. Mounting

In `src/App.tsx`:

- Keep `FloatingMessenger` mounted **only for non-admin students** (gate on `!is_admin`). Students keep their single Messenger bubble — no change to student UX (matches existing memory rule).
- For admins, mount `AdminChatHub` instead of both `FloatingMessenger` and `FloatingTAWidget`.
- Remove the standalone `<FloatingTAWidget />` mount entirely (its functionality lives in the hub now).

In `src/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell.tsx`:

- The bootcamp `FloatingActions` (gold Sparkles + ⌘ palette) is already admin-gated. Leave the ⌘ palette button, but **remove the Sparkles AI Tutor button** since the TA tab in the hub now covers admin AI chat. ⌘J keyboard shortcut remains and routes into the hub's TA tab.

### 3. Hidden routes

Hub follows the union of current hidden-route lists:
- Hidden on `/auth`, `/onboarding`, `/reset-password`.
- Visible on `/foyer` for admin (the FoyerDock inbox pill is student-facing; admin still benefits from the hub there). If this collides visually with FoyerDock, hide on `/foyer` and rely on dock + `/inbox` page.
- Visible on `/admin/ta` and `/inbox` (the panel is supplemental; both pages keep working).

### 4. Result

**Admin** sees exactly **one** floating chat bubble everywhere it's allowed. Click it → tab between Students (real messaging) and Teaching Assistant (AI + task assignment). No more stacked icons.

**Student** is unchanged: still one Messenger bubble, no TA, no hub.

## Files

Create:
- `src/components/chat-hub/AdminChatHub.tsx`
- `src/components/chat-hub/ChatHubFab.tsx`

Edit:
- `src/App.tsx` — swap admin mounts; keep `FloatingMessenger` student-only.
- `src/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell.tsx` — drop Sparkles button from `FloatingActions`, keep ⌘J shortcut bound to hub.
- `src/components/ta/FloatingTAWidget.tsx` — leave file in place but no longer mounted (or delete in a follow-up once we've verified `/admin/ta` page doesn't import it).

## Out of scope

- No backend / RLS changes. Reuses existing `useInbox`, `useTAChat`, `StudentSelector`, `TAChatView` as-is.
- No change to student-side chat.
- No change to `/inbox` or `/admin/ta` full pages.
