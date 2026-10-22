# Reflection Notes: Claude Code Setup Improvements

Diagnosis of 177 sessions across 6 projects, 2026-06-03 to 2026-07-02 (248MB of transcripts, mined by 4 parallel agents plus inline extraction). Ranked by leverage: recurrence x pain, weighed against build cost. Diagnosis only, nothing built.

Session IDs are 8-char prefixes of the JSONL files in `~/.claude/projects/`.

---

## 1. Mandatory visual verification before "done" — HOOK + CLAUDE.md RULE

**The single biggest recurring failure.** Claude ships UI work, claims done, and Joshua reports back "its not working" / "i dont see it". The demand "verify before you build" was restated 4+ times in one session alone.

- Evidence: 380907a5 (06-26, ~7 "not working" reports in one WAJ session), f10c3780 ("i odnt see the tab"), 1c111847 ("i still dont see it"), eb15ea21 (06-15, "find a way to Verify before you Build", "reiteratre until u get it wright"), 41a95b86, 8dbf50ab, 45929bd8, f4c03783, 712cc2e7, 500a1ee7. 10+ sessions.
- The `/verify` skill and claude-in-chrome exist but are not invoked by default.
- **Recommendation:** add a hard CLAUDE.md rule (and ideally a Stop hook reminder) for the LSATU repo: any change to `src/components/` or `src/pages/` is not "done" until viewed in the running app via chrome tools, with a screenshot or DOM check as evidence. Build cost: tiny (a paragraph + optional hook). Payoff: kills the most expensive loop in the whole corpus.

## 2. Lovable auto-commit git races — SMALL AUTOMATION (fix)

Lovable commits to main mid-session, causing rejected pushes, "file has been modified since read" errors, and one lost-work recovery session.

- Evidence: push rejected in c23b7b09, f4c03783; modified-since-read in 45929bd8, 1ae647da, 46e6d1fd, 8ee0905a, 4f96ffc1, 8485c623; vanished-content recovery in ce63fc22 ("it disspapere hlep me restoer it"). 9+ sessions. Already noted in MEMORY.md but only as knowledge, not automation.
- **Recommendation:** wrap the push path: a small allowed script (`git pull --rebase --autostash && git push`) plus a PreToolUse hook or permission entry so Claude always fetch-rebases before push in this repo. Build cost: ~30 min. High leverage per cost.

## 3. Session continuity: context exhaustion + manual handoff choreography — IMPROVE EXISTING SKILLS

The most time-consuming ritual. Mega-feature sessions blow context, then resume is a hand-carried paste: "Read ~/Documents/Claude/08_CHAT_EXPORTS/... and continue from where we left off."

- Evidence: ran-out-of-context continuations in 7 chunk-B sessions (d67c2c16, 41a95b86, 5873783b, 9ca211c2, 2ebcbf89, ee71e6bb, 912f756c) plus 380907a5, 2ad2d5d0. Manual resume-paste openings in 12+ sessions (9ae0fb1d, e55c8165, 2100f487, ddebbebb, 320d41eb, 9cfb5588, d67c2c16, ed60c8f3, e734fe09, b0d47716...). Same task restated verbatim across fresh sessions: Flaw-to-LR audit pasted 3x on 06-13 (b9a452c6, 264ba1d1, 1869d789); student/admin split 2x on 06-16 (b531995c, 67f1f10a).
- /pickup, /wrapup, chat-export, and handoff skills already exist and are used; the gap is on the resume side and mid-session.
- **Recommendation:** (a) a tiny `/resume` skill that finds the newest file in `08_CHAT_EXPORTS/` + `docs/agent/handoffs/` and continues from it, so resume is one word instead of a hand-typed path; (b) a habit rule: features estimated over ~1.5k lines get split into staged specs up front (he already does this manually with grill + specs; codify it). Build cost: low for (a).

## 4. Blocked sleep-then-read polling — CONFIG FIX

Claude's default "sleep 30 && tail log" pattern is blocked by the sandbox every single time, wasting a turn each occurrence.

- Evidence: 11+ hits across 5911db94, 5fdb6363, c23b7b09, 71065690, ccc3a02c, 9e6cf31a, 37812c9c, 9ae0fb1d, d2c3e04f, 4f96ffc1, 51e38bd9. Monitor tool also failed twice with InputValidationError (ccc3a02c, c23b7b09).
- **Recommendation:** one line in CLAUDE.md: "never poll with `sleep N && cat/tail`; use run_in_background or the Monitor tool (Monitor requires a `description` param)". Build cost: 2 minutes. Nothing else needed.

## 5. tmpfs exhaustion destroying command output — FIX

The claude temp filesystem fills and background output is silently lost.

- Evidence: 1af368db (8 hits in one session), f4c03783 (x2), d38c3984 (x2). 3 sessions, 12 hits, all late June onward — trending up.
- **Recommendation:** a periodic cleanup (LaunchAgent or a SessionStart hook line: prune `/private/tmp/claude-501/**` older than 2 days). Build cost: ~15 min.

## 6. "Compare against Intro to LR" bootcamp-parity audit — CANDIDATE SKILL

The same feature/visual parity audit against the flagship bootcamp is pasted as a fresh prompt repeatedly.

- Evidence: verbatim "2. Compare them against Intro to LR" in 456036be, f5d42d42, 5f63858e, a382cd6d (06-21 to 06-24); the Flaw-to-LR transfer audit trio on 06-13 (b9a452c6, 264ba1d1, 1869d789). 7 sessions.
- **Recommendation:** a `bootcamp-parity-audit` project skill: input = bootcamp name, output = feature/visual delta vs Intro to LR anchored to `bootcamp-quality-bar.md`, in his preferred 5-point format. Build cost: medium-low (mostly capturing his existing prompt). Real recurrence, clearly worth it.

## 7. Lovable hand-carry bridge (prompts, SQL, deploys) — CANDIDATE SKILL / TEMPLATE

Anything Claude can't reach (prod migrations, edge function deploys, Lovable-side config) becomes "send me the prompt for Lovable" or "give me the SQL block to paste".

- Evidence: 6b7cc063 ("tell me the prompt i shodl sned lovable... cosie short promts"), 03818125, 89b6666f, 0df354be, 8e9eea31, e55c8165 (migration via Lovable deploy), 380907a5 (paste SQL into editor), d0c0d908. 8 sessions.
- Note: the Supabase MCP server is now connected, which may eliminate the SQL half of this entirely (c23b7b09 shows auto-mode denying prod migrations, so the path exists but is gated).
- **Recommendation:** first check whether Supabase MCP + confirmed-cost migrations makes most of this obsolete. If a residue remains (Lovable-only actions), a small `lovable-prompt` skill with his preferred short-prompt format. Build cost: low, but verify need first.

## 8. De-AI-branding and fake-placeholder regressions — CLAUDE.md ADDITION

Recurring corrections: UI copy "looks too AI" ("It should not say 'AI Tutor'", "strategize... very ai") and placeholder data violating his own truthful-UI rule (hardcoded "lsatmaster" thread complained about in two separate sessions).

- Evidence: d4946450, 78d9a059, 1336514d, ce63fc22 (branding); 1ae647da, 46e6d1fd (fake data). 6 sessions.
- **Recommendation:** the fake-data rule already exists in CLAUDE.md product rules; add the branding rule next to it: "No 'AI' labels in student-facing copy; the tutor persona is Joshua. Route copy through teaching-voice.md." Build cost: 2 minutes.

## 9. Skill misfires and permission-prompt clusters — NOTHING / LOW

- /impeccable needed 3 asks to actually run (8dbf50ab); 11 tool rejections in one vault-setup session (101162c4); plugin install confusion (ae2e86e3 "pernmeante install it"). Scattered, not one fixable pattern. The /fewer-permission-prompts skill already exists if prompt spam resurfaces.
- Screen-visibility frustration ("it works wi codex why not you", 4f96ffc1, 1336514d) was chunk-A only and is largely solved by claude-in-chrome now being installed. **No action.**

## 10. Skill sprawl — HOUSEKEEPING (optional)

~65 user-level skills plus 33 project skills, with heavy churn visible in git status (mass skill deletes/adds in `.agents/skills/`). Several overlap (4+ design skills, 3 gmail skills, tdd + test-driven-development). Cost: skill-triggering ambiguity (see item 9) and index noise.

- **Recommendation:** prune to the ones actually invoked in the last 30 days (the transcripts show heavy use of: grill-*, pickup/wrapup, chat-export, impeccable, extract-design, skill-creator; most others never fire). Build cost: an hour of curation, low urgency.

---

## Summary table

| # | Cluster | Sessions | Action | Cost |
|---|---------|----------|--------|------|
| 1 | Visual verify before done | 10+ | CLAUDE.md rule + hook | tiny |
| 2 | Lovable git races | 9+ | pull-rebase-push wrapper | ~30 min |
| 3 | Context/handoff choreography | 12+ | /resume skill + staging habit | low |
| 4 | Blocked sleep polling | 11 hits | 1-line CLAUDE.md rule | 2 min |
| 5 | tmpfs full | 3 (rising) | cleanup hook | 15 min |
| 6 | Intro-to-LR parity audits | 7 | bootcamp-parity-audit skill | med-low |
| 7 | Lovable hand-carry | 8 | verify Supabase MCP first | low |
| 8 | De-AI branding / fake data | 6 | CLAUDE.md addition | 2 min |
| 9 | Skill misfires | scattered | nothing | — |
| 10 | Skill sprawl | ambient | prune | 1 hr |

Items 1, 2, and 4 are the highest leverage per unit of build cost. Item 3 is the biggest total time sink but partially served by existing skills; build only the `/resume` half.
