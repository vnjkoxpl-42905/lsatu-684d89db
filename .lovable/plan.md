## Goal

Make the **Google Drive** option in the Teacher Desk composer behave like ChatGPT's connector chip — a toggleable source flag for the next message — and stop launching the Google Picker as the primary action. Keep manual file picking available as a separate menu item, and be truthful that we cannot yet read Drive content server-side.

## Behavior changes

### Composer menu (`+` button)
Replace the current single "Google Drive" item with two clearly separated entries:

1. **Google Drive** (connector chip)
   - Click → no picker, no navigation, no OAuth popup.
   - Adds a single removable chip in the composer labeled **"Google Drive"** with the Drive icon.
   - Re-clicking the menu item toggles the chip off. The chip's × also removes it.
   - Chip is a singleton (only one Drive connector chip at a time, separate from any file chips).

2. **Attach from Drive** (manual picker — existing behavior, relabeled)
   - Click → loads gapi + opens the Google Picker.
   - Selected files become individual `drive` file chips (current behavior).
   - Stays under the existing `Attach file` / `Attach material` grouping.

### Submit payload
Extend `ComposerSubmitSources` so the assistant request knows the connector is on:

```ts
export interface ComposerSubmitSources {
  labels: string[];
  drive: DriveFileRef[];        // picked files (existing)
  driveConnector: boolean;       // NEW: connector chip toggled on
}
```

### MiniChat + DeskChatPanel
In both `submit` functions, when `sources?.driveConnector` is true, append a truthful tag to the outgoing message body, e.g.:

```
[Google Drive connector: enabled — note: server-side Drive search is not wired yet, so the assistant can only use Drive files explicitly attached in this message.]
```

This honors the "do not fake it" rule from the chat-agent contract: the assistant is informed Drive is selected as a source, and is told plainly that without attached files it cannot read arbitrary Drive content.

## Files to change

- `src/pages/teacher/desk/AssistantComposer.tsx`
  - Add `'driveConnector'` to `SourceKind` and a `connector?: 'drive'` discriminator on `AttachedSource`.
  - New `toggleDriveConnector()` handler wired to the menu's **Google Drive** item (no async, no picker).
  - Keep `openDrivePicker()` but rename its menu item to **Attach from Drive** and move it next to **Attach file**.
  - Render the connector chip with the Drive icon and label "Google Drive"; chip remove clears it.
  - Update `submit()` to include `driveConnector: attachedSources.some(s => s.kind === 'driveConnector')` in the payload, and treat the connector as "has something attached" so it submits even with no text? No — keep current rule (text required); the connector only travels alongside a real message.

- `src/pages/teacher/desk/MiniChat.tsx` and `src/pages/teacher/desk/DeskChatPanel.tsx`
  - Read `sources?.driveConnector` and append the truthful tag described above to `parts` before sending.

- `src/pages/teacher/desk/AssistantComposer.test.tsx`
  - Adjust/add a test: clicking **Google Drive** in the menu adds a "Google Drive" chip and does not call `loadGooglePickerApi` / `openPicker`. Clicking **Attach from Drive** still opens the picker. Submitting with the chip on calls `onSubmit` with `driveConnector: true`.

## Not changing

- `src/lib/googleDrive.ts` (picker helper) — still used by **Attach from Drive** and by `src/pages/admin/DriveFiles.tsx`.
- `src/components/inbox/DriveAttachmentPicker.tsx` and Gmail-side flows — unrelated to the composer chip.
- No backend or edge function changes. Server-side Drive search remains unwired; the connector flag is informational until that's built.

## Out of scope (call out, don't build)

- Real server-side Drive search/read for the connector. When that's wanted, the next step is an edge function that uses the stored Drive token from `lib/googleDrive.ts` (or the `google_drive` connector gateway) to search files matching the message and inject excerpts. Today the chip is a declared intent only.
