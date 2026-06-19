## Add Gmail + Google Calendar context-source chips

Mirror the existing Google Drive connector chip in the Teacher Desk composer. The chips toggle a context source for the next message; the assistant then has a matching server-side tool to actually search Gmail / Calendar.

### Frontend — `src/pages/teacher/desk/AssistantComposer.tsx`

1. Extend `SourceKind` from `'driveConnector'` to a union covering `'gmailConnector'` and `'calendarConnector'`.
2. Add stable IDs: `GMAIL_CONNECTOR_ID`, `CALENDAR_CONNECTOR_ID` (Drive ID already exists).
3. Generalize `toggleDriveConnector` into a single `toggleConnector(kind, id, label)` (or three thin wrappers).
4. In the `+` menu, add two new `ComposerMenuItem`s directly under Google Drive:
   - Gmail — "Use Gmail as a context source for the next message" (`MailIcon` from a small new `GmailIcon` component, matching the colored G-mail glyph from screenshot 2)
   - Google Calendar — same copy pattern (new `GoogleCalendarIcon` matching the 31 glyph)
   - Each shows an "On" badge when active, same as Drive.
5. Update `ComposerSubmitSources` to add `gmailConnector: boolean` and `calendarConnector: boolean`; compute them in `submit()` like Drive.
6. Update `SourceChipIcon` to return the right icon per connector kind.

### Icons — `src/components/icons/`

Create `GmailIcon.tsx` and `GoogleCalendarIcon.tsx` (small SVGs matching the official brand glyphs in screenshot 2). Pattern identical to existing `GoogleDriveIcon`.

### Pass-through — `DeskChatPanel.tsx` and `MiniChat.tsx`

In both, where `submit()` builds `context`, extend from `{ driveConnector: true }` to include `gmailConnector` / `calendarConnector` whenever the respective chip is on. The label-suffix `[Attached context: …]` block already handles arbitrary labels — no change needed for the visible name.

### Backend — `supabase/functions/teacher-operator-chat/index.ts`

1. Extend `DeskContext` with `gmailConnector?: boolean` and `calendarConnector?: boolean`.
2. Add gateway constants:
   - `GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1"`
   - `GCAL_GATEWAY  = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3"`
3. Add two new tools mirroring `SEARCH_GDRIVE_TOOL`:
   - `search_gmail({ query?, maxResults? })` → calls `/users/me/messages?q=…&maxResults=…`, then `messages.get?format=metadata` for headers (From/Subject/Date) to return readable rows. Reads `GOOGLE_MAIL_API_KEY`.
   - `list_calendar_events({ query?, timeMin?, timeMax?, maxResults? })` → calls `/calendars/primary/events` with `q`, `timeMin` (default now), `singleEvents=true`, `orderBy=startTime`. Reads `GOOGLE_CALENDAR_API_KEY`.
   - Same error handling pattern as `searchGoogleDrive` (401/403 → "not authorized — relink", graceful missing-key message).
4. Route both in the `runTool` switch.
5. Add two new system notes parallel to `driveNote`:
   - When `gmailConnector` is on + key present: "Gmail connector ENABLED — when the user asks about email/inbox/messages, call `search_gmail`. You return From/Subject/Date/snippet; cannot reply or modify."
   - Same shape for Calendar.
6. Build `activeTools` by conditionally appending each enabled tool (Drive | Gmail | Calendar).

### Verification

- Open Teacher Desk `+` menu → see three connector items (Drive, Gmail, Calendar) above Attach file, each with brand icon.
- Toggle Gmail chip → "On" badge appears, chip shows in composer pill row with Gmail icon, removable.
- Send "what's in my inbox this week?" with Gmail chip on → assistant invokes `search_gmail` and returns real subjects/senders.
- Same for Calendar with "what's on my calendar tomorrow?".
- Drive chip behavior unchanged.

### Out of scope

- Per-message file/attach picker for Gmail / Calendar (could add later, matching `DriveBrowserDialog`).
- Reading email bodies or writing/sending email/events.
- Existing "Attach from Drive" picker stays unchanged.
