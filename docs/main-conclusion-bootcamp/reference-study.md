# Reference Study — Gate 1 Output

**Status:** Draft. Pending Joshua's sign-off.
**Author:** Claude Code, 2026-04-30.
**Per:** Handoff §3.B + §6A.

For each reference: **what to study**, **what to borrow**, **what to reject**, **where it lands in the bootcamp**. Findings here feed Gate 3 architecture, never replace it (handoff §6A Rule 6).

> **A note on access.** I have not loaded the live sites/apps in this session. The notes below are anchored in established product behavior across these tools (well-documented in their public-facing docs and design write-ups). Before Gate 3, I'll cross-reference the deployed Causation Station and Abstraction URLs (need URLs from Joshua — see Open Question #4) and revise any line below that turns out wrong on contact.

---

## 1. Linear (linear.app)

### Study
- Three-zone shell: persistent left rail (workspace nav, projects, views, filters), main canvas (issue list / triage / cycle), context-aware right panel (issue detail, sub-issue tree, audit log).
- Command palette (Cmd+K) is a first-class navigation primitive. Every action reachable via keyboard.
- Issue detail loads in-place (right drawer) without losing list context. ESC closes.
- Density: status pills, label chips, assignee avatars all in tight rows. Mono for IDs (`ENG-1234`).
- Motion: 150–200ms drawer slides. No fades on every state change. No bounce.
- Status / priority / assignee are all single-keystroke editable.

### Borrow
- **Three-zone workspace shell** (handoff §6 echoes this exactly): left rail = module nav + named tools list + review queue badge + command palette trigger; canvas = active module surface; right drawer = audit / coach / reference / journal opens in place, no backdrop dim, ESC closes, 180ms slide.
- **Command palette (Cmd+K)** for jump-to-lesson, jump-to-drill, jump-to-named-tool, jump-to-question by ID. Supports source-backed slot IDs (`MC-LSN-1.7`, `MC-DRL-3.4`, `MC-Q-PT58-S1-Q13`) — a hard requirement from handoff §6 source-backed UI slot rule.
- **Inline status pills** in mono for module / drill / stage state.
- **Keyboard-first nav** with visible focus rings (2px gold offset, per spec §3.7.2).

### Reject
- Linear's project / cycle / sprint mental model is irrelevant. Don't reuse it as scaffolding for module / drill / question.
- Linear's color system (cool blues/violets) — we use Aspiring Gold + dark navy + role colors instead.
- Triage queue concept — students don't triage; they progress through Stage-Gates.

### Lands in
- `src/components/workspace-shell/` (three-zone container).
- `src/components/primitives/command-palette/` (Cmd+K).
- Module nav left rail with Stage-Gate progress + named-tools quick list.

---

## 2. Readwise Reader (readwise.io/read)

### Study
- Editorial typography: serif body, generous line-height (1.6–1.7), wide enough measure to read without crowding but narrow enough to keep eyes anchored.
- Highlight + ghost annotation pattern: tap a sentence → it lifts on a soft surface; a side panel hosts the note. Multi-color highlight semantic.
- AI ghost-reader: summary + key points pinned in a side rail without dominating the read flow.
- "Focus mode" that fades chrome when you start scrolling, restores on hover.

### Borrow
- **Long-form serif prose for Lessons module.** Spec §3.1.2 already specifies system serif for Register 2 voice — Readwise validates the readability bar for sustained reading.
- **Sentence-level interaction surface.** When students tap a sentence in a stimulus, it elevates; the role-color overlay (X-Ray Scan) and Coach's Note attach to the elevated surface. Pattern lifted from how Readwise treats highlights.
- **Side-rail context that doesn't dominate.** Right drawer for Coach's Note keeps the stimulus center-stage. Same logic as Readwise's ghost-reader.
- **Focus mode** is already in spec §10 (lifted from LR Field Manual prototype) — Readwise reinforces the pattern.

### Reject
- Readwise's social/sharing layer (highlights → tweets / quotes export): not relevant to a focused study tool.
- "Daily review" cards as the home surface — our home is module progress, not snippet-of-the-day.
- Heavy reliance on imported web content metadata (titles, authors, source domain) — our content is canonical and authored.

### Lands in
- `src/modules/lessons/` typography and reading surface.
- `src/components/x-ray-scan/` sentence-tap → role overlay interaction.
- Right drawer's Coach's Note pane.

---

## 3. Superhuman (superhuman.com)

### Study
- Latency budget: every action sub-100ms perceived. Optimistic UI everywhere.
- Single-letter keyboard shortcuts (E archive, U mark unread, etc.) with persistent cheat sheet.
- Snippets and command palette dominate; mouse is optional.
- Text-dense rows with mono IDs and color chips; rest of UI restrained.
- Motion is minimal; transitions feel instant.

### Borrow
- **Latency budget as a non-functional requirement.** Drill state transitions, Stage-Gate unlocks, Indicator chip toggles must feel instant. No spinners on local-only ops. Optimistic write to persistence, reconcile on read.
- **Single-letter shortcuts** in the Question Simulator: A–E to select, Enter to submit, R to reveal Coach's Note, T to open Trap Master overlay, J/K for prev/next question. Cheat sheet behind `?`.
- **Restrained motion.** 150–220ms, eased, no celebration animations on correct answers (per handoff §1 quality bar — "decorative animations rejected").

### Reject
- Superhuman's split-inbox / VIP / triage paradigm — not a workflow we have.
- Aggressive onboarding gamification (achievement unlocks, streaks). Handoff §8 explicitly rejects gamification.
- Sound effects on send / archive — silence is gold for a study tool.

### Lands in
- Performance budget written into the build (sub-100ms for any local action).
- `src/modules/simulator/` keyboard map.
- `src/components/primitives/keyboard-cheat-sheet/`.

---

## 4. Anki (apps.ankiweb.net)

### Study
- SuperMemo SM-2 spaced-repetition algorithm: per-card ease factor, interval, last-reviewed timestamp.
- Self-grading after each card: Again / Hard / Good / Easy. Grades feed the algorithm.
- Per-card history (review streak, lapse count).
- Decks ⊃ cards; subdecks for organization.
- Browser surface for editing, tagging, filtering cards.

### Borrow
- **SM-2-based spaced repetition for Module 6.** Handoff §6 specifies "spaced repetition seeded from end-of-module misses" and `srs.queue` is in the persistence record list. SM-2 (or SM-2 + FSRS as a v1.5 upgrade) is the proven baseline.
- **Self-grading after the answer + Coach's Note.** "Did you actually get this for the right reason?" with Again / Hard / Good / Easy. Pedagogical flow ruleset (post-instruction calibration) requires the student's honest self-assessment to feed the diagnostic engine; trap-tag-only data isn't enough.
- **Per-question review history** (last seen, ease factor, lapse count) stored in `mistakes.profile` and `srs.queue`.
- **Tag-based filtering** of practice queue: by trait number, by lesson, by indicator category, by drill type.

### Reject
- Anki's UI density (it's information-rich but visually 2005). We match Linear / Readwise polish.
- Anki's "create your own deck" model — our content is canonical, students don't author cards.
- Anki's leech-suspension mechanic — too punishing for an exam-prep tool. Use weakness profile callout instead.

### Lands in
- `src/modules/diagnostics/srs.ts` SM-2 implementation.
- `persistence/records.ts` `SrsQueueItem` shape (id, ease, interval, due, lapses, last_grade).
- Self-grade prompt in Question Simulator and end-of-module calibration drill.

---

## 5. UWorld

### Study
- Per-question full explanation: correct answer breakdown + each wrong answer addressed individually with the specific misconception that makes it tempting.
- "Educational objective" stated above the explanation — what concept this question tests.
- Performance dashboard slices by topic, sub-topic, percentile, time-of-day.
- Test mode (timed, sequential) vs Tutor mode (per-question feedback) toggle.
- Reference panel inline-accessible from any question (drug formulary, tables, etc.).

### Borrow
- **Coach's Note structure** (handoff §6 + spec §3.2.3) is exactly UWorld's per-answer audit pattern: Structure map → Core move → Per-answer audit (A/B/C/D/E with the trap each represents). Our masterclass workbooks already author this format verbatim — UWorld validates the pedagogy.
- **Educational-objective callout** above the Coach's Note: "This question tests Trait 5 (author would agree but isn't the conclusion)." Anchors the explanation in the named-tool taxonomy.
- **Tutor mode default for v1; timed Test mode is a toggle.** Pedagogical flow forbids cold-testing; tutor mode aligns. Test mode is for v1.5 calibration after instruction is well underway.
- **Per-answer-choice trap tagging surfaces in analytics** (Mistake Profile dashboard slice by trait).
- **Inline reference panel** = our right-drawer Reference Vault opening from any drill / simulator question.

### Reject
- UWorld's pricing surfaces and marketing chrome — not relevant to a private bootcamp.
- "Question of the day" home surface — pedagogical flow rejects pre-test cold prompts.
- The "compare your performance to the user base" percentile rank — vanity metric (handoff §1 explicitly rejects vanity metrics). Show absolute progress against the corpus instead.

### Lands in
- `src/components/coachs-note/CoachsNote.tsx` structure.
- `src/components/trap-master/TraitTag.tsx` inline trait callout.
- `src/modules/diagnostics/MistakeProfile.tsx` trait-sliced dashboard.
- Right drawer's Reference panel.

---

## 6. Causation Station (LSAT U internal benchmark)

### Study
*(Will require deployed URL from Joshua — see Open Question #4. Notes below are based on the handoff's framing of it as the visual / pedagogical quality bar.)*
- Premium private-academy aesthetic: dark mode, restrained gold accent, editorial typography.
- Per the handoff §1, this is one of the two internal apps we must match or beat in: pedagogical depth, interaction quality, visual polish, analytics integration.
- Likely (to verify): named-tool callouts, spec-specific drill mechanics for causation flaw types, post-question audit format.

### Borrow
- **Quality bar.** Causation Station + Abstraction define "premium private-academy bootcamp" for v1. Every screen is reviewed against this bar at Gate 4.
- **Visual identity continuity.** If Causation Station is dark navy + Aspiring Gold + JetBrains Mono + serif prose, we match exactly to make absorption a visual layer-swap.
- **Named-tool callout treatment.** Whatever Causation Station does for its tool taxonomy (Causal Stack, Reverse-Causation Trap, etc.), Main Conclusion mirrors for FABS / 2-Part Check / Trap Master / etc.
- **Analytics dashboard structure.** If Causation Station already has a mistake profile / weakness viewer, Main Conclusion's Module 6 should resemble it for cohesion across LSAT U topics.

### Reject
- *To be determined on inspection.* Anything that feels like "edtech generic" rather than "private academy" — same rejection criteria as everywhere.

### Lands in
- Visual identity sanity-check at Gate 3.
- Module 6 diagnostics layout reference at Gate 4.

---

## 7. Abstraction (LSAT U internal benchmark)

### Study
*(Same caveat as Causation Station — needs URL.)*
- Per the handoff §6 candidate Lessons module: "Progressive teaching modeled on Abstraction. Intro screens, reveal sequence, inline guided examples, typed student-response checkpoints, coach translation, named-tool callouts, voice-led prose."
- This is the reference for Module 1 (Lessons) specifically.

### Borrow
- **Lessons module flow** mirrors Abstraction: intro reveal → guided example → checkpoint → coach translation → named-tool callout → voice-led prose carries student forward.
- **Typed student-response checkpoints**: not multiple choice, but free-text the coach interprets. Critical for Pre-Phrase Goal drill where students replace pronouns with actual reference language.
- **Coach translation pattern**: student types their answer, coach restates in canonical terms. Lifts directly into Pre-Phrase Goal and R&R Drill review surfaces.

### Reject
- *TBD on inspection.* If Abstraction has any gamification beyond Stage-Gate, we strip it.

### Lands in
- `src/modules/lessons/` lesson template (intro → reveal → checkpoint → coach → tool callout → next).
- `src/components/coach-translation/` typed-response → canonical-form display.

---

## Cross-cutting takeaways

1. **The shell is Linear.** Three zones, command palette, keyboard-first.
2. **The reading surface is Readwise.** Editorial serif, sentence-level interaction, focus mode.
3. **The latency budget is Superhuman.** Sub-100ms perceived for any local op.
4. **The diagnostic spine is Anki + UWorld.** SM-2 + per-answer trait audit + tutor-mode-default.
5. **The visual ceiling is Causation Station + Abstraction.** Match or beat. Period.
6. **None of these gets to dictate layout in isolation.** Layouts are designed against the merged set of references with the spec §3.2 component library as the concrete output. 21st.dev MCP supplies primitives only (handoff §6A Rule 1).
7. **Source-backed slot rule applies everywhere** (handoff §6 + §6A Rule 7). Every reference borrow has to keep `source_item_id` / `question_id` / `lesson_id` / `named_tool_id` / `trap_tag` / `correct_choice_id` visible or accessible. Components that hide source identity are rejected.
