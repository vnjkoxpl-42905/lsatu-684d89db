# send-assignment-email

Sends a transactional email to a student when an admin assigns work via the
Teacher Workspace assignment flow. Called by `src/lib/classroomNotify.ts`
after the `classroom_items` row, inbox message, and bell notification have
been written.

## Behavior

- Verifies the caller is an admin (mirrors `admin-manage-users`).
- Looks up the student's email server-side via the service role; the
  client never receives the address.
- Sends via Resend.
- Returns `{ ok: true }` on success or `{ ok: false, error }` on any
  failure (200 with payload — auth failures still return 401/403).

The function never lies about success. If env is missing or Resend
rejects the request, `email_ok` propagates to the UI as `false` with
the error string in the toast.

## Required environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | Resend API key. Get from resend.com. |
| `FROM_EMAIL` | yes | Verified Resend sender, e.g. `LSAT U <hello@yourdomain.com>`. **No default** — the function refuses to send without it so we never spoof an unverified address. |
| `APP_BASE_URL` | recommended | Base URL for clickable Classroom links, e.g. `https://app.lsatu.com`. If unset the email still sends with a relative path. |
| `SUPABASE_URL` | yes (auto) | Provided by Supabase runtime. |
| `SUPABASE_ANON_KEY` | yes (auto) | Provided by Supabase runtime. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (auto) | Provided by Supabase runtime. |

## Deploy

```
supabase functions deploy send-assignment-email --no-verify-jwt=false
supabase secrets set RESEND_API_KEY=re_... FROM_EMAIL='LSAT U <hello@yourdomain.com>' APP_BASE_URL=https://app.lsatu.com
```

## Failure modes (truthful)

- `RESEND_API_KEY` unset → `email provider not configured`
- `FROM_EMAIL` unset → `FROM_EMAIL not configured`
- Student row has no email → `no email on file`
- Resend non-2xx → `resend <status>`

In all of these cases the assignment itself still succeeded — only the
email leg failed. The Classroom item, inbox message, and bell
notification all land regardless.
