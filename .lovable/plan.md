## Goal

Make "Google Drive" in the Teacher Desk composer behave like ChatGPT's connector chip:
- click it → open the real Google Drive Picker in-place
- picked files become removable chips in the composer
- on submit, those files travel with the message as real context (name + Drive link)
- never navigates away from `/teacher`
- nothing is faked: if the user cancels the picker, no chip is added

The real Drive picker is already wired in `src/lib/googleDrive.ts` (used today by `src/pages/admin/DriveFiles.tsx`). We reuse it.

## Changes

### 1. `src/pages/teacher/desk/AssistantComposer.tsx`
- Extend `AttachedSource` so `drive` chips can carry file metadata: `{ id, kind, label, drive?: { fileId, name, mimeType, url } }`.
- Replace the current `addSource('drive', 'Google Drive')` click handler with a new `openDrivePicker()` flow:
  - Close the menu immediately.
  - Set a local `driveLoading` state, show a small spinner on the menu item.
  - `await loadGooglePickerApi()` then `openPicker((files) => …)` from `@/lib/googleDrive`.
  - For each picked file, push a chip with `kind: 'drive'`, `label: file.name`, and the `drive` metadata. De-dupe by `fileId`.
  - On error, surface a toast (`sonner`) — do not add a chip.
- Update `submit()` to forward structured Drive context, not just labels:
  - New `onSubmit` signature: `onSubmit(sources?: { labels: string[]; drive: Array<{ fileId; name; mimeType; url }> })`.
  - Existing non-drive chips still contribute their label.
- Keep keyboard, a11y, and the existing chip remove behavior.

### 2. `src/pages/teacher/desk/DeskChatPanel.tsx` and `MiniChat.tsx`
- Update their `submit(sources)` to read the new shape.
- Build the outgoing message so the assistant has real handles:
  - If labels present: `[Attached context: <labels>]`
  - If drive files present: append `[Google Drive files: name (url), name (url), …]` with the real `webViewLink` from the picker.
- No backend changes — the message text carries the references. We do not pretend to read file contents; the assistant gets verifiable Drive links it can quote back.

### 3. `src/pages/teacher/desk/AssistantComposer.test.tsx`
- Mock `@/lib/googleDrive` so `loadGooglePickerApi` resolves and `openPicker` invokes its callback with a fake `PickedFile[]`.
- Update the existing Google Drive tests:
  - Clicking the "Google Drive" menu item triggers the picker, and the picked file's name becomes the chip label (e.g. `Remove Lesson plan.pdf`), not the literal "Google Drive".
  - De-dupe test keys off `fileId`, not label.
  - `onSubmit` is called with the new `{ labels, drive }` shape; `drive[0].url` matches the mocked file URL.
- Add a test for "user cancels the picker → no chip is added".

## Non-goals
- No new Edge Function, no connector wiring, no server-side Drive fetch.
- No change to `Attach file` / `Attach material` flows.
- No change to `/teacher` routing — the picker is an in-page overlay served by Google.

## Risk
The Drive picker requires the user to consent to the existing OAuth client on first use. That's identical to today's `/admin/drive-files` flow, so no new infra needed.
