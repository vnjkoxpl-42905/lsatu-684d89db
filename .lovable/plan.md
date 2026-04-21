

## Plan: hardcode Google Drive credentials + ship full picker → inbox flow

### Why hardcode instead of env vars
Both values are public by design (Client ID appears in OAuth URLs; browser API keys are meant for client bundles). Security is enforced server-side by Google via origin/referrer allowlists you configure in Google Cloud Console, not by hiding the strings. This removes the manual Workspace Settings step entirely and unblocks the rest of the work.

### Files

**1. Edit `src/lib/googleDrive.ts`**
Replace the `import.meta.env.VITE_GOOGLE_*` reads with hardcoded constants at the top of the file:
```ts
const GOOGLE_CLIENT_ID = "713853007100-eb2du7s87d926tfld7hd4h3h6ve2g7eb.apps.googleusercontent.com";
const GOOGLE_API_KEY   = "AIzaSyCeCBNn23LhP71Jby-lhKq_4nammNqZiO4";
```
Drop the `placeholder` guard (no longer reachable). Picker now works immediately on `/admin/drive-files`.

**2. DB migration — extend `message_attachments` to carry Drive references**
- Add `kind text not null default 'storage'` (`'storage'` | `'drive'`)
- Add `drive_file_id uuid references public.drive_files(id) on delete set null`
- Add `web_view_link text` (denormalized — survives admin deleting the library row)
- Make `storage_path` nullable
- Update INSERT RLS: allow rows where either `storage_path` OR `web_view_link` is set (admin via `has_role`)

**3. New `src/components/inbox/DriveAttachmentPicker.tsx`**
Admin-only Cloud icon button + popover. Lists current admin's `drive_files` rows, search filter, multi-select checkboxes, "Attach N file(s)". Empty state links to `/admin/drive-files`. Tiny helper line: "Make sure these files are shared in Drive (Anyone with link, or with each student)."

**4. Edit `src/components/inbox/MessageComposer.tsx`**
- Show Cloud button only when `permissions.is_admin` (mirrors `showPolish`)
- Add `driveAttachments: DriveFileRow[]` state, render as removable chips
- On send: after message insert, bulk insert `message_attachments` rows with `kind='drive'`, `drive_file_id`, `web_view_link`, `file_name`, `mime_type`, `file_size: 0`, `storage_path: null`
- Existing PDF upload + Polish flow untouched

**5. Edit `src/components/inbox/AttachmentCard.tsx`**
Branch on `kind`:
- `'storage'`: existing signed-URL flow
- `'drive'`: open `web_view_link` in new tab, render Cloud icon + "Google Drive" subtitle (no size)

**6. Edit `src/hooks/useInbox.ts`**
Extend `MessageAttachment` interface with nullable `kind`, `web_view_link`, `drive_file_id`. No query changes.

### Verification
- `/admin/drive-files`: Connect → Picker opens → select files → appear in library (works without any env-var setup)
- `/inbox` as admin: Cloud button visible → picker lists library files → select → chips appear → Send
- Student inbox: message shows "Google Drive" attachment card → click opens Drive in new tab
- Existing PDF upload + Polish unchanged
- Non-admin users do not see Cloud button
- Deleting a `drive_files` row leaves already-sent messages intact

### One-time manual prerequisite (you, ~2 min, in Google Cloud Console)
Lock the credentials to your domains BEFORE this code goes live, otherwise anyone copying them from the bundle could rack up your Google quota:
1. Credentials → OAuth client → Authorized JavaScript origins: add the 4 domains above
2. Credentials → API key → Application restrictions = HTTP referrers, add the 4 domains with `/*`; API restrictions = Picker API + Drive API only
3. Save

