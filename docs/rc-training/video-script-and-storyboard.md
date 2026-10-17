# RC Training videos: script, storyboard and walkthrough shot list

Status: **preparation only.** Nothing here has been rendered, recorded, uploaded or paid
for, and no placeholder should be shown to students as a finished video. The app walkthrough
(Part B) must wait for verified working controls and backend acceptance.

## What stays disabled

The existing combined film `how-and-why-to-do-rc-recall` mixes the Decaf and Cappuccino
lessons, keeps old labels, and its manifest is unverified. It remains disabled: the app has
no "Watch Instructions" control, and `RcRecallPage.test.tsx` asserts that even
`VITE_RC_RECALL_INSTRUCTIONS_VERIFIED=true` does not expose it. The source recordings show
the instructor, not passage text, so they are not used as the new lesson either. Source
media is never edited.

## Source map

| Teaching point | Source | Where it appears below |
|---|---|---|
| Read, translate and quip a whole paragraph "just like LR" | Cappuccino notes, steps 1 and 4 | Scenes 2, 5 |
| Look away and recall the full translation of that paragraph silently | steps 2 and 5 | Scenes 3, 5 |
| Confirm with the text; not rereading from scratch; confirming the translation you already have | step 3 and its sub-points | Scene 4 |
| Paragraph 2 confirmation covers all text read so far | step 6 | Scene 6 |
| Optional whole-passage recall, at first and periodically | step 8 | Scene 7 |
| Untimed practice, optional elapsed display | Joshua's adaptation; the source's 6 minute figure is a progression benchmark, not a cutoff | Walkthrough B2 and B6 |

Out of scope on purpose: sentence-by-sentence hidden recall, mandatory cumulative hidden
retelling, grading, and the separate 35 minute variant. Recall is self-checked.

Primary sources (read only):
`Loophole Lecture/Day Six/How and Why to Do Cappuccino RC Translation/ellens-notes.txt` and
`corpus/loophole-online/workouts/cappuccino-rc-translation-drill/README.md`.

## Part A: conceptual lesson (about 2 minutes 30 seconds)

Original two-paragraph passage. It matches the in-app demonstration so the lesson and the
product teach the same example.

> **Paragraph 1.** A museum moved its evening lectures from Fridays to Wednesdays.
> Attendance rose by a third, but the director warned that the schedule change may not be
> the cause.
>
> **Paragraph 2.** In the same month, the museum made the lectures free for students. To
> separate the effects of price and schedule, the director proposed keeping admission free
> while moving the lectures back to Fridays.

Voice: Joshua's, plain and direct, short sentences, no filler. No em dashes in on-screen text
or captions. Narration is marked **[instructor model]** wherever it shows how a good student
thinks, so it is never mistaken for a learner answer to copy.

| # | Time | Teaching point | On screen | Narration (draft) |
|---|---|---|---|---|
| 1 | 0:00 to 0:25 | Why hide the text | Paragraph 1 on a page. A hand-drawn "I get it" tick appears. Text fades to blank lines. A question mark replaces the tick. | "A paragraph can feel familiar while you are looking at it. That feeling is not the same as being able to explain it. Hide the page and you find out what you can actually say." |
| 2 | 0:25 to 0:55 | Read for meaning | Whole of paragraph 1 visible. Soft highlights link claim, number and caution: "rose by a third", "may not be the cause". A margin note: "Hmm. Why hedge?" | "Read the whole paragraph. Put each idea in your own words and react briefly. **[instructor model]** 'Attendance rose by a third. Good. But the director is hedging. Could something else explain the increase?'" |
| 3 | 0:55 to 1:15 | Recall paragraph 1 | Text hidden. Label: "Instructor example, not an answer to copy". Caption shows the example recall with a slip: "Lectures moved to Wednesdays and attendance went up a third, so the schedule worked." | "Now the text is hidden. I retell it in my head. **[instructor model]** Here is a recall with a slip, on purpose." |
| 4 | 1:15 to 1:45 | Check and repair | Paragraph 1 reappears. "may not be the cause" is highlighted. The slip is crossed out and the repaired line replaces it. | "Now I check what I remember against the text. I am not rereading from scratch. I find it: 'may not be the cause'. My recall said the schedule worked. That is a different claim. Repair it: 'The museum moved its evening lectures from Fridays to Wednesdays. Attendance rose by a third, but the director warned that the schedule change might not explain the increase.'" |
| 5 | 1:45 to 2:05 | Read and recall paragraph 2 alone | Paragraph 2 only. Then hidden. Label: "Recall paragraph 2 only". | "Same routine, next paragraph. In that same month, lectures became free for students. To separate price from schedule, the director proposes keeping admission free and moving back to Fridays. I recall paragraph 2 alone, including that purpose." |
| 6 | 2:05 to 2:20 | Confirm both paragraphs | Both paragraphs visible, side by side. A line links "may not be the cause" to "price and schedule". | "Now I check everything I have read so far. Paragraph 2 explains the caution in paragraph 1. Price is the competing explanation." |
| 7 | 2:20 to 2:30 | Optional final recall | Both paragraphs hidden. Two quiet choices: "Recall the whole passage" and "Continue". | "At the end of a passage you can recall the whole thing, silently or out loud. It is optional. Do it while you are learning the method and now and then afterward." |

Captions: written to match the narration word for word, reviewed at every cut. Transcript
published beside the video. No audio-only information: every highlight and label described in
the narration is also in the caption or transcript.

Production order (unchanged from the audit): source map, script, storyboard, visual design,
narration and captions, frame and teaching review, approved render, playback and
accessibility verification. Review captions at edit boundaries and text legibility at narrow
player sizes. Preserve provenance for any derivative asset. A teaching review must check
that no scene gives a model answer while claiming to test retrieval.

### Player and fallback

If the existing `ExamplePlayer` is used, it already provides captions, an MP3 audio download
and a transcript link. This change adds a playback-failure state: if the video errors, the
player says so and points to the audio and transcript, which carry the same lesson. Keyboard
playback relies on the browser's native controls. The video must not autoplay.

## Part B: verified app walkthrough (about 90 seconds)

**Blocked until** (1) the attempts backend is deployed and accepted per
`deployment-checklist.md`, steps 1 to 6; (2) the controls below are verified in the running
app at 1440 and 390 widths. Capture the real app only; do not mock controls.

Shot list:

| # | Shot | What to show | Verify first |
|---|---|---|---|
| B1 | Entry | RC Training page: purpose line, one **Start a section** action, **Instructions** and **Your attempts** links, and the inline method demonstration | Links land on, and focus, their headings |
| B2 | Pick a section | PrepTest and Section selectors; "Show elapsed time" checkbox; passage-pair check option | Start stays off if saving is unavailable |
| B3 | Read | Passage 1 of 4, Paragraph 1 of N, step "Read", one button: **Hide the text and recall paragraph 1** | Step list matches |
| B4 | Hide and recall | Text hidden, silent recall already in progress, one button: **Check my recall** | No separate start click |
| B5 | Check | Text returns, all text read so far, one button: **Next paragraph** | Scope matches the chosen option |
| B6 | Elapsed time | Passage time resets at a new passage, section time continues | Pause on leave and restore on resume |
| B7 | Optional passage recall | Silent by default; **Out loud** adds an explicit **Start recording** and **Stop recording** | Recording indicator visible |
| B8 | Finish | Completion panel with total time and recording status | Real server readback |
| B9 | Saved work | **Your attempts**: status, duration, recalls, playback only for a saved recording, **Show earlier attempts** | Real data, not fixtures |
| B10 | Leave and resume | **Save my place and leave**, then **Resume this section** on the same device | States "this device only" |

Narration for Part B states only what the verified app does. Anything that failed
verification is cut from the video, not described as working.

## Acceptance for the videos (when they are made)

- A new student can say why hiding helps, what the sequence is, and what to do after finding
  an omission.
- The omission and its correction are visible and spoken.
- Paragraph 2's hidden recall is about paragraph 2 alone, and its confirmation covers both.
- The final recall is shown as optional.
- Captions, transcript and keyboard playback verified; failure fallback verified.
- Nothing is uploaded or published without a separate decision.
