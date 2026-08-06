# Reading Comprehension

Full-passage RC drilling: a picker, a LawHub-style two-pane player, an
attempt-first review layer, and a results page. Distinct from the LR **Drill**
engine — RC is passage-first, so the unit a student chooses is a passage, never
a single question, and its player is a full-screen exam interface rather than a
card inside the product's chrome.

## Language

**Passage**:
One RC passage with its full text and the questions attached to it. The unit a
student picks, a teacher assigns, and the selection engine reasons about. Every
passage belongs to one section of one PrepTest.
_Avoid_: article, reading, text block, item

**Set**:
The source's word for a passage's position within its section, carried in
`setNumber` (1-4) and in a passage's "Set Difficulty". It never means a
collection of questions here — that is a **session**.
_Avoid_: using "set" for a group of questions (reserved for the LR Build a Set)

**Comparative passage**:
A passage whose `format` is `Comparative`: an italic intro line followed by
`**Passage A**` and `**Passage B**` headers inside one body of text. Not two
passages.
_Avoid_: dual passage, paired passages, A/B passage

**Session**:
One run of a drill: an ordered list of passages, a config, and the attempts
written against it. Rows live in `rc_drill_sessions`. A session is
`in_progress`, `completed`, or `abandoned`.
_Avoid_: drill run, attempt (an attempt is per question), test

**Attempt**:
One recorded answer to one question inside a session, in `rc_attempts`. Attempts
are append-only. The first write for a question in a session is the **first
attempt**; every later write, including a review re-answer, is a new row with
`is_first_attempt: false`. Scoring counts first attempts only, so reviewing can
never change a score.
_Avoid_: answer, response, submission

**Reveal mode**:
When feedback appears: `per_question` (confirm, then reveal that question),
`per_passage` (reveal a whole passage at its boundary — the default), or
`end_of_set` (nothing until submit). Student-facing wording is "After each
question / After each passage / At the end".
_Avoid_: feedback mode, review mode (review is the surface, not the timing)

**Review**:
The feedback surface itself: verdict, authored walkthrough blocks, and the
per-choice disclosure rows. Reached inline after a reveal, or by deep link from
results, where it starts with a re-attempt.
_Avoid_: explanation tab, solution, answer key

**Status**:
A passage's standing in the student's own history, rolled up from its questions:
**Fresh** (no attempt on any of its questions), **Incorrect before** (at least
one question ever missed), **Incorrect on last try** (at least one question
missed on its most recent take).
_Avoid_: seen, mastered, learned

**Adaptive**:
One thing only: prefer fresh passages whose difficulty sits near a target read
off the student's rolling accuracy over their last 40 first attempts. Deterministic,
no model. Named to students exactly as "Adaptive: fresh passages near your level."
_Avoid_: smart, AI, personalized, intelligent

**Annotation**:
A student's highlights on a passage, stored per (user, passage) in
`rc_annotations` as character offsets into the rendered text, so they restore on
any future encounter with that passage.
_Avoid_: note, markup, comment

## Routes

| Route | Page | What it is |
|---|---|---|
| `/rc` | `pages/RcHub.tsx` | Build a drill, hand-pick passages, resume or review past drills |
| `/rc/drill` | `pages/RcPlayer.tsx` | The player. `?sessionId=` resumes, `?passage=` starts an ad-hoc single-passage drill, `?review=1` opens read-only review |
| `/rc/results/:sessionId` | `pages/RcResults.tsx` | Score, per-passage breakdown, question table, and the actions off a finished drill |

Assignment is a link, not a table: `/rc/drill?passage=<id>` for one passage, or
`/rc?passages=1188,1201&reveal=per_passage&timing=unlimited` to pre-fill the
builder.

## Where the content comes from

Content is static JSON, like the LR bank. **No database is involved in serving
content**; only the student's own progress touches Supabase.

- `scripts/build-rc-bank.mjs` converts the source bundle into
  `public/data/rc/RC-PT<n>.json` (59 files) plus `rc-index.json`. It validates
  its own output and fails loudly. The per-file shape is the contract for
  `lib/rcTypes.ts` — change one and you must change the other.
- `lib/rcBank.ts` loads the index once and per-PrepTest files on demand.
- The source bundle lives at `scripts/rc-source/` and is git-ignored. Re-extract
  it from the original zip before re-running the build.

**The bank holds 1,602 drillable questions, not the source's 2,150.** The source
publishes answer choices only for questions that carry a written explanation, so
the 548 without one have no choices at all and cannot be rendered or drilled.
They are excluded and listed in `scripts/rc-source/conversion-report.txt`, which
also records the eleven passages left with no drillable questions. Never backfill
a missing tag, summary, explanation, or choice to make the data look complete.

## Styling

Two stylesheets, deliberately separate:

- `player.css` — scoped under `.rc-player`. A faithful LawHub exam interface, so
  it uses literal exam colors and its own type stack. **The LSAT U design system
  does not apply inside the player**; this is a locked design decision, not drift.
- `rc.css` — the hub, results, and review chrome. Uses the product's tokens.
