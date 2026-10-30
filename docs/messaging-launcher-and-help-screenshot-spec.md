# Messaging Launcher + Help-Screenshot Context — Build Spec

Status: BUILD-READY. Open items A and C decided (see below); B defaults to no-migration. Author: Jay 2 (spec), for Joshua + a build chat to implement (NOT Codex, NOT the spec author).
Scope: student-facing inbox messenger + help/screenshot flow. NOT the admin TA (`src/components/ta/`).

## Goal

Two fixes to the student → Joshua messaging experience:

1. **Bottom-right surfaces must never overlap.** The side chat panel is the primary surface. A floating launcher bubble appears **only when the panel is closed/collapsed** — never at the same time as the open panel, and never stacked on top of another launcher.
2. **Auto-screenshots must render as polished, published-looking messages.** When a student screenshots the page from inside the app, the message should show a clean framed image preview plus a tidy **context card** that names *what the screenshot is pointing at* and links Joshua straight to that page — not raw `— context — page:` text and not a generic `help-screenshot.png · 203.3 KB` file chip.

Do not: redesign the whole inbox, change the DB schema for messages/attachments, remove the existing unread-badge behavior, or touch the admin TA widget.

---

## Problem 1 — Bottom-right surfaces overlap

### Current state (confirmed from code)

Three elements mount globally in `src/App.tsx` (lines 103–117):

- **`src/components/inbox/FloatingMessenger.tsx`** — renders BOTH the round launcher button (`fixed bottom-6 right-6 z-40`, lines 139–170, unread badge 156–163) AND the side-chat panel (`fixed bottom-24 right-6 z-50`, lines 172–286). Open/close is local `useState` (line 43); the launcher is **not hidden while the panel is open**, so the round bubble sits under/over the open panel's composer. This is the overlap in the screenshot.
- **`src/components/help/FloatingHelpButton.tsx`** — a separate "?" launcher at **`fixed bottom-6 right-6 z-40`** (line 33) — the *same anchor and z-index* as the messenger launcher. On most content routes both render, so the two launchers collide.
- **`src/components/inbox/StudentCornerBubble.tsx`** — a transient proactive popup (`fixed bottom-24 right-6 z-50`, auto-dismiss 8s). It already silences itself while the messenger panel is open via `messengerOpenBus.ts` (`isMessengerOpen()`). This is the *only* existing cross-element coordination and is the pattern to extend.

There is **no collapse/minimize** control today — panels are binary open/close via an X.

### Desired behavior

One rule for the whole bottom-right stack: **at most one launcher visible, and never a launcher on top of an open panel.**

1. **Launcher hidden while its panel is open.** When the `FloatingMessenger` panel is open, hide its round launcher entirely. When the panel is closed, show the launcher. (The X inside the panel remains the close control.)
2. **Preserve the unread badge on the collapsed launcher.** When the panel is closed and there are unread messages, the launcher shows the count/dot (behavior already at lines 156–163 — keep it, just make sure it rides the now-conditional launcher).
3. **No two launchers at the same anchor.** The messenger launcher and the Help "?" launcher must not both occupy `bottom-6 right-6`. Resolution DECIDED — see below.

### Help launcher resolution (Open Item A — DECIDED: keep separate, de-conflicted, synchronous)

Joshua's call: **keep the Help "?" button as its own separate launcher — do NOT fold it into the messenger.** But it must be **de-conflicted and synchronous** with the messenger:

- **De-conflict the anchor.** The Help launcher and the messenger launcher must not both sit at `bottom-6 right-6 z-40`. Give them distinct, non-overlapping positions (e.g. stack vertically: one at `bottom-6`, the other offset above at ~`bottom-20`/`bottom-24`, same `right-6`), so two launchers never render on top of each other.
- **Synchronous visibility (mutual exclusion with open panels).** Their shown/hidden states stay in lockstep so you never see a launcher on top of an open surface:
  - When the **messenger panel is open**, hide BOTH launchers (messenger launcher and Help "?").
  - When the **Help sheet is open**, hide BOTH launchers.
  - When nothing is open, show both launchers in their de-conflicted, non-overlapping positions.
- Extend the existing `messengerOpenBus.ts` open-state bus (already used by `StudentCornerBubble`) into a shared "any bottom-right surface open?" signal that both launchers subscribe to. Add the Help sheet's open state to the same bus.

Net: two separate launchers, never overlapping each other, and both disappear whenever any panel/sheet is open. "Always just the side chat / sheet, never a floating icon on top of it."

### Acceptance criteria (Problem 1)

- Opening the side chat panel hides BOTH launchers (messenger + Help "?"); closing it restores them.
- Opening the Help sheet hides BOTH launchers; closing it restores them.
- With everything closed, the messenger and Help launchers render at distinct positions and never overlap each other.
- With the panel closed and unread messages present, the messenger launcher shows the unread badge.
- No route ever renders two launcher bubbles overlapping at the same corner, and no launcher ever sits on top of an open panel/sheet.
- `StudentCornerBubble`'s existing "quiet while panel open" behavior still works.
- Admin TA widget (`FloatingTAWidget.tsx`) is untouched.

---

## Problem 2 — Auto-screenshot renders raw instead of published

### Current state (confirmed from code)

The context payload already exists as a typed object. From `src/lib/helpContextBus.ts` (lines 12–18):

```ts
export interface HelpSnapshot {
  path: string;            // window.location.pathname + search  (this is a /route deep-link)
  title: string;           // document.title  (human-readable page name)
  drillQid: string | null;
  bootcamp: BootcampContext | null;  // { id: string; day: number }
  capturedAt: string;      // ISO timestamp
}
```

On send, `HelpSheet.tsx` `send()` (lines 140–144) **concatenates a text copy of this into the message body**:

```ts
const composed =
  text.length > 0
    ? `${text}\n\n— context —\n${formatHelpSnapshot(snap)}`
    : `[Help request]\n\n— context —\n${formatHelpSnapshot(snap)}`;
```

`formatHelpSnapshot()` (`helpContextBus.ts` 57–63) emits the leaked lines (`page: …`, `question: …`, `bootcamp: …`). This is why the message reads `…course path — context — page:`. The leading `/route` inside it is what `MessageBubble.extractRouteAction()` (`MessageBubble.tsx` 38–50, 217–230) turns into the "Open assignment" button — so the button is right, but the surrounding prose is garbage.

Separately, the **same snapshot is already uploaded as a structured hidden attachment** — `HelpSheet.tsx` lines 174–192 upload `JSON.stringify(snap)` as `context.json` (mime `application/json`), which every thread view filters out via `isVisibleHelpAttachment()` (`src/lib/inboxAttachments.ts:38`). **The clean data we need is already stored.**

The screenshot itself is inserted as `file_name: 'help-screenshot.png'`, `mime_type: 'image/png'` (`HelpSheet.tsx` 153–170). `AttachmentCard.tsx` (line 132) routes `image/*` to an inline `<img>` preview with a footer chip `filename · size` (line 118). The `help-screenshot.png · 203.3 KB` label comes from `AttachmentCard.tsx:118` (image footer) via `formatSize()` (lines 8–12).

Message/attachment shape (`src/hooks/useInbox.ts` 27–46): `Message { body, attachments[] }`, `MessageAttachment { file_name, file_size, mime_type, storage_path, kind, web_view_link, drive_file_id }`. **There is no first-class `context` field** — context lives in `body` text (the bug) and in the hidden `context.json` (the fix source).

### Desired behavior

A screenshot message should render as three clean, separated parts:

1. **The student's own words** — just their typed message, with the `— context —` block and all `page:/question:/bootcamp:` lines stripped out. No metadata in the sentence.
2. **A framed image preview, tap-to-zoom** (DECIDED, Open Item C) — a polished rounded thumbnail that opens a lightbox/zoom on tap. The label must **not** say `help-screenshot.png · 203.3 KB`; replace the filename with a human label derived from the snapshot (see the card below) or drop the filename/size entirely for screenshots. The zoom is secondary; the Smart Click route button (below) is the primary action.
3. **A context card** — a compact card (the "Compact card under image" option you picked) that states what the screenshot points at and links there:
   - **Heading** = a human target label built from the snapshot: prefer `title`; if `bootcamp` present, append `· Day {day}`; if `drillQid` present, indicate it's a specific question. Example: `Intro to LR · Day 2`. Never the raw filename.
   - **Primary action = a polished "Smart Click" button** (DECIDED, Open Item C). This is the centerpiece — it must NOT read like a raw URL or a generic "Go to page." Its label is generated from the snapshot so it reads like plain language that names the destination for what it is, and clicking it navigates Joshua to `snap.path`. The label reflects the destination *type*:
     - `bootcamp` present → e.g. **"Open the Intro to LR bootcamp"** (use `title` for the name, and `· Day {day}` if useful).
     - `drillQid` present → e.g. **"Open this question"** / **"Go to the drill they're on."**
     - a topic/content page → e.g. **"Open the {title} page."**
     - fallback → a human phrasing of `title`, never the bare `path`.
     - Build a small helper (e.g. `smartClickLabel(snap): string`) that maps snapshot → natural-language label. Style it as a prominent, polished pill/button consistent with the LSAT U design system (tokens, not hardcoded hex — see design memory), not a plain link.
   - Optional secondary: small "captured {relative time}" from `capturedAt`.

Sketch:

```
┌─ student's typed message ────────────┐
│ I keep going back to the same        │
│ sections and can't find the path.    │
└──────────────────────────────────────┘
┌─ [ framed screenshot preview ] ──────┐
│  🖥  Intro to LR · Day 2             │
│  [ Open assignment → ]   captured 2m │
└──────────────────────────────────────┘
```

### Implementation direction

The elegant path (fits the "fold Help into messenger" recommendation):

1. **Stop leaking context into `body`.** In `HelpSheet.tsx` `send()` (140–144), stop appending `— context —\n${formatHelpSnapshot(snap)}` to the body. Send the student's raw `text` as the body (or a minimal `[Help request]` when empty). The structured snapshot continues to be stored — keep the `context.json` upload (174–192), which becomes the render source, OR promote it (Open Item B below).
2. **Render a `ScreenshotContextCard`.** In `MessageBubble.tsx`, when a message has an image attachment that is a help screenshot, read its sibling `context.json` attachment (already on the same message, currently filtered out), parse the `HelpSnapshot`, and render the framed image + context card described above. Build the heading from `title`/`bootcamp`/`drillQid`; wire the button to `snap.path`. Retire the `extractRouteAction` text-scraping path for these messages — the route now comes from structured data, not from the body string.
3. **Fix the attachment label for screenshots.** In `AttachmentCard.tsx` (image branch, ~115–119), suppress the `help-screenshot.png · 203.3 KB` footer for help screenshots (or replace it with the context heading). Keep normal image attachments (real user uploads) showing their footer as today.
4. If Help is folded into the messenger (Open Item A preferred), this all lands in the single `MessageBubble` path; the `HelpSheet` thread view (`HelpSheet.tsx` 236–270) can be retired with it. If Help stays separate, apply the same card render in `HelpSheet`'s own bubble view too.

### Open Item B — how to carry the structured context to the renderer

The snapshot is already stored as a hidden `context.json` attachment, so **no schema change is required** — the renderer can read and parse it. Recommended: keep it as `context.json` and read it in `MessageBubble`. Only if you'd rather have it first-class, add a nullable `context jsonb` column to `messages` and write `snap` there instead — cleaner long-term but a migration. DEFAULT for v1: the no-migration path (read `context.json`). Not overridden by Joshua.

### Acceptance criteria (Problem 2)

- A screenshot message shows the student's typed text with zero `context`/`page:`/`question:`/`bootcamp:` leakage.
- The image renders as a framed preview; no `help-screenshot.png · 203.3 KB` chip on help screenshots.
- A context card shows a human page label (from `title`/`bootcamp`/`drillQid`) and a working button that navigates Joshua to `snap.path`.
- Real (non-screenshot) image and file attachments render exactly as before.
- No message-body text is used to derive the route for screenshot messages (route comes from structured snapshot).

---

## Decisions log

- **A. Help launcher — DECIDED: keep separate, de-conflicted, synchronous.** Do not fold Help into the messenger. Keep both launchers, but give them non-overlapping anchors and make their visibility synchronous (both hide when any panel/sheet is open). See the "Help launcher resolution" section under Problem 1.
- **B. Context storage — DEFAULT (not overridden): read the existing hidden `context.json`, no migration.** Joshua did not rule on this; v1 uses the no-migration path. A build chat may raise it if a `messages.context` jsonb column is preferred long-term.
- **C. Image + route button — DECIDED: tap-to-zoom lightbox AND a polished "Smart Click" route button.** The route button is the primary action and must read like natural language naming the destination (e.g. "Open the Intro to LR bootcamp"), never a raw URL. Image zoom is secondary. See Problem 2 desired behavior.

## Key files

- `src/App.tsx` — global mounts (103–117)
- `src/components/inbox/FloatingMessenger.tsx` — launcher + side panel (launcher 139–170, panel 172–286)
- `src/components/inbox/StudentCornerBubble.tsx` — transient popup + open-state coordination
- `src/components/inbox/messengerOpenBus.ts` — panel open-state bus (extend for launcher hiding)
- `src/components/inbox/MessageBubble.tsx` — message body + attachments + "Open assignment" (renderBody 57–95/216, extractRouteAction 38–50/217–230)
- `src/components/inbox/AttachmentCard.tsx` — image inline vs file chip; `formatSize` 8–12; image footer 115–119
- `src/components/help/FloatingHelpButton.tsx` — the overlapping Help launcher
- `src/components/help/HelpSheet.tsx` — screenshot capture + context concat bug (`send()` 134–205; leak 140–144; context.json upload 174–192)
- `src/lib/helpContextBus.ts` — `HelpSnapshot` type + `formatHelpSnapshot` (leak source)
- `src/lib/helpScreenshot.ts` — `captureViewportPng`
- `src/lib/inboxAttachments.ts` — `isVisibleHelpAttachment` (filters context.json)
- `src/hooks/useInbox.ts` — `Message` / `MessageAttachment` types (27–46)
