## Goal

Make the Google Drive connector chip actually search Drive via the AI assistant — no fake prompt text. When `driveConnector` is on, the model gets a real `search_google_drive` tool wired to the existing `gdrive` Edge Function (which is already connected to the workspace Google Drive connector).

## Changes

### 1. `supabase/functions/teacher-operator-chat/index.ts` (backend)

- Add a new tool definition `search_google_drive`:
  - params: `query` (string, optional), `pageSize` (number, max 25, default 10)
  - description makes clear it returns file names, ids, mimeTypes, modifiedTime, webViewLink — and cannot read file contents yet.
- Implement it in `runTool` by calling the gateway directly (same pattern as `gdrive/index.ts`): `GET https://connector-gateway.lovable.dev/google_drive/drive/v3/files` with `Authorization: Bearer LOVABLE_API_KEY` and `X-Connection-Api-Key: GOOGLE_DRIVE_API_KEY`. Fields: `files(id,name,mimeType,modifiedTime,webViewLink,iconLink)`. Trim result to a compact array.
- Gate the tool: only include `search_google_drive` in the `tools` array when `deskContext.driveConnector === true` AND `GOOGLE_DRIVE_API_KEY` is set. If the user enabled the chip but the connector isn't linked, append a system note: "Google Drive connector chip is on but no Google Drive connection is linked in this workspace; tell the user to link Google Drive."
- Extend `DeskContext` with `driveConnector?: boolean` and append a short system note when true: "Google Drive connector is ENABLED. Use search_google_drive to find files. You can return names, links, and ids. You cannot read file contents yet — say so if asked to summarize a file."
- Return tool error string verbatim on gateway failure (401/403 → "Google Drive connector not authorized — relink it").

### 2. `src/pages/teacher/desk/DeskChatPanel.tsx` and `src/pages/teacher/desk/MiniChat.tsx` (frontend)

- Stop appending the `[Google Drive connector: enabled — server-side Drive search is not wired yet…]` text block.
- Instead, pass `driveConnector: true` through the structured `context` arg already supported by `useOperatorChat.sendMessage(text, context)`. (MiniChat path uses the same hook indirectly — pass through whichever send signature it uses; if it doesn't accept context yet, thread it through.)
- Keep `[Google Drive files: …]` text for explicitly picked Drive files (separate, unchanged behavior).

### 3. `src/hooks/useOperatorChat.ts`

- Extend `OperatorChatContext` type to include `driveConnector?: boolean` so it's forwarded in the request body to the edge function.

### 4. Tests

- Update `AssistantComposer.test.tsx` only if existing assertions check the old "not wired yet" text (they don't — they only assert `driveConnector: true` is forwarded, which still holds).
- No new tests required for the edge function (existing project has no edge-function test harness).

## What this does NOT do

- Does not read Drive file contents (Docs/PDF text extraction). The tool description and assistant system note state this honestly; if the user asks to summarize a file, the assistant will say it can only return names/links for now.
- Does not change the manual "Attach from Drive" picker behavior.
- No DB schema changes.

## Verification

1. Deploy `teacher-operator-chat`.
2. In Teacher Desk: enable the Google Drive chip → ask "what files do you see in Google Drive?" → assistant calls `search_google_drive` and lists real file names + links.
3. With chip off → same question → assistant should not call the tool (tool isn't in its toolset for that turn).
4. If `GOOGLE_DRIVE_API_KEY` missing → assistant tells the user to link Google Drive.