# LSAT U Onboarding — Design Spec (v1)

_Locked via grill with Joshua, 2026-07-18. Source capture: `~/ai-os/brainstorms/2026-07-18-lsatu-onboarding.md`._

> **v2 (2026-08-02): the intake moved into the classroom and stopped being automatic.**
> A new signup is no longer redirected anywhere. Everyone lands on `/classroom`, where the
> orientation card (`src/components/classroom/OrientationCard.tsx`) sits first on Home and has
> to be opened and clicked through. The steps expand inside that card; they never take over the
> screen. What changed from the spec below:
> - **No redirect, no separate screen.** `redirectAfterAuth` always sends users to `/classroom`;
>   `/onboarding` is now a redirect to `/classroom`, and `ClassroomLayout` no longer bounces a
>   student who has no name yet (the sidebar shows their email until step 1 writes one).
> - **A test-date step** was added after the target score, writing the real `profiles.test_date`
>   column (which the classroom dateline counts down from) plus a copy in the answers blob.
>   "I haven't picked a date yet" answers the step and leaves the column null.
> - **No "Skip for now."** The card is not a jail, so it does not need an escape hatch: it simply
>   waits on Home until the student finishes it. Only Finish sets `onboarding_completed_at`.
> - **Eight steps**: name, last score, experience, schools, target score, test date, life stage,
>   study time. Per-step save and resume are unchanged.
> - **The answers are editable later.** "Your prep" on the Account page lists all seven intake
>   answers and reopens the card's own input to change any one of them
>   (`src/components/classroom/account/PrepSection.tsx`). The inputs themselves live in
>   `src/components/classroom/onboarding/stepFields.tsx` so the card and the account page cannot
>   drift into two versions of the same question.
>
> The sections below describe the retired v1 redirect flow. Everything about the questions,
> the stored shape, and the copy still holds; the delivery surface does not.

## Goal

When a new user signs up on lsatprep.study, run a clean, one-time onboarding that collects placement/personalization intake (current score, target, schools, life context, weekly study time, and a short free-text on what's hard). v1 is **data-only**: it stores the answers and lands the student on the Foyer. It does not yet branch the app on the answers — Joshua personalizes by hand from the intake (the premium edge). The flow order mirrors an approved competitor reference (LexPrep), re-skinned to LSAT U's Academy design system.

## The flow (7 screens)

One `/onboarding` route, one question per screen, internal step state, a progress bar filling 1/6 → 6/6, and Back/Continue on each step (final = **Finish**). Each step also shows a **Skip for now** escape.

| # | Screen | Input | Required? | Stored as |
|---|--------|-------|-----------|-----------|
| 0 | **What should we call you?** (existing) | text (name), pre-filled from Google metadata if present | Yes | `profiles.display_name` |
| 1 | **What did you get on your last LSAT?** | single-select band | Yes | `onboarding.last_score_band` |
| 2 | **How has your LSAT experience been so far?** | free textarea (native dictation only, no custom mic) | No | `onboarding.experience_text` |
| 3 | **What schools are you interested in?** | searchable law-school picker, up to 5, numbered | No | `onboarding.schools[]` |
| 4 | **What score are you aiming for?** | single-select band, student picks (no AI, no recommendation) | Yes | `onboarding.target_score_band` |
| 5 | **Which best describes you?** | 4 cards: Undergraduate / Graduate / Working / All Other Cases | Yes | `onboarding.life_stage` |
| 6 | **When can you study?** | per-day Sun–Sat: No time / < 1 hr / 1–2 hrs / 3+ hrs (default 1–2 hrs) | Yes (defaulted) | `onboarding.study_time{sun..sat}` |

Copy per step (headline + subtext), from the reference:
- Step 2 subtext: "Share what has felt easy and what has felt hard so we can personalize your plan." Placeholder: "Logic Games felt easier, but Necessary Assumption questions are still hard for me."
- Step 3 subtext: "We'll build your experience with LSAT U around getting into these schools."
- Step 4 subtext: "This helps us set the right pace for your prep."
- Step 6 subtext: "Set how much time you have each day. You can always change this later."

## Approach

1. **Schema (Supabase migration).** Add to `profiles`:
   - `onboarding jsonb` — holds `last_score_band`, `experience_text`, `schools` (array), `target_score_band`, `life_stage`, `study_time` (object keyed sun..sat).
   - `onboarding_completed_at timestamptz` — the gate.
   - Backfill: `UPDATE profiles SET onboarding_completed_at = now() WHERE onboarding_completed_at IS NULL` so only fresh signups see onboarding.
2. **Score enum (shared).** One band set reused by steps 1 and 4: `lte_150`, `151_155`, `156_160`, `161_165`, `166_170`, `171_175`, `176_180`. Step 1 adds `not_taken` + `not_sure`; step 4 adds `not_sure`.
3. **Gate wiring.** `redirectAfterAuth(user.id)` reads `onboarding_completed_at`: null → `/onboarding`; set → Foyer/mainhub. Applies identically to email/password and Google OAuth signups.
4. **Per-step save + resume.** Each Continue upserts that step's field into `profiles.onboarding` immediately. On re-entry with a null gate, land on the first unanswered step. Closing the tab does NOT set the gate.
5. **Skip / Finish set the gate.** An explicit **Skip for now** press OR **Finish** sets `onboarding_completed_at = now()`. After that, onboarding is never shown again (one-time, permanent). Partial answers already saved persist.
6. **Landing.** Finish → Foyer, unchanged. No app-side branching on answers in v1.
7. **Skin.** Academy design system (marble/bronze/obsidian, serif headlines, bronze `#C6A467` accent), reusing `GlassShell`/`BorderBeam` from the current `Onboarding.tsx`, but restrained: simple fade between steps, no particle/showpiece motion. Dark theme only, no per-step light/dark toggle.
8. **Verify in-browser** (LSATU hard gate) before calling it done — dev server + browser tool, screenshot/DOM evidence of the full flow.

## Key decisions & tradeoffs

- **Skip = permanently done.** One Skip sets the gate; the student never sees onboarding again even with zero answers. Chosen for premium feel over forced intake; tradeoff is best-effort data (Joshua chases stragglers via inbox). Reconciled with resume: closing the tab ≠ skipping, so only a deliberate Skip/Finish ends it.
- **jsonb on `profiles`, not a new table.** Matches existing `layout_prefs`/`by_qtype_json` pattern; no join, no new RLS policy. Tradeoff: less queryable across students than a dedicated table — acceptable at current scale.
- **No AI on target score.** Student types/picks it. Honors the no-fake-data rule; avoids an LLM/edge function and mid-flow latency.
- **Data-only v1.** No adaptive branching; personalization is manual. Keeps the build small; light personalization (seed `daily_goal_questions` from study time, point Foyer's primary node at a matched drill) is a scoped follow-up.
- **Reuse the existing name step as step 0.** Reuses working gate logic and the name-not-username rule.

## Risks / open questions

- **Law-school data for step 3.** Need a source list of law schools for the searchable picker (static bundled list is fine; no medians needed since the AI recommendation was cut). Confirm the list source before building step 3.
- **`display_name` vs `onboarding` gate ordering.** Current Mainhub gates on the profile row existing; ensure the new `onboarding_completed_at` gate composes with that without double-routing.
- **Backfill timing.** Run the backfill in the same migration that adds the column so no existing student is ever briefly gated into onboarding.

## Out of scope (v1)

- App-side personalization / adaptive placement (follow-up).
- Vault mirror into `students/<name>/` — will happen, but as a brain-side Jay 2 ingestion, not an app write.
- Voice/mic dictation on step 2.
- Onboarding analytics / funnel drop-off tracking.
- Editing answers later from Settings/Profile.
- Teaching-voice copy pass on the 6 headlines (optional pre-ship nicety, not requested).
- Light-theme variant of the onboarding skin.
