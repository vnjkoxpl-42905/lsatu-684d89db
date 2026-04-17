

## Audit findings

**1. "Username" wording in `Onboarding.tsx`:**
- Supporting copy: "Choose a username for your profile."
- Field label: "Username"
- Placeholder: "Your username"
- Validation toasts: "Please enter a username", "Username must be 50 characters or less"
- State variable: `username` / `setUsername`
- Storage already correct → writes to `auth.user_metadata.display_name` AND `profiles.display_name`. Keep as-is.

**2. Display-name source in messaging:**
Already correct → `useInbox.ts` joins `profiles.display_name` by `class_id = user_id`. The only weak spots are fallbacks that show `"Unnamed"` / `"Unknown"`:
- `NewConversationDialog.tsx` line 154: `{p.display_name || 'Unnamed'}`
- `ConversationView.tsx` line 28: `o.display_name || 'Unnamed'`

These only fire when `display_name` is null. We'll keep the safety fallback but make it neutral ("Student") — the real fix is the onboarding rename ensuring every new user has one.

**3. Admin name "Joshua":**
DB currently has `display_name = "Joshua Fisseha"` for admin user `5ff160ef-...`. A one-line SQL update sets it to `"Joshua"`. Students will then see "Joshua" everywhere because messaging reads from `profiles.display_name`.

## Implementation

### A. `src/pages/Onboarding.tsx` — name-based copy
- Heading: keep "Welcome to LSAT U"
- Supporting: "Choose a username for your profile." → **"What should we call you?"**
- Label: "Username" → **"Name"**
- Placeholder: "Your username" → **"Your name"**
- Toasts: "Please enter a username" → **"Please enter your name"**; "Username must be 50 characters or less" → **"Name must be 50 characters or less"**
- Rename `username` → `name` state for clarity
- Storage logic unchanged (still writes `display_name` to metadata + `profiles`)

### B. `src/components/inbox/ConversationView.tsx`
- Change fallback `'Unnamed'` → `'Student'` (line 28)

### C. `src/components/inbox/NewConversationDialog.tsx`
- Change fallback `'Unnamed'` → `'Student'` (line 154)

### D. SQL migration — rename admin to "Joshua"
```sql
UPDATE public.profiles
SET display_name = 'Joshua'
WHERE class_id = '5ff160ef-016e-4ab5-aab1-55c7a2ad888f';
```
Also update auth metadata so it stays in sync if anything reads from there:
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{display_name}', '"Joshua"'
)
WHERE id = '5ff160ef-016e-4ab5-aab1-55c7a2ad888f';
```

(Note: this touches `auth.users`. If reserved-schema rules block it, the `profiles.display_name` update alone is sufficient because messaging reads exclusively from `profiles`.)

## Files changed
- `src/pages/Onboarding.tsx`
- `src/components/inbox/ConversationView.tsx`
- `src/components/inbox/NewConversationDialog.tsx`
- new migration: rename admin display_name to "Joshua"

## Out of scope
- No UI redesign
- No changes to inbox layout or storage model
- No changes to `useInbox.ts` data flow (already correct)

