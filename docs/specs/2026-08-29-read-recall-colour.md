# Spec — Read, Recall, Colour (RRC)

Status: **design closed. Steps 1, 2 and 3 are built, with the orb verified
running in the app. Two gates remain: Joshua has not reviewed a calibration
batch, and nobody has completed a run end to end with a microphone. RRC is
deliberately not seeded until that run happens.**
Written: 2026-08-29.
Design record: `~/ai-os/brainstorms/2026-08-28-quipping-voice-trainer.md`
(Q0 through Q20, all answered).
First user: Joshua, before any student.

## 1. Decision

Build **Read, Recall, Colour** as an Activity in the Activity Centre.

The student reads one chunk of a stimulus. The app hides it. She says it back
out loud from memory. She then reacts to it out loud. She moves to the next
chunk. At the end of the stimulus she gives her read on the whole thing. Every
few chunks the app asks her to recall everything so far, with nothing on
screen.

The app scores the recall, never the reaction, and never re-shows text she has
already been given.

**Hiding the text is the product.** The drill has always asked the student to
look away on the honour system. Software makes it structural. Everything else
in this spec is in service of that one move being worth building around.

## 2. Vocabulary

Student-facing. These are the only names that appear in the UI.

| Term | What it is |
|---|---|
| **Read** | Stage 1. The chunk is on screen and she reads it. |
| **Reading Recall** | Stage 2. Text hidden. She says the chunk back in her own words. |
| **Colouring In** | Stage 3. She reacts to the chunk out loud. |
| **The Read** | End of stimulus. Her analytical take on the whole thing. |
| **Read, Recall, Colour (RRC)** | The Activity. |

Internal only, never shown to a student:

- **Detail** — one conceptual unit of a chunk, stored and numbered. The thing
  completeness is measured against.
- **Framework** — whether the relationships between the ideas survived, as
  distinct from their order. "Framework" is on the banned-words list for
  anything a student reads. Student-facing this is "how the pieces fit."
- **Genericness** — whether a colour would have fitted any stimulus.

Reserved elsewhere in the app and not reused here: **Drill** (the MCQ engine),
**Item** (one Activity prompt), **Verdict** (`correct`/`partial`/`incorrect`).
RRC's unit is a **chunk**, not an Item, because one RRC Item is a whole
stimulus and a chunk is a step inside it.

## 3. The loop

Per chunk:

1. **Read.** The chunk is on screen. One button: "Got it."
2. **Reading Recall.** The chunk is gone. Screen shows a mic level and which
   chunk she is on. Nothing readable. She speaks; she taps to stop.
3. **Feedback, immediately.** The chunk returns to screen with the details she
   dropped named, and her own transcript beside it.
4. **Colouring In.** She reacts out loud. The app shows no judgement, no score,
   no acknowledgement of quality. Anything advances her.
5. **Next chunk.**

At the end of the stimulus: **The Read**, spoken, captured, stored, not scored
in v1.

Interleaved, on the cumulative schedule in section 8: recall everything so far,
with nothing on screen.

### Rules the loop must enforce

- **No rereading.** Once a chunk is hidden it never comes back except in the
  feedback step for that same chunk. A cumulative round shows nothing at all.
- **Colouring In is mandatory.** She cannot advance without it. The gate is
  that she said something, not that she said something good. Silence does not
  advance: if nothing was captured, ask again.
- **No retry of a chunk.** Misses are shown and the run moves on. The dropped
  detail gets its second chance in the next cumulative round.
- **No live transcript during recall.** Watching her own words appear is
  rereading with extra steps, and it invites mid-sentence self-correction,
  which the stream-of-consciousness rule bans. The transcript appears only in
  step 3, after she has stopped.
- **No visible timer.** Time is measured and reported at the end. A clock on
  screen is what produces the rushed reading this drill exists to kill.

### The recall screen is the orb

The one thing on the recall screen is **the orb**, the plexus sphere from the
command centre (`projects/command-center/app/js/vendor/plexus-sphere.js`, and
its authority is `docs/adr/0005-the-orb-is-a-post-processed-scene-not-a-drawn-one.md`).

**Why it earns the place rather than a level meter.** She needs to know she is
being heard. The obvious way to tell her is a live transcript, and that is
banned here for good reasons: it is something to read, it is rereading with
extra steps, and watching her words appear invites the mid-sentence
self-correction the stream-of-consciousness rule exists to stop. The orb answers
the same need with nothing readable on it at all. It is the only element that
can sit on that screen without undoing what the screen is for.

**It already does what this needs, and none of it has to be built.** The
element is self-contained and takes these directly:

- `setLevel(v)` takes live microphone amplitude, 0 to 1, and smooths it
  internally, so the caller can push raw analyser values every frame without the
  orb jittering.
- `mode="voice"` makes amplitude drive both speed and scale, so it surges on her
  voice and settles into a slow breath on silence. That is the recording state,
  visible from across a room and unreadable up close.
- `state="idle" | "working"` multiplies the hue rate by 2.48. Recall is
  `working`, the pause between chunks is `idle`, so the screen changes character
  at the moment her job changes without a word appearing.

**Three integration facts that will otherwise cost a day each:**

1. It needs `window.THREE` r128 plus the five vendored addon files that ship
   beside it. That is a real dependency to bring into the Vite build, not a
   component copy.
2. **The RRC orb must not have `id="orb"`.** Only an element with that id
   publishes `--orb-hue` to the document root, and each write restyles the whole
   document. A second publisher would fight the host page for the property.
3. **Size it by the camera, never by a CSS box.** `gl_PointSize` is in device
   pixels and does not scale with the canvas, so growing a small box grows the
   cloud while leaving every particle the size it was, and the orb thins into
   dust exactly as it gets big. The ADR covers this and the performance work: a
   full-viewport canvas at device ratio 2 measured 16fps on Joshua's Iris Plus
   645. RRC should take a small canvas and a lower `particles` count rather than
   repeat that.

### The orb speaks the prompts

Settled 2026-08-29: **the orb prompts her out loud.** She is told what to do
next by voice, not by text on a screen.

This is not a flourish. It is the strongest version of what the whole activity
is for. The screen has nothing readable on it because reading is what the drill
is treating, and a spoken prompt means she never has to look at it at all. She
can close her eyes for a whole stimulus, which is what the drill asked for by
discipline and what the software has been trying to get by construction.

**What it says, and what it must never say.**

The orb speaks stage prompts only: say it back, react to it, now everything so
far, next one. **It never speaks the stimulus, a chunk, or any part of one.** A
chunk read aloud is a reread with the eyes closed, and it would undo the hiding
that justifies this build. Reading is stage one and it happens with her eyes, on
the screen, once.

**The mechanism is `speechSynthesis`,** the other half of the same Web Speech
API the capture path already uses in `VoiceCoachModal`. It ships in the browser,
costs nothing, sends no audio anywhere, and keeps the whole loop local, which is
the same reason the capture side was the right choice.

**Four things this introduces that will otherwise cause bugs that look like
something else:**

1. **The microphone hears the speaker.** If recognition is already listening
   when the orb speaks, it transcribes the orb, and the student is scored on the
   app's own words. Recognition must not start until the utterance's `onend`
   fires, and must be stopped before any utterance begins. This is the failure
   most likely to be misread as bad recognition accuracy.
2. **The orb should surge on its own voice too**, or it looks dead at the exact
   moment it is talking. `speechSynthesis` exposes no amplitude, but it fires
   `onboundary` per word, so `setLevel` can be pulsed from those and decayed
   between them. The orb already smooths what it is given, so a pulse train
   reads as speech rather than as flicker.
3. **`getVoices()` is asynchronous and its list differs per machine.** Resolve a
   voice once behind `voiceschanged`, pick deterministically with a named
   fallback chain, and never assume index 0. A different voice on a different
   machine is a different product.
4. **Speech can be unavailable or muted, and the run must survive it.** The
   fallback is the prompt as a short line on screen. That is safe where the
   stimulus is not: "Say it back" is an instruction, not something to read back,
   so showing it costs nothing the drill cares about.

**She can replay a prompt**, and asking for it again is free and unscored. Not
hearing an instruction is not a failure of recall, and making her guess would
put a second thing in her head while she is holding a paragraph in it.

### No themed environment, and the orb holds the wait

Settled 2026-08-29. RRC gets **no themed world**: no named room, no invented
place, nothing to look at but the orb. The other Activities have The Press, The
Switchyard, The Signal Observatory because each of those is a surface you work
ON. This one asks her to stop looking, so decorating the screen she is meant to
ignore works against it.

**What the orb is actually for, beyond recording:** it holds the gap between her
finishing and the feedback arriving. That gap is real and was not specced
before. She stops talking, the transcript settles, the Coach is called, a
verdict comes back, and that is a few seconds of nothing every single chunk,
dozens of times a session. A spinner there would be a small ugly thing appearing
at the exact rhythm of the drill.

**So the orb is continuous across record, transcribe and judge.** It never
disappears and is never replaced by a loading state. What changes is its
character, and only through what it already exposes:

| moment | orb |
|---|---|
| she is talking | `mode="voice"`, `setLevel` from the microphone: it surges on her |
| she has stopped, work is happening | `state="working"`, no level: the hue runs 2.48x faster and it keeps moving on its own |
| the orb is talking | `setLevel` pulsed from `speechSynthesis` boundaries |
| between steps | `state="idle"`, slow breath |

The student never sees a state that says "wait". She sees the same object doing
something different, which is what the ADR's own measurement of idle versus
working was for.

### Hold to talk, not auto-stop

Recording starts when she presses and ends when she lets go. It does not listen
continuously and it does not stop itself on a timer.

This is how she already works: the dictation tools this method recommends are
hold-a-hotkey-and-talk, and that is the interaction she has practised. It also
avoids the failure the existing `VoiceCoachModal` would hand us, which caps a
capture at 20 seconds. Twenty seconds is fine for a one-shot coach question and
far too short for a cumulative round over four chunks, where a cut-off would be
scored as dropped details she actually said.

Push-to-talk also means she decides when a thought is finished. Voice-activity
detection would end a recall in a pause she took to think, which is precisely
the moment this drill is trying to give her.

### One honest note on scope

The manual method transcribes only the final analytical output, because
transcription was the expensive step and checking the rest by ear was not worth
it. RRC transcribes **everything**: every recall, every cumulative round, every
colour. That is a real expansion rather than a port, and it is the thing that
makes per-detail feedback possible at all. It is also why speech recognition
accuracy is this activity's top risk rather than a footnote: the method never
had to depend on it, and this does.

## 4. Scoring

### Reading Recall — three criteria

1. **Details kept.** Completeness against the stored detail list for the
   chunk. Order-insensitive and set-based. Reordering ideas is encouraged by
   the drill, so any sequence-alignment scoring would punish exactly the
   behaviour it rewards.
2. **Own words.** Verbatim overlap against the chunk. **High overlap is the
   failure**, which is the inverse of most text comparison.
3. **How the pieces fit.** Whether the relationships between the ideas
   survived. Distinct from order: order is the sequence she says things in and
   is free; this is what supports what, and is not.

Overall the bar is "close enough", a tolerance, not a threshold. **No pass
mark is displayed.**

### Colouring In — one criterion, deferred

Genericness only. A colour is never right or wrong.

**It is never judged in the moment and never scored individually.** Any live
rating teaches her to vet before speaking, which is the exact habit the stage
bans. Genericness surfaces once, at session end, as a pattern across the whole
session and only when repeated. "Eleven of your fourteen colours today would
have fitted any stimulus" is coaching. A red X on colour three breaks the
drill while appearing to enforce it.

**Implementable test:** take the colour and try it against unrelated stimuli.
If it fits those too, it is generic.

### The Read

Captured and stored. **Not scored in v1.** It needs a per-stimulus key
authored by hand, which is content work that would block shipping.

## 5. What already exists

Most of this is built. The reuse map is the reason RRC is a small build.

### Completeness: the `press` world plus `activity-coach`

`src/features/activity-centre/worlds/press/` breaks a paragraph into a
numbered checklist and `supabase/functions/activity-coach/index.ts` accepts it
as `ideas: [{n, text}]`, returns `covered: [numbers]`, and the UI ticks what
survived and marks what was lost.

**RRC's per-detail matching is that mechanism pointed at a chunk instead of a
paragraph.** `BigIdea` in `worlds/press/press.ts` is already the shape a
detail needs.

**Carry the lesson in that file's header comment forward verbatim.** Coverage
was measured against the bank and cannot be computed from text: the median
overlap between an idea and its own credited answer is 0.25 and many are zero.
Any threshold either marks a correct answer as missing most of its ideas or
marks everything covered. **Coverage is the Coach's judgment, passed in. Never
compute it locally.**

**Own-words is the exception and is safe to compute locally.** It compares her
recall to the chunk itself, not to an analytic checklist, so the vocabulary
genuinely is shared and n-gram overlap means what it looks like it means. No
model call.

### Voice capture: `VoiceCoachModal`

`src/components/drill/VoiceCoachModal.tsx` already captures speech using the
browser Web Speech API, not `MediaRecorder` plus an upload. It handles the
permission probe, `continuous`/`interimResults`, the `no-speech` and
`audio-capture` error cases, and an auto-stop.

Three consequences:

- **Audio never leaves the browser**, so "transcribe and discard" is satisfied
  by construction. There is nothing to delete and no storage to build.
- **Transcription costs nothing.** There is no per-minute charge.
- **This corrects the early assumption that RRC needed an audio pipeline.**
  That work does not need doing.

Its 20 second auto-stop is tuned for a one-shot coach reply and is too short
for a cumulative round. RRC needs its own cap.

### Persistence: `activity_item_responses`

Append-only, one row per submit, owner-insert and admin-read RLS already in
place. RRC extends it rather than adding a parallel table.

## 6. Data model

### Content, per stimulus

Authored alongside the existing bank, in the Activity's `items[]`:

```
{
  order: 1,
  prompt: "<the full stimulus>",
  chunks: [
    {
      n: 1,
      text: "<the chunk, verbatim from the stimulus>",
      details: [ { n: 1, text: "..." }, { n: 2, text: "..." } ]
    }
  ],
  cumulative_after: [2, 4, 6]
}
```

**Chunking rule, settled and not a design fork:** default to one sentence.
Smaller is allowed, down to a comma or a third of a sentence. **Never combine
sentences.** Round down, not up: rounding up loses information. The one
exception is a chunk that is not yet a complete thought, which may take
slightly more.

**Details** are the conceptual units. Names, dates, numbers, lists, connectors
and adjectives each count as their own detail. This is deliberate: dropping
them is the diagnostic symptom the drill treats, and a completeness model that
lets them slide measures nothing.

### Results

Extend `activity_item_responses` with a nullable jsonb `rrc` column rather
than a new table:

```
rrc: {
  chunk_n: 1,
  stage: "recall" | "colour" | "read" | "cumulative",
  transcript: "...",
  covered: [1, 3],        // Coach's judgment, absent when unjudged
  total_details: 4,
  overlap: 0.18,          // computed locally
  fit: "kept" | "lost" | null,
  elapsed_ms: 14200
}
```

`covered` absent means nobody judged it. That must render as unjudged, never
as "nothing survived". This is the same distinction `readCovered` already
enforces in the edge function and the same one `FeedbackState`'s `"unchecked"`
exists for.

**The unit of record is the set, not the chunk.** A chunk score is transient
and hers. What persists for Joshua is the aggregate for the assigned set.

## 7. Coach contract

One call per recall. Reuse `activity-coach` with an RRC judging brief in
`instructions.coach`, exactly as every other Activity does.

The question asked of the model stays narrow: **"is detail 7 present in this
transcript, yes or no"**, per detail. Narrow questions are stable across runs
and the result is explainable, because she can be shown the exact detail she
dropped. An open-ended "grade this recall" is neither.

The brief must state:

- Judge by meaning. Her own words are **mandatory**, so her recall will never
  string-match. Equivalent phrasing carries the detail.
- **Order is free.** Reordering is encouraged and must never cost her anything.
- Casual, laughing, and out of order are all fine.
- A detail merely gestured at is not carried.
- Never mark down for style, length or phrasing.

`covered` drives details-kept. The model also returns whether the relationships
survived, which is the "how the pieces fit" criterion. Own-words is computed
locally and is not asked of the model.

**Colouring In makes no Coach call at all during the run.** One genericness
pass runs over all colours at session end.

## 8. Cumulative rounds

They ship in v1. They are the point.

Recall chunk 1, then 2, then **1+2 back to back with nothing on screen**, then
3, then **1+2+3**, and so on to the end of the stimulus, then across stimuli.

The load grows every round. This is the memory training, and it is precisely
what software can enforce and paper cannot, because the app simply never
re-shows the earlier text. **Without cumulative rounds RRC is a per-sentence
checker, which is the easy half of the problem.**

Completeness for a cumulative round scores against **the union of the detail
lists for every chunk covered so far.**

For LR, rounds run chunk by chunk inside a stimulus. For RC later, paragraph by
paragraph.

## 9. Session report

Shown only at the end. Nothing in this list appears during the run.

- **Details kept**, as a trend across the session, with the specific details
  dropped nameable.
- **Own words**, as a trend. Overlap going up is the regression to watch.
- **Genericness**, as a pattern across all colours, never per colour, and only
  when repeated.
- **Time**, against the drill's goal. 20 minutes, 30 accommodated, 25 as a
  stretch. Valid only if every chunk was recalled and coloured and the
  stimulus got a legitimate Read. Time without completeness does not count.

Everything shown to Joshua traces to stored per-detail matches, which is what
the platform's truthfulness rule requires.

## 10. Content pipeline

Stimuli come from the existing bank. LR first: short texts, fast rounds, and
the grading engine gets proven on small units before it is trusted on a whole
passage. No new content sourcing.

Chunking and detail extraction are the new data. They are generated, not
hand-authored, or the bank cannot grow.

**Calibration gate: Joshua reviews the first batch only.** He calibrates what
counts as a detail across the first handful of stimuli, and extraction runs
unreviewed once it reliably matches his judgment. This catches systematic
extraction errors without making every new stimulus an authoring job.

## 11. Out of scope for v1

- Scoring The Read. Needs a per-stimulus key.
- RC passages and paragraph-level rounds. After the grading is trustworthy.
- Any audio retention, playback, or upload.
- Micro-colours. Spontaneous reactions mid-read are allowed and simply not
  captured. They must never be accepted **in place of** the colour stage.
- Free browsing. RRC is assignment-gated like every other Activity.

## 12. Risks

**Speech recognition accuracy is the top risk, and it is not a cost risk.**
Web Speech is materially worse than a server model on exactly what
completeness weights hardest: names, dates, numbers and proper nouns. A
misheard number is scored as a dropped detail, and she is told she missed
something she actually said. That is worse than no feedback, because it
teaches her to distrust the instrument.

Mitigations, in order:

1. Joshua tests it himself first (this is why that gate exists).
2. Show her transcript beside the feedback, always, so a mis-hear is visible
   as a mis-hear rather than as a failure.
3. If accuracy proves unacceptable on numerics, the fallback is a server
   transcription path. It costs roughly seven cents per session, which is not
   a real constraint, but it reintroduces audio upload and therefore the
   retention question.

**Second risk: audio is discarded, so a disputed score has no appeal path**,
and the flatness that this whole method exists to fix is invisible to Joshua.
Anything to be learned from *how* she sounded has to be extracted at
transcription time or it is lost. Accepted deliberately; worth pairing with a
dispute queue if scores are ever contested.

**Third risk: browser support.** Web Speech is Chrome and Safari. The existing
component guards on `'webkitSpeechRecognition' in window`. RRC must fail
loudly and early with a supported-browser message, not silently offer a mic
that never captures.

## 13. Build order

1. **Content shape and one stimulus. DONE 2026-08-29.** PT135 S1 Q5, the
   freeway stimulus, chunked into three with detail lists. Authoring source is
   `~/ai-os/brainstorms/2026-08-29-read-recall-colour-bank.md`; the generated
   fixture is `src/features/activity-centre/content/read-recall-colour.json`,
   typed as `RecallItem` and pinned by `read-recall-colour.test.ts`. It is
   deliberately not in `SEED_ACTIVITIES`, which must stay the seven the seed
   migration inserts; RRC gets its own migration at step 3.
2. **The detail extractor. BUILT 2026-08-29**, at
   `~/ai-os/system/scripts/activity-centre/rrc_extract.py`, feeding the existing
   Activity Centre pipeline rather than running beside it. Chunking is
   deterministic, detail extraction is the model's, and three probes check every
   list it produces. Still open: running it over the first batch so Joshua
   calibrates. Gate: his judgment and the extractor agree.
3. **The RRC runner, NOT a world.** The world contract only replaces the left
   column while the typed answer box and Coach stay, and RRC has no typed
   answer and works a chunk rather than an item. Decided in
   `docs/adr/0009-read-recall-colour-is-a-runner-not-a-world.md`.
   - **DONE 2026-08-29, the logic:** `recall/session.ts` (round sequence, phase
     machine, cumulative scoring over the union of detail lists),
     `recall/overlap.ts` (own-words measurement) and `recall/speech.ts` (the
     gate that stops the microphone hearing the speaker, deterministic voice
     choice, the spoken prompts, the orb's pulse). 47 tests.
   - **DONE 2026-08-29, the surface:** `RecallStage` (11 tests, including that
     nothing readable renders during a recall), `RecallOrb` and `orb.ts` (the
     vendored scripts lazy-loaded from `public/orb/`), `useRecallSpeech` (the
     DOM wiring), `useRecallCoach` (the `ideas`/`covered` call), `recall.css`,
     the `rrc` column on `activity_item_responses`, and `ActivityRunner`
     dispatching on `item_format === "spoken-recall"`.
   - **Verified in a browser**, not only in tests: all eight orb scripts load
     from Vite's public directory, THREE reports r128, `UnrealBloomPass` and
     `EffectComposer` are present, the element registers, it renders a 640x640
     canvas through a composer, `setLevel` drives it from 0 to 0.71 and settles
     to 0.04 on silence, and it releases its context on teardown. No console
     errors.
   - **REMAINING:** an end-to-end run by a real student against a real
     assignment, which needs RRC seeded (deliberately not done yet, see below)
     and microphone permission.
4. **Own-words overlap**, computed locally.
5. **Colouring In**, capture-and-advance, no judgement, mandatory.
5b. **Spoken prompts.** `speechSynthesis` driving the orb, recognition gated on
   `onend` so the microphone never hears the app, and the on-screen fallback.
6. **Cumulative rounds.**
7. **The Read**, captured and stored, unscored.
8. **Session report**, including the genericness pass.
9. **Joshua runs it end to end** before any student is assigned it.

Steps 1 and 2 are content work and gate everything after them. Step 3 is where
the reuse pays: it is a new world over an existing checklist UI and an existing
Coach, not a new engine.
