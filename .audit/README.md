# LSAT U Audit Bundle

Local reference for the April 2026 audit of `vnjkoxpl-42905/lsatu-684d89db`.

## What's in this folder

| File | What it is | When to reach for it |
|---|---|---|
| `system-prompt.md` | Reusable role definition for the LSAT U analyst persona | Paste into a new Claude conversation's system prompt or custom instructions to re-instantiate the reviewer role |
| `master-reference.md` | Consolidated 7-section master reference (arch map, subsystems, scores, prioritized issues, open questions) | Primary context for any multi-area task or Claude Code prompt |
| `00-index.md` | Routing guide for the scan files | Check this first if unsure which scan to cite |
| `01-scan-auth-session-permissions.md` | Auth, session death, permissions, provisioning | Work touching `AuthContext`, `useUserPermissions`, `ProtectedRoute`, OAuth |
| `02-scan-drill-surface.md` | `Drill.tsx`, adaptive engine, attempt persistence, question loading | Any work on `src/pages/Drill.tsx`, `src/components/drill/*`, `src/lib/adaptiveEngine.ts` |
| `03-scan-foyer-inbox-realtime.md` | Foyer nav, hero ring, inbox, `FloatingMessenger`, realtime channels, PDF attachments | Mobile nav trap, Ask Joshua flow, messaging, optimistic chat, `useInbox` |
| `04-scan-admin-bootcamps-content.md` | Admin Dashboard, Classroom mock data, Schedule, Analytics, WAJ, Flagged, Bootcamps, gamification | Admin features, Classroom replacement, Schedule persistence, gamification ship/delete |
| `05-scan-design-system-backend-infra.md` | Tailwind + CSS vars, the `.dark` class bug, edge functions, migration history, build/CI | Theming, edge functions, migration cleanup, CI |

## Suggested local location on your MacBook

Pick one of these — both are fine:

**Option A — standalone reference folder** (recommended if you use the audit across multiple tools):
```
~/Documents/LSAT-U-Audit/
```

**Option B — repo-adjacent** (if you want the audit to travel with the project without committing it):
```
~/path/to/lsatu-repo/.audit/
```
Add `.audit/` to `.gitignore` to keep it local.

Neither option commits to git. The audit is a living document — treat it as personal project memory, not a shipped artifact.

## How to use these files

### In a fresh Claude conversation (claude.ai or Claude Desktop)

1. Paste `system-prompt.md` into the system prompt / custom instructions.
2. Attach `master-reference.md` for context.
3. Attach the specific scan file(s) relevant to your task.
4. State the task.

**Minimal paste for narrow tasks:** one scan file + the task. Example:
> [attach `03-scan-foyer-inbox-realtime.md`]
> Build me a Claude Code prompt to fix the mobile nav trap (F3.1).

**Full paste for cross-cutting tasks:** system prompt + master reference + relevant scan(s).

### In Claude Code

The repo has `CLAUDE.md` at the root with project-level rules. That's Claude Code's baseline context. This audit bundle is supplementary — paste the relevant scan into your Claude Code prompt when you need specific diagnosis beyond what CLAUDE.md documents.

### In a Claude Project

Create a Project called "LSAT U" with:
- Project instructions: paste `system-prompt.md`
- Project knowledge: upload `master-reference.md` + all 5 scan files + `00-index.md`

Then every conversation in that project has the full audit context available.

## Finding IDs

Every audit finding has a stable ID like `F2.2` (Scan 2, finding 2) or `F4.1` (Scan 4, finding 1). Cite these IDs in future prompts and updates so the history stays traceable as things ship.

## Maintenance

When something in the repo ships that closes a finding:
1. Mark the row in `master-reference.md` §6 (Prioritized Issue List) — strike through or add a "SHIPPED" tag.
2. If the change materially alters a whole subsystem, ask Claude to run Master Reference Update Mode against the affected scan and regenerate that scan file.
3. Keep the finding IDs stable even after shipping — they become history.

## Audit metadata

- **Repo anchor:** `vnjkoxpl-42905/lsatu-684d89db`
- **HEAD at audit time:** `9165b2c` (Merge PR #23 `claude/wf-2-foyer-ring-inspiration`)
- **Audit date:** 2026-04-19
- **Supersedes:** `lsatu-fix-playbook.md` (Jan 2026)

## Top-3 issues (tl;dr)

From `master-reference.md` — the three that matter most:

1. **Classroom ships mock data with fake scores and fake teacher feedback** (F4.1). Remove immediately, replace with truthful empty state.
2. **Mobile Foyer has no nav + Ask Joshua dead button for new students** (F3.1, F3.4). Compounds at the primary landing page on phones.
3. **`Drill.tsx` silently swallows DB write errors across 4 paths** (F2.2, F2.3). Quietly damages progress tracking.

If you only do three things this week, those are the three.
