# Lesson 3.1: crossed-out short words for negation

## Goal and authorization

Joshua approved replacing slash-letter notation on lesson 3.1 and its film with short words such as Rains crossed out. He also approved reviewing the entire lesson for teaching consistency and refining typography, spacing, alignment, borders and interaction states. All work must stay local and uncommitted. Implementation is already present. This document records the final contract for independent review; its earlier proposal for Rain/Game letter replacements and brass strikes is superseded.

This review invocation authorizes review and plan clarification, not additional implementation. Do not commit, push, publish, call paid narration providers, edit other lessons or widen into a course redesign.

## Approved method and teaching boundaries

Find the two complete ideas. Choose either one, negate it, and make it sufficient (the if side). Keep the other exactly as stated. If the chosen idea already contains a negative, negating it produces the positive. Define short names as complete statements before use and preserve full English readbacks. Explain what the rule leaves open as well as what it guarantees. Preserve until's timing and the distinction between a conditional requirement and a report of one event.

Source authority: user instructions in this session, ai-os/wiki/teaching-voice.md, ai-os/references/lsat-teaching-voice-standard.md, and the lesson 3.1 entry in ai-os/wiki/COPY-CORRECTIONS.md. These are local teaching sources, not evidence of production deployment.

## Final implementation contract

1. Page: src/bootcamps/conditionals/components/UnlessLesson.tsx. It remains the dedicated exception-language lesson routed by FullCourseLesson.tsx. Every other lesson retains its existing route/template.
2. One Idea component renders short words. Positive words are plain; negative words have a visible line-through in current ink for contrast. Hidden inline text announces not. Formula images have complete English accessible names and hide duplicate visual children from assistive technology.
3. Labels: Played = the game is played; Rains = it rains. Store: Opens = the store opens; Arrives = the manager arrives. Admission: Admitted = the visitor is admitted; Ticket = the visitor has a ticket. Lab: Opens = the lab opens; Complete = the inspection is complete. Meaning is local to each explicitly defined example.
4. Both paths stay visible side by side where space permits. Buttons choose which complete idea is underlined in the source sentence and which explanation is announced. Both translations remain correct regardless of selection. Selected state includes a check mark and aria-pressed. Buttons have at least 44px targets and visible keyboard focus, hover and selected states.
5. Replace all slash-letter notation across the page, including questions, table cells, comparison formulas, store, without and until. Crossed-out Played -> Rains and crossed-out Rains -> Played express the same rule. Rains -> crossed-out Played and Played -> crossed-out Rains remain explicitly unsupported conclusions.
6. Existing negative: crossed-out Arrives -> crossed-out Opens; Opens -> Arrives. Admission: Admitted -> Ticket; crossed-out Ticket -> crossed-out Admitted. Lab: Opens -> Complete by then; not Complete yet -> not Opens yet. Completion alone does not guarantee immediate opening.
7. The hero retains If not ... then ... as a method reminder, but explicitly explains removing an existing negative. It must not claim every resulting diagram literally contains not.
8. Meaning precedes notation. First meaning/negation questions give response-specific repair hints for wrong answers and explanations for correct answers. Reset clears feedback and returns focus to the first choice. Existing four-question quiz uses complete English; preserve its grading, persistence and hint/reveal behavior.
9. Polish stays scoped behind fc-unless: formula type and alignment, readable prose measure, table/readback spacing, hairline comparison borders, responsive stacking by content width, native 16:9 video at phone widths, reduced-motion support, no decorative quiz arrival animation. Preserve the existing authored lesson visual direction.
10. Film source: C:/Users/Joshu/dev/ai-os-projects/conditional-full-course-video-20261025/scenes/exception-language.scenes.js. Uses Rains, Played, Opens, Arrives and horizontal strikes. Complete English readbacks preserve meaning. Narration and VTT remain unchanged because no spoken letters/slashes occur. Caption about cancellation states what THIS RULE does not say. Opening title is visible at zero and kicker is 28px.
11. Film media is copied to public/media/conditionals/full-course/exception-language.mp4, .jpg and .vtt; fullCourseMedia.ts is regenerated. Film remains between 60 and 90 seconds. No provider narration calls or changes to unrelated media.

## Acceptance and proof

- No slash-letter notation on lesson 3.1 or its film scenes/frames. Each negative word is visibly struck; every positive equivalent is unstruck. Exact inline spoken negation and complete formula names are accessible.
- Definitions, diagrams, prose, questions, hints, reveals, transcript and film agree with the method and logical limits.
- No horizontal document or formula overflow at phone, tablet, desktop and docked/narrow content widths. Inspect typography, spacing, alignment, borders, selected/hover/focus states and reduced motion in the rendered page.
- Run npx vitest run src/bootcamps/conditionals --testTimeout=60000 --maxWorkers=1 --fileParallelism=false. Expected current count 620. Run affected tests after fixes, npm run typecheck, and npm run build.
- After Vite/Vitest, restore only the known generated stub supabase/functions/mcp/index.ts to HEAD, provided it had no pre-existing edits. This was verified and done for the completed implementation.
- Film: prepare.py --compose-only --slug exception-language, then render.py --slug exception-language, using ../contrapositive-video/.venv/Scripts/python.exe from the video workspace. Do not run full narration prepare. Verify rendered/app MP4, poster and VTT hashes, probe dimensions/duration/audio, and inspect actual rendered frames spanning all six scenes.

## Existing evidence and review scope

Local preview: http://127.0.0.1:8099/dev/conditional-opening-preview?page=exception-language&edition=full-conditionals-v3

Evidence report: docs/design-evidence/conditional-full-20261025/2026-10-27-unless-word-notation.md. Screenshots: unless-words-desktop.png and unless-words-phone.png in that directory. Full suite 620/620; affected-file final rerun 27/27; typecheck and production build passed. These reports are host-run evidence to assess, not commands the read-only reviewer should run or an instruction to assume approval.

Film contact sheet (actual MP4 frames at 0,10,14,20,29,48,62,70 seconds): C:/Users/Joshu/dev/ai-os-projects/conditional-full-course-video-20261025/exception-language/review-contact-sheet.jpg. Metadata: 73.633333s, 1920x1080, 30fps, AAC. Final MP4 SHA256 931dbe3bb9a8381b6e788065194fe2b1c0879e0c8e90f930ab6d29a6611e56e9. HyperFrames check passes with zero craft/layout/overflow warnings; four contrast samples warn during an outgoing fade at 36.809s. Stable sampled frames are legible. No full playback/audio listening or physical-device acceptance is claimed by this evidence.

Review scope: UnlessLesson.tsx, its lesson-specific full-course.css block, FullCourseLesson.test.tsx, the exception-language entries in fullCourseContent.ts/fullCourseItems.ts/fullCourseMedia.ts, and the routing/film wrapper in FullCourseLesson.tsx. Read the specified film scene source and image evidence where available. Report exactly what was actually inspected, including whether image reading succeeded. The checkout contains extensive prior unrelated staged/unstaged/untracked work. It is explicitly outside this review. The current HEAD is 6a167c8555b4a404334310aad48a5d748b1b0861, not a pristine pre-session snapshot; scoped untracked files contain the whole local lesson. Do not attribute all other checkout changes to this task.

Remaining limits: local preview and static/image evidence do not establish signed-in production acceptance, real screen-reader output, physical-phone behavior, continuous film/audio validation or exhaustive animation sampling. Review the final implementation separately from plan approval.
