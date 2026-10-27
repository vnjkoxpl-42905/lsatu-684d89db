# Lesson 3.1 Claude review log

## 2026-10-27: review-only session

- Host/coordinator and original builder: Codex. Independent reviewer/inspector: Claude Code.
- CLI: C:/Users/Joshu/.local/bin/claude.exe, verified version 2.1.309.
- Requested model/effort: CLI configuration default; no explicit override supplied by Joshua. Observed identity will be recorded from runner results when available.
- Plan: docs/implementation-plans/2026-10-27-unless-strikethrough-notation.md.
- Limits: at most five completed plan reviews and two fresh code inspections. No inspection opt-out.
- Authorization: review only; existing local/uncommitted restriction persists. No code edits, commits, pushes, publication or paid narration calls authorized by this invocation.
- Preparation: replaced stale proposal text in the plan with the final already-implemented contract, preserving approved short labels and documenting evidence limitations.
- Baseline: HEAD 6a167c8555b4a404334310aad48a5d748b1b0861. Existing unrelated local changes remain outside scope; this HEAD is not claimed as a pristine pre-session snapshot.

## Plan review round 1

Result: C:/Users/Joshu/AppData/Local/Temp/claudex-unless-review-20261027/plan-r1/claudex-cb9dofdi/result.json
Observed model: claude-opus-5-5. Verdict: REVISE. Plan SHA256: 235944c2e38486f5a99bef8a6ff49d62068501ae539f236309bd16efbbd2606a.

Full response:

{
  "verdict": "REVISE",
  "summary": "The lesson 3.1 page is correct on the logic and matches the contract. No slash-letter notation remains in UnlessLesson.tsx. Every negated Idea gets the ink line-through and a hidden \"not \". Formula images have complete English names. The translations, the unsupported conclusions, the existing-negative handling, until's timing and the requirement-versus-single-event contrast are all correct. The question-reset focus behaviour is correct, and the routing touches only exception-language. One material problem is in the film's store scene: the crossed-out word Opens is shown before its sentence appears, and the film never defines Opens or Arrives. This breaks the plan's rule that short names are defined as complete statements before use. The remaining findings are minor: CSS that isn't scoped behind fc-unless, a weak notation test, and an uneven line-wrap.",
  "findings": [
    {
      "id": "F1-film-undefined-short-names",
      "severity": "medium",
      "path": "C:/Users/Joshu/dev/ai-os-projects/conditional-full-course-video-20261025/scenes/exception-language.scenes.js",
      "evidence": "Lines 76-85. The crossed-out Opens chip `neg` pops in at T(\"negative\", 0, 0.2), while narration is saying \"Sometimes an idea already contains not.\" The defining sentence `ss` only fades in at T(\"negative\", 1, 0.0). So for one whole narration sentence a crossed-out short word sits on screen with no referent. The scene also has no key for Opens or Arrives, unlike the pick scene, which shows 'Played = the game is played · Rains = it rains' (line 44). The contact-sheet frame at 62s confirms there is no key under the store sentence. This conflicts with the plan's method rule: 'Define short names as complete statements before use.'",
      "fix": "Fade in `ss` at the start of the negative scene, before or together with `neg`, and add a key label such as 'Opens = the store opens · Arrives = the manager arrives' styled like the pick-scene key. Then re-run the compose-only prepare and render, re-hash the MP4 and poster, and re-inspect the frames for that scene."
    },
    {
      "id": "F2-css-scope",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/full-course.css",
      "evidence": "Lines 30-74 and 92-93 use unscoped `.fc-u-*` selectors, including the `@media(max-width:620px)` stacking rule on line 74, which repeats the scoped `@container` rule on line 107. Plan item 9 says polish 'stays scoped behind fc-unless'. The `fc-u-` prefix currently keeps these rules from leaking into other lessons, but the media query is a viewport rule, not the content-width rule the plan describes, and it duplicates line 107.",
      "fix": "Prefix the lesson rules with `.fc-unless` and delete the viewport media query on line 74. Stacking will then rely only on the container query at line 107."
    },
    {
      "id": "F3-weak-notation-test",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/FullCourseLesson.test.tsx",
      "evidence": "Line 35 rejects only `/[RGMOTAI]\\b`. Reintroduced slash notation built from the current words' initials, such as `/P` (Played) or `/C` (Complete), or any lowercase variant, would pass. The test also never checks the formula labels or any table cells.",
      "fix": "Use a broader assertion such as `expect(container.textContent).not.toMatch(/\\/[A-Za-z]\\b/)`, or explicitly assert that no `/` appears before a letter in the article text."
    },
    {
      "id": "F4-english-wrap-asymmetry",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/full-course.css",
      "evidence": "`.fc-lesson .fc-u-english{max-width:32ch}` (line 59). In unless-words-desktop.png the left path wraps to an orphaned 'played.' while the right path fits on one line, so the side-by-side readbacks don't line up. This works against the plan's alignment polish goal.",
      "fix": "Drop or widen the 32ch cap inside `.fc-u-path`, for example `max-width:none`, since the grid column already limits the line length."
    }
  ],
  "coverage": [
    "Read UnlessLesson.tsx in full (all sections, Question/Idea/Formula/EitherIdea components, reset/focus, aria-pressed, aria-live).",
    "Read every fc-u/fc-unless rule in full-course.css (lines 29-108): strike styling, sr-only text, focus/hover/selected states, 44-48px targets, container and media stacking, reduced motion, 16:9 film, no quiz arrival animation.",
    "Read FullCourseLesson.test.tsx in full and the FullCourseLesson.tsx routing and LessonFilm wiring; confirmed only exception-language goes to UnlessLesson.",
    "Read the exception-language entries in fullCourseContent.ts, fullCourseMedia.ts (transcript) and the matching lines in fullCourseItems.ts.",
    "Checked the lesson 2.2 = OR cross-reference against openingCoursePath.ts.",
    "Read the full film scene source exception-language.scenes.js.",
    "Image reading succeeded for review-contact-sheet.jpg (8 frames), unless-words-desktop.png and unless-words-phone.png.",
    "Confirmed public/media exception-language.mp4, .jpg and .vtt exist."
  ],
  "limitations": [
    "I couldn't run tests, typecheck, build, render or hashing, so the claims of 620/620, 27/27, typecheck, build, MP4 SHA256 and duration remain unverified host evidence.",
    "I didn't read the VTT file or the evidence report markdown. I only checked that the narration and transcript contain no letters or slashes, using the fullCourseMedia transcript.",
    "I didn't read the teaching-voice, wiki or COPY-CORRECTIONS source documents, so fidelity to them is judged only against the plan's stated method.",
    "No live rendering: overflow at tablet and docked widths, hover/focus rendering, reduced-motion behaviour, screen-reader output and continuous film/audio playback were not observed. I saw only the two screenshots and eight contact-sheet frames.",
    "The quiz items (fullCourseQuiz exception-language) were not read in full. Only the feedback strings in fullCourseItems.ts were seen."
  ]
}

### Host dispositions before further review

- F1 accepted, medium: source confirms neg appears at narration sentence 0, defining sentence at sentence 1, and no store key exists. Requires a film-source change and rerender. Not implemented because this invocation is review only. The plan already requires labels before use; do not weaken it to obtain approval.
- F2 partially accepted, low: duplicated viewport/container stacking is maintenance debt. The fc-u prefix is unique to this lesson, so no current cross-lesson leakage has been demonstrated. Do not present the absence of a parent prefix alone as a functional bug.
- F3 accepted, low: broaden the regression guard to any slash-letter token. The article text assertion already includes table-cell text and labels rendered as text, so the review's claim that no table text is checked is overstated. Formula aria-labels are only partly checked by targeted existing assertions.
- F4 accepted as a low-priority polish suggestion: the 32ch cap leaves a final-word line in the supplied desktop screenshot; widening it should be checked at the same widths before adoption. Minimum-height alignment exists, so this is not a broken interaction.

No implementation changes made. Review rounds stop rather than re-requesting approval of unchanged code. A separate fresh scoped final-code inspection follows because plan approval and final-code inspection are distinct; neither a REVISE verdict nor the prior host tests constitutes approval.

External evidence hashes before inspection: film scene source 0dc005e78d4573301cbdb77945169d7b504f7c233847f851f1056170a85314b7; contact sheet d18b5b3186fdf50e39f5fdb7aac035ad184be3aed0e900b2f39e4106fe1a7f3d; app MP4 931dbe3bb9a8381b6e788065194fe2b1c0879e0c8e90f930ab6d29a6611e56e9. The external video project is not part of the app Git fingerprint; these before/after hashes supplement its coverage only for these files.

## Fresh final-code inspection 1

Result: C:/Users/Joshu/AppData/Local/Temp/claudex-unless-review-20261027/inspect-r1/claudex-fte33zh0/result.json
Observed model: claude-sonnet-5-5. Verdict: APPROVED with two low findings. Snapshot SHA256: 0cbd39325bb803cb97c77943c9688d0834c19fa42af0c4cbe5550db4cae2237e. Plan hash unchanged.

Full response:

{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the inspected scope. UnlessLesson.tsx matches the plan's contract: the Idea component, formula accessible names, paired paths with aria-pressed and check marks, response-specific feedback, and reset focus. The logic is sound for every worked example I traced: unless, the existing negative, without and until. The unsupported conclusions are correctly labelled as unsupported. Slash-letter notation does not appear in fullCourseContent.ts or fullCourseItems.ts, the VTT and transcript are unchanged and consistent, and the film scene source and contact sheet show horizontal strikes only on the negated words. Two low-severity polish gaps are listed below. I could not play the MP4 and did not render the page or run any tests.",
  "findings": [
    {
      "id": "F1",
      "severity": "low",
      "path": "C:/Users/Joshu/dev/ai-os-projects/conditional-full-course-video-20261025/scenes/exception-language.scenes.js",
      "evidence": "The plan says short names should be defined before use. In the film, the Played and Rains chips first appear in the 'sentence' scene (lines 34-36), but the 'Played = the game is played · Rains = it rains' key only appears in the later 'pick' scene (line 44). The store scene (lines 76-85) uses Opens and Arrives with no key at all. It relies on the sentence shown above and on the narration. In the page these are defined before use, so the film is less strict than the page.",
      "fix": "Optional: add a one-line key under the chips in the sentence scene, and a small 'Opens = the store opens · Arrives = the manager arrives' key in the negative scene. This would need a re-render, so it is outside this review's authorization."
    },
    {
      "id": "F2",
      "severity": "low",
      "path": "src/bootcamps/conditionals/components/FullCourseLesson.test.tsx",
      "evidence": "The slash check at line 35 (/\\/[RGMOTAI]\\b/) only scans the rendered lesson container text. It does not scan fullCourseContent.ts, fullCourseItems.ts or the media transcript. My grep found none of these in the content files, so there is no current defect. The guard does not protect those sources from a later regression. The plan's acceptance criterion says no slash notation on lesson 3.1 or its film frames.",
      "fix": "Optionally extend the test to assert that the lesson content, quiz and transcript strings for exception-language contain no slash-letter or tilde-letter notation."
    }
  ],
  "coverage": [
    "Read UnlessLesson.tsx in full and traced each worked example for logic: unless, existing negative, without, until, the comparison proposals and the leaves-open table.",
    "Read FullCourseLesson.tsx routing and the LessonFilm wrapper.",
    "Read the full-course.css fc-unless block and checked that its custom properties are defined at line 1. Checked responsive handling (viewport media query plus container query), focus, hover and selected states, and reduced motion.",
    "Read FullCourseLesson.test.tsx lines 20-69.",
    "Read the exception-language lesson entry in fullCourseContent.ts, the fullCourseMedia.ts entry, and the VTT in full. Grepped fullCourseContent.ts and fullCourseItems.ts for slash or tilde notation (none) and for exception-language references.",
    "Read the film scene source exception-language.scenes.js in full.",
    "Viewed unless-words-desktop.png, unless-words-phone.png and review-contact-sheet.jpg. All three images were read successfully.",
    "Read the evidence report 2026-10-27-unless-word-notation.md."
  ],
  "limitations": [
    "I did not run tests, typecheck, build or the preview. The 620/620 and 27/27 results are the host's reported evidence, and I did not verify them.",
    "I did not play the MP4 or listen to audio. I did not verify the MP4, JPG or VTT hashes or probe the duration. Film judgments rest on the scene source, the VTT and the contact-sheet frames at 8 timestamps.",
    "The CSS was reviewed statically. I did not render at the listed widths. I checked overflow, spacing and alignment only against the two screenshots and the report's measurements.",
    "I did not read fullCourseItems.ts quiz and practice entries beyond targeted greps, and I did not check the quiz grading or persistence in FullCourseDrill.",
    "I did not review other callers of fullCourseMedia.ts, other lessons, or the wider checkout's unrelated staged and unstaged changes, which are out of scope.",
    "I did not check real screen-reader output, physical-device behavior or production."
  ]
}

### Final host arbitration

The two fresh Claude calls used their configured defaults and reported different observed models: Opus 5.5 for plan review, Sonnet 5.5 for final inspection. No model was selected or switched by the host and no fallback was requested. Plan review is REVISE; scoped final inspection is APPROVED with low findings. These verdicts are preserved separately, not merged into an invented unanimous approval.

Both passes identify film short labels appearing without prior explicit definitions. The first review additionally identifies the precise store timing defect: the crossed-out Opens chip precedes the sentence that explains its referent. The final inspector downgrades this to optional without addressing that timing. Host retains the first pass's medium finding as a warranted teaching-consistency correction. The existing plan is not independently approved and the combined deliverable should not be called fully approved.

Final-inspection F1: accepted factual observation; retain the stricter medium disposition from the first pass. Define Played/Rains in the sentence scene too, and Opens/Arrives before the store tokens. No film edits or rerender in this review-only invocation.
Final-inspection F2: accepted as optional regression coverage, alongside the first pass's narrower slash-pattern finding. Source strings and film frames need distinct checks; a string assertion cannot prove rendered film notation.

Minor first-pass points retained: widen the 32ch English readback cap after visual verification, and optionally consolidate duplicate viewport/container CSS. No current cross-lesson leak demonstrated.

Coverage: one completed plan-review round and one fresh scoped code inspection. Images read successfully by both. Reviewers did not run tests or a browser, play the film/audio, test real assistive technology, or fully inspect quiz grading/persistence. Earlier host test/build/browser evidence remains separate. Full responses above contain each pass's actual coverage and limitations.

No application code, CSS, tests, media or publication state was changed in this review turn. Only the stale plan was reconciled and this review log created. The implementation stays local and uncommitted. Required correction and minor suggestions remain outstanding.

Post-inspection hash readback: film scene source, contact sheet and app MP4 all exactly match their pre-inspection SHA256 values recorded above. External evidence remained unchanged during both review passes.

