## Problem

"Attach from Drive" opens Google's client-side Picker, which triggers an OAuth sign-in to `accounts.google.com`. Your Chrome "Work" profile's admin policy blocks that origin (`ERR_BLOCKED_BY_RESPONSE`), so the picker can never load. This is the same managed-account block we hit before — it is not a code bug we can fix from inside the picker flow.

But we don't need the Google Picker at all anymore. The workspace already has the Google Drive connector linked, and the `gdrive` edge function can list/search Drive files server-side without any per-user OAuth. So the right fix is to **retire the Google Picker path** and replace "Attach from Drive" with an in-app Drive browser that calls our own backend.

## Plan

### 1. New in-app Drive file picker (frontend)

Create `src/pages/teacher/desk/DriveBrowserDialog.tsx` — a small modal that:
- Calls `supabase.functions.invoke('gdrive', { method: 'GET', ... })` with `?action=list&q=<search>` to fetch the connected workspace Drive listing.
- Shows a search input + a scrollable list of files (name, mimeType icon, modified time).
- Multi-select with checkboxes; "Attach N files" returns the picks as `{ id, name, mimeType, url }[]`.
- Empty/loading/error states. No `accounts.google.com` redirect anywhere.

### 2. Replace the picker call in `AssistantComposer.tsx`

- Remove the `loadGooglePickerApi` / `openPicker` import + call from the "Attach from Drive" menu item.
- Open `DriveBrowserDialog` instead. On confirm, map results into the existing `drive` source chips (same `DriveFileRef` shape) so the rest of the composer keeps working.

### 3. Leave the connector chip alone

The "Google Drive" connector chip behavior shipped last turn (real `search_google_drive` tool wired to `gdrive` connector) stays as-is. This change only fixes the manual "Attach from Drive" flow.

### 4. Retire `src/lib/googleDrive.ts` from the composer path

Stop importing `loadGooglePickerApi`/`openPicker` in `AssistantComposer.tsx`. The file stays (still used by `/admin/drive-files`), but the Teacher Desk no longer touches the Google Picker. Optionally, in a follow-up, convert `/admin/drive-files` to the same in-app browser to fully retire the picker.

### 5. Verification

- Open Teacher Desk → click + → "Attach from Drive" → dialog opens, lists real files from the workspace Drive (no `accounts.google.com` round-trip, no `ERR_BLOCKED_BY_RESPONSE`).
- Select 1–2 files → they appear as chips → send → assistant receives them in the existing `[Google Drive files: …]` block.

## What this does NOT change

- The Google Drive connector chip and `search_google_drive` tool (shipped previously) — unchanged.
- The `DriveAttachmentPicker` for the saved Drive library — unchanged.
- No backend changes; `gdrive` edge function already supports `action=list&q=…`.
- No new secrets or OAuth setup. No need to touch your Work Chrome profile.