# Reading Comprehension

Full-passage RC drilling: a picker, a LawHub-style two-pane player, an
attempt-first review layer, and a results page. Distinct from the LR **Drill**
engine — RC is passage-first *for reading*: a passage always renders whole, and
its player is a full-screen exam interface rather than a card inside the
product's chrome. Selection is a separate matter and may happen at either grain,
a passage or named questions within one (see **Question subset**).

## Language

**Passage**:
One RC passage with its full text and the questions attached to it. Always the
unit a student *reads* — a passage is never partially rendered. Every passage
belongs to one section of one PrepTest.
_Avoid_: article, reading, text block, item

**Set**:
The group of things a student assembles and drills, in RC exactly as in LR. A
set holds passages, questions, or both; drilling one produces a **session**.
One word, one meaning, on both sides of the picker's mode toggle.
_Avoid_: collection, batch, queue, using "set" for a passage's position

**Section**:
The four passages that appeared together in one section of one PrepTest, in
published order — what a student sits when they want the real thing rather than
a drill they assembled. Composition is fixed; only the pace is chosen. A section
whose passage has no drillable questions is not offered at all, because reading
four passages and being asked about three is not a section. Derived from the
index by `lib/rcSections.ts`; nothing about it is stored.
_Avoid_: full test, practice test, timed set, section drill

**Short section**:
A **Section** carrying fewer than 26 questions, which is below what a real one
runs. Sections fall short because the source publishes answer choices only for
questions with a written explanation. Always labelled as short where it is
offered — a student pacing themselves against a 16-question "section" would
learn the wrong pace. Never padded to hide it.
_Avoid_: partial section, incomplete section, trimmed section

**Position**:
A passage's place within its section (1-4), carried in the data as `setNumber`
and shown by the source as "Set Difficulty". The field name stays; the
student-facing word is Position, because Set now means the thing you build.
_Avoid_: set, slot, index

**Question subset**:
The selected questions of a passage when a set names fewer than all of them.
The passage still renders in full — a subset narrows what is *asked*, never what
is read. A set that names no subset for a passage asks every question in it.
_Avoid_: partial passage, question slice, trimmed passage

**Comparative passage**:
A passage whose `format` is `Comparative`: an italic intro line followed by
`**Passage A**` and `**Passage B**` headers inside one body of text. Not two
passages.
_Avoid_: dual passage, paired passages, A/B passage

**Session**:
One run of a drill: an ordered list of passages, an optional **question subset**
per passage, a config, and the attempts written against it. Rows live in
`rc_drill_sessions`. A session is `in_progress`, `completed`, or `abandoned`.
_Avoid_: drill run, attempt (an attempt is per question), test

**Pace**:
The clock a timed session is priced against. **Today** that is a flat
per-passage budget — `secondsPerPassage × passageCount` — which is why a
**Section** needs no timing mode of its own: 525s across four passages is
exactly the 35:00 a real one runs.
**Planned** (`docs/adr/0006`, not built): one reading allowance per passage plus
a per-question allowance for each question actually asked, so a **question
subset** stops receiving a whole passage's clock. Until that lands, a subset is
overpriced.
_Avoid_: timer, budget, time limit

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
A student's highlights and underlines on a passage, a question stem, or an
answer choice, stored per (user, passage) in `rc_annotations` as character
offsets into the rendered text of their target, so they restore on any future
encounter with that passage. Targets are `'passage'`, `q<id>:stem`, or
`q<id>:<letter>` (`questionTarget()` in `lib/rcTypes.ts`); one passage row
carries every question's marks.
_Avoid_: note, markup, comment

## Routes

| Route | Page | What it is |
|---|---|---|
| `/classroom/drill?section=rc` | `pages/AcademyMainhub.tsx` | **The RC hub.** A section of the drill hub, chosen by the LR/RC switch in its tools row. `&stage=type-drill` opens the builder (`components/RcHubSurface.tsx`), `&stage=full-section` the section selector |
| `/rc` | `pages/RcRedirect.tsx` | Compatibility adapter, not a page. Redirects to the route above, preserving the query verbatim; a query carrying builder params also gets `stage=type-drill` so the builder is mounted to read them. Links to it are in the wild, so it stays |
| `/rc/drill` | `pages/RcPlayer.tsx` | The player. `?sessionId=` resumes, `?passage=` starts an ad-hoc single-passage drill, `?review=1` opens read-only review |
| `/rc/results/:sessionId` | `pages/RcResults.tsx` | Score, per-passage breakdown, question table, and the actions off a finished drill |
| `/rc/search` | `pages/RcSearch.tsx` | Search passages and questions by keyword and every tag (topic, format, framework, family, type, feature, difficulty, PrepTest range). Results open the passage in the player |

Assignment is a link, not a table: `/rc/drill?passage=<id>` for one passage, or
`/rc?passages=1188,1201&reveal=per_passage&timing=unlimited` to pre-fill the
builder. **The `/rc?…` form is still the contract** — it now arrives through the
adapter rather than at a page of its own, and every param below survives that
hop. A link that also carries `start=1` starts the drill itself and replaces its
own history entry, so Back from the player cannot re-fire it into a second
session. A **Section** is the same contract with its four passage ids in
published order, `reveal=end_of_set`, and `timing=standard`
(`RC_STANDARD_SECONDS_PER_PASSAGE` × 4 = 2100s, exactly 35:00 — the section
clock needs no separate timing mode). `secondsPerPassage=<n>` overrides the
per-passage budget, which is how the accommodations paces are expressed; it is
bounded to 60-3600 because it arrives from a URL.

## Where the content comes from

Content is static JSON, like the LR bank. **No database is involved in serving
content**; only the student's own progress touches Supabase.

- `scripts/build-rc-bank.mjs` converts the source bundle into
  `public/data/rc/RC-PT<n>.json` (59 files) plus `rc-index.json`. It validates
  its own output and fails loudly. The per-file shape is the contract for
  `lib/rcTypes.ts` — change one and you must change the other.
- `lib/rcBank.ts` loads the index once and per-PrepTest files on demand.
- `scripts/build-rc-search-index.mjs` derives `public/data/rc/rc-question-index.json`
  from the built bank: one flat record per drillable question (type, family,
  features, prompt) so `/rc/search` never loads a PrepTest file. Its shape is the
  contract for `RcQuestionIndexEntry` in `lib/rcTypes.ts`.
- The source bundle lives at `scripts/rc-source/` and is git-ignored. Re-extract
  it from the original zip before re-running the build.

**The bank holds 1,602 drillable questions, not the source's 2,150.** The source
publishes answer choices only for questions that carry a written explanation, so
the 548 without one have no choices at all and cannot be rendered or drilled.
They are excluded and listed in `scripts/rc-source/conversion-report.txt`, which
also records the eleven passages left with no drillable questions. Never backfill
a missing tag, summary, explanation, or choice to make the data look complete.

## Styling

**RC and LR are one interface.** The player renders inside the same components
the LR drill uses — `OfficialDrillFrame`, `OfficialSessionStrip`,
`OfficialDrillToolbar`, `OfficialSmartDrillBar` — rather than reproducing them.
Change the frame and both drills change. This reverses the earlier decision that
kept the player off the LSAT U design system as a standalone LawHub clone; it
had produced two lookalikes that were already drifting.

Where RC differs from LR, it is because the official RC interface differs, and
each one is deliberate:

- the letter badge is an outlined circle, not a rounded square
- the eliminate control is always visible, not revealed on row hover
- there is a pager: every question, with a rule between passages, and chevron
  buttons at the right
- the toolbar carries `Passage Only View`, response masking, the review grid and
  full screen, which have no LR equivalent
- the frame is pinned to the viewport (`fillViewport`), because a passage scrolls
  and an LR stimulus does not

Three stylesheets are involved, and the split matters:

- **No RC stylesheet** for the frame, toolbar or footer. Those are the shared
  official components and carry Tailwind only.
- `player.css` — scoped to `.rc-exam`, and only the four things that genuinely
  need CSS: the six accessibility color schemes (which repaint the two reading
  columns via `--rc-bg` / `--rc-fg` and must never touch the frame), the exam
  paragraph conventions (`text-indent` plus the `:has()` rules that un-indent
  comparative headers), Passage Only View's two-column reflow, and the highlight
  and find `<mark>`s, which are painted into the DOM and so cannot carry React
  classes.
- `rc.css` — the review layer, plus the hub, which runs on the classroom's
  observatory ladder. The ladder is hosted in `classroom.css`, which names
  `.rc-page` alongside the classroom root. `.rc-button`'s base rule is shared
  with the review layer *inside* the player, so the hub's treatment is scoped
  under `.rc-page`.

Annotations carry a `kind` — `'highlight'` or `'underline'`. Absent means
highlight, so anything stored before underlining existed still reads. Colors are
LR's three markers at its alpha and blend mode; anything stored under a retired
color still paints, as yellow. Every markable surface (passage, stem, each
choice) runs the same mouse-up ladder from `hooks/useRcMarkSurface.ts` and
paints through `paintRcAnnotations`, so the tools, the eraser and the popover
cannot drift between them. A pane owns one popover; a surface reports its
anchor plus a handle back to itself so the popover's buttons act on the right
text.
