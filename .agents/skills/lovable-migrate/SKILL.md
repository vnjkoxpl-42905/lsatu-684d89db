---
name: lovable-migrate
description: >
  Apply a schema change or SQL migration to the LSAT U backend when Codex
  cannot reach it directly. Packages the change as paste-ready SQL with exact
  Lovable Cloud SQL-editor steps and an automatic post-apply verification probe.
  Use when a migration, table/column change, RLS policy, or edge-function schema
  dependency needs to land on lsatprep.study's Supabase, or when Joshua says
  "apply this migration", "run this SQL", "add this column", "paste to Lovable".
allowed-tools: Bash Read Write Edit Glob Grep
---

# Lovable migrate

The LSAT U backend is `atrcqxpmqrynmtvvyjju`, on Lovable Cloud — a **managed
Supabase stack**, which is why both names show up for one backend.

**Scope check first: this skill is for DDL only.** Jay 2 *can* reach the backend
for data-level work (see `connections.md`): admin JWT from
`LSATPREP_ADMIN_EMAIL`/`LSATPREP_ADMIN_PASSWORD` plus the anon key, then
PostgREST and the deployed edge functions. Reading rows, writing rows, and
calling RPCs need **no relay at all** — do them directly.

Use this skill only for what is genuinely Lovable-UI-only: schema changes,
migrations, and anything else requiring DDL. Relaying a query Joshua could have
had answered instantly is the failure mode this skill is supposed to prevent,
not create.

This skill exists to make that relay cost one round trip instead of a confused
loop. The failure it replaces: Codex emits SQL, Joshua pastes it, then neither
side knows whether it landed ("i didi it hwo do i check", "i dont see it ?"),
so the next several turns are spent re-probing state by hand.

## Read this first — the wrong-project trap

Do not resolve the target database by name. The connected MCP org contains a
*different* project also called **LSATU** (`tlqltiklhmrceksqnwsl`) which is
ACTIVE_HEALTHY. SQL sent there applies cleanly and reports success while the
real app is untouched.

- Real target: **`atrcqxpmqrynmtvvyjju`** — verify against
  `projects/lsatu/supabase/config.toml` (`project_id`) every run.
- If a tool offers you a project list, match the ref exactly. Never pick by name.
- If you cannot confirm the ref, stop and say so.

## 1. Check whether the relay is still necessary

Circumstances change and this skill should retire itself.

```
grep -n 'project_id' projects/lsatu/supabase/config.toml
```

Then check whether direct access now exists: a `SUPABASE_ACCESS_TOKEN` or
service-role key for `atrcqxpmqrynmtvvyjju` in the root `.env`, or an MCP whose
`list_projects` includes that ref. **If direct access works, use it** and tell
Joshua the relay is no longer needed so `connections.md` can be updated.

## 2. Write the migration

- Write the SQL to `projects/lsatu/supabase/migrations/<timestamp>_<name>.sql`
  so the repo keeps the history, matching the existing file convention.
- Make it **idempotent and re-runnable**. Joshua may paste it twice, or paste a
  partially-applied version. Use `IF NOT EXISTS`, `IF EXISTS`,
  `CREATE OR REPLACE`, `DROP POLICY IF EXISTS` before `CREATE POLICY`.
- Keep it to one logical change. A 200-line paste that half-applies is the
  worst outcome — a stuck migration silently broke `/book/lexi` once already.
- No destructive statements without Joshua's explicit sign-off in the same
  message. `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, and unbounded `DELETE` /
  `UPDATE` all need a stated yes, and a stated reason they are safe.

## 3. Hand it over as one block

Give Joshua, in this order and nothing else interleaved:

1. One sentence on what the change does and what it affects.
2. The exact path: **Lovable → your project → Cloud → SQL editor.**
3. The SQL in a single fenced block, ready to paste with no edits.
4. What he should see on success (row count, "Success. No rows returned", etc).

The SQL editor is direct control over the database. Prefer it over asking
Lovable's chat to make the change — three sessions of prompt-relay happened
before anyone realized the editor existed.

Per AGENTS.md, a prompt Joshua pastes elsewhere always goes in a fenced code
block, never inline prose.

## 4. Verify — do not ask him whether it worked

This is the step that kills the confusion loop. Write a **verification probe**
before he pastes, and run it yourself after.

The probe is a read-only query proving the change is present — the column
exists, the policy is attached, the row count matches:

```sql
select column_name, data_type
from information_schema.columns
where table_name = '<table>' and column_name = '<column>';
```

Run it whichever way is available:

- through the app, if the change is user-visible (drive the browser and check);
- as a second paste-back block, if there is no programmatic path — give it in
  its own fenced block and ask him to paste the *output* back, which is one
  concrete action rather than an open question.

Never ask "did it work?" Ask for the probe output, or check it yourself.

## 5. Record it

- Note the applied migration in `wiki/log.md` with the date and what changed.
- If it touched something in `wiki/dashboard.md` (product ground truth), update
  that too.
- If the migration failed or half-applied, log **that**, including the error.
  A half-applied migration that nobody wrote down is how `/book/lexi` broke
  silently.

## Hard rules

- **Never resolve the project by name — match `atrcqxpmqrynmtvvyjju` exactly.**
- **Never claim a migration is applied without probe output.** Joshua saying he
  pasted it is not verification; the probe is.
- **Idempotent SQL, every time.**
- **No destructive statements without explicit sign-off.**
- One migration per round trip. Do not batch unrelated changes.
- If the probe disagrees with what was expected, say so plainly and stop. The
  backend is authority; the brain mirrors it.
