# RC Training Experience - Brainstorm / Discovery Notes
Date: 2026-10-20
Goal: Define and refine LSAT U's paragraph-by-paragraph RC Training experience before implementation.

## Approved direction
- Learning objective: accurately understand and recall ideas, details and logical relationships in the student's own words, not merely summarize or work faster.
- Experience: premium, calm, immersive, academically serious and distraction-free; highly polished, restrained controls.
- Audio recording continues through reading and recall except when paused. Persistent subtle recording status during reading; responsive live waveform during hidden recall.
- Primary action: stable bottom control area aligned with the reading column, consistent between stages.
- Hidden recall: centered instruction and waveform replace the paragraph in the same work area.
- Pause: restrained centered panel, softly blurred background, prominent Resume, elapsed time and quieter exit actions. Resume must be intentional.
- Copy: natural and minimal. Avoid 'retell', which Joshua describes as mechanical and robotic. Previously recommended copy: 'Recall paragraph', 'Explain what you just read in your own words', 'Next paragraph'.
- Progress: subtle paragraph counter/status; elapsed timer inside Pause, not during active reading.
- Transitions: brief and polished, with reduced-motion support.
- These are design choices, not authorization to change or deploy application code.

## Interview record
### Round 1
- Q1 objective: Joshua selected recommended A, accurate comprehension and recall of ideas, details and relationships.
- Q2 vibe: selected recommended A, premium distraction-free reader rather than exam pressure or a busy coaching interface.
- Q3 audio: selected recommended A, subtle indicator during reading and reactive waveform during recall; emphasized 'on at all times'. Existing pause behavior remains an exception.
- Additional copy constraint: dislikes 'retell'; use natural language about recall and explaining meaning.
### Round 2
- Q4 action placement: selected recommended A, stable reader-aligned bottom controls.
- Q5 hidden recall: selected recommended A, centered instruction and live waveform in the reading area.
- Q6 pause: selected recommended A, centered soft-blur panel with clear Resume, elapsed time and secondary exit options.
### Round 3
- Q7: 'Natural and minimal (Recommended)'.
- Q8: 'Subtle progress, timer inside Pause (Recommended)'.
- Q9: 'Brief, polished transition (Recommended)'.

## Earlier verified source context
- GitHub repository: vnjkoxpl-42905/lsatu-684d89db, main branch when inspected earlier in this conversation.
- Active implementation: src/features/reading-center/rc-recall/ContinuousRcRecallRunner.tsx and .css, RcRecordingWaveform.tsx/.css, useRecapRecorder.ts, lib/sequence.ts.
- Version-2 flow: read complete paragraph while capturing audio, hide text for spoken recall, advance; feedback on hidden-recall windows after completion/save.
- Pause controls recorder and active timer. Existing modal offers Resume, Save and leave, Finish early and instructions.
- Local checkout last inspected: C:\Users\Joshu\dev\ai-os-projects\lsatu on codex/rc-quality. Its Reading Center lacked the newer rc-recall directory; do not treat it as current main or switch branches without appropriate authorization.
- Source inspection and written tests do not establish that the authenticated live deployment was interactively tested.

## Screenshot review supplied after Round 3
Joshua says it is 'generally pretty good', asks for better in-between wording, more engaging recall visuals, better spacing/actions, progress/remaining paragraphs, and an easy visual improvement checklist.
- Image 1: reading paragraph 1. Quiet white canvas, left-aligned passage and action, subtle paragraph context, top-right Pause. No clear in-app recording indicator visible while reading.
- Image 2: paused. Existing blur and primary Resume hierarchy are already close to the approved direction. Description and secondary rows can be tightened rather than rebuilt.
- Image 3: hidden recall. Centered recorder card with a visually small meter; long left-aligned instruction beneath; separate left-aligned Next paragraph button. Mixed alignment and loose grouping are the strongest visible issues.
- Image 4: reading paragraph 2. Same general reader composition, providing a second passage-length sample.
- Images have different dimensions/crops; do not infer exact CSS offsets, browser zoom, or layout shifts by comparing raw pixel positions across them.
- A still image cannot verify waveform responsiveness, recording state, save success or keyboard behavior.

## Proposed visual checklist (not new approvals)
1. Compose hidden recall as one centered group rather than a centered status card, left-aligned instruction and detached button.
2. Promote the real microphone-driven waveform into the recall focal visual; remove the unnecessary enclosing recorder card. Calm baseline during silence; no fake listening animation.
3. Implement the already-approved stable bottom action area, aligned to reader width. Proposed refinement: primary action on the right and small shortcut hint separate from the label. Do not cover passage content or keyboard focus.
4. Use approved natural helper text; optional small headline 'Your turn.' is a proposal, not yet user-approved.
5. Add a small segmented progress treatment to existing paragraph numbering. Distinguish completed/current/upcoming with more than color alone. Update completion only after the appropriate saved action succeeds.
6. Make remaining counts scope-aware. 'Passage A: paragraph 1 of 4' does not establish that only four paragraphs remain in the entire exercise; do not conflate A/B with selected passages in a full section.
7. Keep truthful recording status visible while reading and recalling, and distinguish recording, paused, unavailable and saving states. Silence alone is not an error.
8. Hide source text before the graded recall window and fade in the recall view briefly; do not leave readable source ghosts or delay audio capture for effects.
9. Refine pause rather than replace it: shorter state copy, current paragraph context, concise practice time, less excess vertical spacing and clearly differentiated save/leave vs finish-early actions.
10. Separate passage typography, recall helper and metadata hierarchy. Preserve generous reading space; avoid shrinking passage text merely to fill the screen. Verify longer paragraphs and narrow viewports.
11. Preserve dynamic Next paragraph / Next passage / Finish passage / Finish section labels and provide accurate saving/feedback-pending states without premature success claims.
12. Verify keyboard focus, Space behavior, intentional Resume, readable small-screen layout and reduced motion. No new gamification, live grading or automatic advancement on silence.

## Open flags
- Pause and hidden-recall screenshots: resolved; supplied by user in this turn.
- Precise deployed commit and runtime behavior: still require interactive/deploy verification.
- Additional wording, progress-strip design and primary-action right alignment: proposals for review, not approved implementation.
- No application code has been edited as part of this discovery session.
