# LSAT U Claude Code Playbook

Reusable prompt templates. Copy, customize the bracketed sections, paste to Claude Code.

---

## Template 1: Session Start Onboarding

For beginning a fresh Claude Code session.

```
You are starting a fresh CC session on LSAT U. Do this before anything else:

1. Read in order:
   - CLAUDE.md
   - .audit/session-handoff-latest.md
   - .audit/07-fixes-delta.md
2. Run: git log --oneline -10 && git status
3. Confirm the latest SHA on main matches the handoff file.
   Expected: LATEST_COMMIT_SHA = [PASTE_SHA_HERE]
   If mismatch, stop and report.
4. Report back in <150 words:
   - SHA parity check: PASS or FAIL
   - Working tree state
   - What the last shipping run was: [PASTE_RECENT_SHIPPING_RUN]
     (e.g. "Homework Phase A + 2 bug fixes + load-once guard")
   - The in-flight items from the handoff
   - What you think the next move is, based on recommended next task

Do NOT start any work. Wait for my direction.

Immediate priority I want to focus on: [PASTE_IMMEDIATE_PRIORITY]
(e.g. "live-verify 2ee2072" or "pick up Foyer Redesign plan" or "cold-load perf")
```

---

## Template 2: End-of-Session Handoff

Send before closing a Claude Code session.

```
Final task. Write a handoff file for my next CC session.

Write to: .audit/session-handoff-latest.md
(Overwrite the existing one. Current content is stale.)

Structure:

# LSAT U Session Handoff - [DATE]

## Latest State
- SHA on main: [current]
- Working tree: [git status]
- Unpushed commits: [any]

## Shipped This Session
[every commit this session, SHA + one-line purpose]

## Live on lsatprep.study
- Confirmed working: [what I verified]
- Unverified: [shipped but not click-tested]
- Known issues: [anything broken at session close]

## In-Flight
- Approved plans not executed
- Staged work not committed
- Unresolved debugging

## Critical Hazards
- (supabase as any) cast sites
- Pre-existing lint debt files
- Lovable/deploy quirks
- DNS/email/env TODOs

## [Relevant feature area] Architecture
[3-5 bullets so next CC can orient without re-reading]

## User Preferences (Joshua)
[copy from existing handoff]

## Recommended First Task for Next Session
[one specific action with justification]

## Files Next CC Must Read on Startup
[ordered list]

Commit: "docs: handoff to next CC session"
Push to origin/main.
```

---

## Template 3: Verification Task (Tier C on a shipped commit)

For checking that a just-shipped commit actually works on live site.

```
Verification task: check [FEATURE_NAME] on lsatprep.study.
Commit [COMMIT_SHA] shipped ~[TIME_AGO].

Do static checks only (no click-testing required from you).
Report PASS / FAIL / CANNOT VERIFY per item.

Categories to verify:

1. Deployment
   - Commit is on origin/main: git log origin/main --oneline | grep [SHA]
   - Lovable would have picked it up: [timestamp sanity check]

2. DB state
   - Migrations present: ls supabase/migrations/ | grep [MIGRATION_NAME]
   - Schema matches expectation: [TABLE] has columns [COLS]

3. Routes
   - New routes wired in src/App.tsx: [ROUTE_LIST]
   - Lazy-loaded correctly / gated by ProtectedRoute

4. UI logic
   - [SPECIFIC_COMPONENT] at [PATH]: [EXPECTED_BEHAVIOR]
   - [SPECIFIC_HOOK]: [EXPECTED_SHAPE]

5. Regressions
   - npx tsc --noEmit -p tsconfig.app.json exits 0
   - npm run lint exits clean (or: no new errors vs. baseline)
   - npm run build exits 0
   - No accidental changes to [FILE_A], [FILE_B]

Write report <300 words. End with overall status: SHIP_CLEAN or NEEDS_FIX.
```

---

## Template 4: Bug Report with Phase Gate

For triaging a production bug without jumping to fixes.

```
Bug report on shipped [FEATURE] (commit [SHA]) on lsatprep.study.

BUG [N]: [SHORT_TITLE]
Reproduction: [STEPS]
Expected: [WHAT_SHOULD_HAPPEN]
Actual: [WHAT_HAPPENED]
Console/network evidence: [PASTE_IF_ANY]

BUG [N+1]: [SHORT_TITLE]
[...same shape...]

Phase 1: Exploration only.
- Read the code paths. Do NOT edit, do NOT add console.logs.
- For each bug, report:
  - Root cause hypothesis (1-2 sentences)
  - Confidence: HIGH / MEDIUM / LOW
  - Proposed fix approach (1-2 options if sensible)
  - Risk level of the fix
  - Files touched
- Do not commit anything. Wait for Phase 2 approval.
```

Follow-up (Phase 2) once Phase 1 is back:

```
Phase 2 approved. Fix [BUG_N] and [BUG_N+1] in one commit.

BUG [N] approach: [CHOSEN_OPTION, e.g. "go with A, speculative fix direct"]
BUG [N+1] approach: [CHOSEN_OPTION]

Constraints:
- No diagnostic console.logs unless I say otherwise
- Tier C verify before push (tsc + eslint + build)
- Single commit, descriptive message
- Push to origin/main when green
```

---

## Template 5: Feature Implementation with Plan Mode

For non-trivial features. Forces plan-before-execute.

```
Feature: [NAME]

Context:
[2-3 sentences on why this matters and the surrounding product rules]

Requirements:
- [REQ_1]
- [REQ_2]
- [REQ_3]

Non-requirements (do NOT build):
- [NON_REQ_1]
- [NON_REQ_2]

Product rules that must not regress:
- [FROM_CLAUDE_MD or specific to this feature]

Phase 1: Plan only (use plan mode).
- Files you will create / modify
- DB migrations needed, with column shapes
- RLS policy implications
- Route registration changes
- State management approach
- One sentence per edit explaining why
- Flag anything ambiguous with AskUserQuestion before finalizing

Do not write any code. When plan is ready, exit plan mode and wait for approval.
```

---

## Template 6: DB Migration (Tier B)

For schema changes. Higher scrutiny than UI.

```
DB migration: [ONE_LINE_PURPOSE]

Target table(s): [TABLE_NAMES]
Change: [ADD_COLS / NEW_TABLE / RLS_CHANGE / TRIGGER / FN]

Shape:
[paste SQL or describe columns + types + defaults + nullability]

Tier B checklist:
- Migration filename: supabase/migrations/[TIMESTAMP]_[SLUG].sql
- Idempotent (IF NOT EXISTS / IF EXISTS)
- RLS enabled on new tables, policies defined per-role using public.has_role()
- Grants where needed
- No destructive ops unless I explicitly approved them
- Paired client-side change, if any, uses (supabase as any) cast and notes the
  type-regen TODO in a comment
- Regenerate types NOT required for this change (types file is stale anyway;
  tracked in handoff hazards)

Verification:
- Migration is on main only, never pushed to an open PR branch
- Read existing sibling migrations to match style
- tsc + lint + build clean

Write the migration. Commit: "feat(db): [PURPOSE]". Push to origin/main.
```

---

## Template 7: Proactive Suggestion / Second Opinion

For when Joshua wants pushback, not capitulation.

```
I'm thinking about [CHANGE / APPROACH]. Before I greenlight it:

- Does it violate any product rule in CLAUDE.md?
- Does it fight Lovable conventions (lovable-tagger, PWA start URL, SW guard)?
- Is there a simpler version that gets 80% of the value?
- What regresses if I ship this?
- If you disagree with the approach, say so. Do not capitulate.

Report <200 words. End with: PROCEED / ADJUST / RECONSIDER.
```

---

## Notes on usage

- Fill every bracketed section before pasting. Half-filled templates produce half-thought answers.
- Template 1 + Template 2 bookend every session. Everything else is mid-session.
- Templates 3, 4, 5, 6 all enforce a phase gate. Do not skip Phase 1 just because the task feels small.
- When a bug is low-risk + targeted, explicitly tell Claude to skip diagnostic instrumentation (see Template 4 constraints line).
- No em dashes in output. Tier C before every push to main.
