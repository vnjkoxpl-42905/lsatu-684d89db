# Quiz Design Standard

> The official standard for LSAT U quizzes. Every quiz, in every bootcamp, is built to this document. Read it before authoring or building a quiz. It defines the rules, principles, structure, and behavior a quiz must follow. It does not define visual tokens (see Visual Design below).
>
> Status: v1, established 2026-06-13. Source: the discovery interview captured in `brainstorms/2026-06-13-quiz-design-standard.md`.

## 1. What a quiz is

A quiz is a structured comprehension check that follows a lesson. Its job is to test whether the student understood and retained what the lesson just taught, before they continue.

A quiz is more formal than a quick in-lesson pop quiz. It is structured and intentional, it is scored and reviewable, and it is focused on the comprehension of one lesson.

A quiz is for lesson reinforcement and concept reinforcement. It is not a progression gate, not spaced review, and not an end-of-module exam.

This standard governs quizzes only. It does not unify quizzes with drills, labs, or in-lesson pop quizzes. Those are separate surfaces with their own standards.

## 2. Core principles

The quiz must feel premium, calm, and LSAT U-native. It borrows its craft bar from the First Sentence vs Rebuttal quiz in the Intro to LR Bootcamp: a built surface with real identity, real in-the-moment coaching, and a review that teaches.

Honesty governs everything measured. The recorded score reflects the student's first answer only, and it is never inflated. There are no fake analytics, no fabricated trends, no mastery theater. Where there is nothing to show, the quiz says so plainly.

The quiz teaches, it does not just mark. A wrong answer is met with a hint and a correction, and the review names the transferable takeaway, not just the answer key.

The quiz measures after teaching, never gates before it. A low score changes what the quiz surfaces next. It never blocks the student from continuing.

All student-facing copy (question stems, options, feedback, verdict) is routed through the warm-coach teaching voice before shipping. The product says "the argument," not "the stimulus." No spec jargon reaches the student. The tone stays calm and direct, and struggle is normalized.

## 3. Structure and length

A quiz usually runs about 8 to 15 questions. It is shorter only when the lesson is very narrow, and longer only when the lesson carries several important concepts. It stays focused and does not become a full drill or exam.

There is usually one quiz per lesson, and the quiz is titled after that lesson's specific topic. Bootcamps often contain several lessons, so a quiz carries its lesson's topic name (for example, a Main Conclusion lesson is followed by a Main Conclusion quiz), never a generic "Lesson Quiz."

Question order is fixed and authored. There is no randomization by default. The order is an intentional difficulty ramp: it starts easier, moves progressively harder, and the final question or questions are distinctly the hardest.

## 4. Question formats and authoring rules

The atomic unit is flexible. The format fits the concept the question is checking, and it is not locked to one type.

The canonical per-question pattern is: the student sees a prompt, question, or compact stimulus, chooses from a closed set of options, there is one correct answer, the student gets immediate right or wrong feedback after choosing, and an explanation follows either immediately or in the review.

Multiple choice is the most common format, but the standard is not multiple-choice-only. Allowed formats include multiple choice, classify or sort, select-the-part, matching, and any other closed-response format that best tests the lesson. Free-text and open-response are excluded as a standard format, because they are harder to score cleanly and make the quiz feel less instant.

There is no fixed option count. A question may have two options, three, four, or more, depending on what it is testing.

Stimulus length fits the concept. A quiz may use a longer or full stimulus when the concept requires it. There is no artificial length cap.

Authoring quality rules, required before a quiz ships:

- Every question tests something the lesson actually taught. No out-of-scope trivia, no gotchas outside the lesson's claims.
- Distractors are diagnostic, not filler. Each wrong option embodies a specific, predictable misunderstanding a student might hold after this lesson, so that a miss is informative. No throwaway or absurd options.
- The difficulty ramp is authored deliberately: recognition and recall early, discrimination between close cases in the middle, hardest application or synthesis at the end.
- Explanations carry the teaching. The inline explanation is brief (why the right answer is right, and when useful, why the tempting wrong answer pulls). The review explanation is fuller and names the transferable takeaway.

No question is reused across quizzes. Each item is authored once and lives in exactly one place.

Images and diagrams in stems are allowed when the concept needs one. Text is the default.

## 5. Per-question flow

One question is on screen at a time. It is not a scrollable list.

The student chooses an option and immediately sees whether it was right or wrong. Answers do not lock.

On a wrong first answer, the quiz withholds which option is correct. It gives a hint and a correction that name the misunderstanding without naming the right answer, and it lets the student reattempt. Reattempting is genuine re-thinking, not a free point. After a couple of wrong reattempts on the same question, the quiz surfaces a "Show the answer" option so a stuck student is never trapped. Taking it reveals the explanation and lets them move on.

The recorded score always reflects the first answer only. Reattempting and self-correcting never improves the score, and a self-corrected miss still counts as a miss in the review and the record.

Explanations are two-tier. Immediately after the question is resolved, the student gets brief, useful inline feedback. The full, revisitable explanation appears again on the review screen at the end.

Navigation uses Previous and Next, and it is not gated. The student can move backward and forward, skip ahead, leave questions unanswered, and return to them.

The student can pause mid-quiz and resume mid-quiz. On return, the quiz restores the exact question and state the student left.

A count-up stopwatch runs during the quiz. It starts at zero and is shown discreetly in the header. There is no time limit, no auto-submit, and no penalty. Pausing the quiz pauses the timer, so the recorded time reflects real working time. The elapsed time is recorded with the attempt, shown on the review screen, and visible to Joshua.

### Question screen anatomy

Every quiz question screen contains, in order: a top bar (the quiz identity label and an unobtrusive exit, plus an autosave indicator when progress persists); a progress header (a position counter such as "Question 4 / 13", a thin progress bar, and the count-up timer; a running "k right" count is optional and may be hidden to reduce test anxiety); the prompt or stimulus; the options (the closed set, with resting, selected, and right or wrong states); the inline feedback block (gated to appear only after the question is answered); and a footer with the advance control ("Next", or "See results" on the last question).

## 6. Scoring and verdict

The score is shown clearly at the end as a count and a percent, for example "11 / 13 · 85%". It is truthful and based on the first answer only.

There is a soft threshold of about 80 percent. It is used only to shape the tone of the verdict. It is never a hard pass or fail gate, and it never blocks progression.

There are no letter grades and no harsh language. The word "failed" does not appear.

Verdict copy is specific to quizzes. It borrows its structure from the drill verdict but uses its own words. A strong result reads like "Solid read." A lower result reads like "Worth another pass." The next action reads like "Review the misses before continuing." The score stays honest while the framing stays instructional and calm.

A low score never prevents the student from continuing. It changes what the quiz surfaces next: review the misses, revisit the weak concepts, then continue when ready.

## 7. Review screen

The review screen opens with a verdict block: the quiz-specific verdict line, the score as a count and percent, the elapsed time, and a clear next action.

It then leads with the missed questions, expanded first. Each missed item shows the question, what the student picked, the correct answer, and the full explanation.

Below the misses sits a full answer-key grid. It shows every question, marks correct and missed clearly, and lets the student jump to any item's explanation. Misses come first, but every question stays revisitable.

A lightweight concept rollup is used only when the quiz naturally spans clear sub-concepts, as a simple label such as "Necessary vs sufficient: 2 missed", and only when it is actually useful. There are no charts and no mastery percentages.

Retake is available from the review screen but is not emphasized over review. The default next actions are "Review the misses" or "Continue." A retake uses the same authored question order and the same authored option order, with no reshuffle, because the sequence is intentional. The first-attempt score is preserved honestly. A retake can be recorded separately, but it never erases the first attempt.

## 8. Placement and completion

The quiz is the lesson's closing step. It launches at the end of the lesson through a clear call to action, and it is surfaced as the computed next step once the student has worked through the lesson.

The quiz is available, not hard-locked. It is positioned after the lesson but does not require full lesson completion to open.

"Complete" means attempted and finished, not passed. Finishing the quiz advances the computed next step regardless of score. The quiz never marks lesson mastery, and there is no score-gated completion badge. Finishing is always enough.

A finished quiz is always revisitable in review mode from the lesson or module hub, and it can be retaken from there.

## 9. Data and admin visibility

Each attempt records, per question, the student's first answer and whether it was correct, along with the first-attempt score and the completion state. Retakes are stored separately so the first attempt is never overwritten. This is enough to power resume, the review screen, and later revisits. The exact storage schema is an implementation detail and is decided when that work is scoped.

Joshua, as admin, can see real per-student quiz results: which lesson, the first-attempt score, the elapsed time, and which questions and concepts were missed. This exists to inform coaching. Only real data is shown, with honest empty states when a student has not taken a quiz, and no fabricated trends.

The student sees their own attempt and review. Nothing pretends to be richer analytics than what exists.

Quizzes are self-contained. They are not wired into the Wrong Answer Journal in this standard.

## 10. States and edge cases

Every quiz handles these states:

- No quiz available for a lesson: do not show a dead call to action. The lesson simply ends without one.
- Loading: a quiet skeleton, with no blank spinner screen and no layout jank.
- Save or load error: never lose answers. Hold state and retry on a save failure, and offer a clear retry on a load failure. Never leave a dead end.
- Pause and resume: return the student to the exact question and state they left, through a clear "Resume" entry, never a silent restart.
- Perfect score: a calm, premium verdict. No confetti, no XP, no trophies.
- Zero or low score: a warm, instructional verdict that points to the misses and never punishes.

Audio feedback may be used for right and wrong answers, and wherever else it is applicable. It stays restrained and premium, consistent with the calm bar. It is never arcade-like.

## 11. Visual design

Refer to `DESIGN.md` for quiz visual design.

## 12. Out of scope for this version

Accessibility (WCAG) and mobile responsiveness are not a focus of this version of the standard. They are deferred, not abandoned. The app-wide floor in `PRODUCT.md` still applies, and these are layered in later.
