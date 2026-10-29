# RC Training design and workflow review

## Goal
Help a first-time student choose a passage, read one paragraph, hide it, recall its meaning aloud, check it, and finish with useful feedback. The experience should make the next action obvious with minimal reading and no unnecessary setup.

## Review scope
Review the actual current working tree, including untracked files. This is an independent design, workflow and final implementation inspection, not a request to write code. Identify evidence-backed improvements, prioritize meaningful problems, and distinguish release blockers from optional polish. Inspect the relevant React components, CSS, recorder/recovery logic, grading contract, instructions/demo, and acceptance evidence under docs/rc-training. Source inspection cannot establish visual perfection; explicitly state visual limitations.

## Settled requirements
- One RC Training entry, searchable ready-to-use passage list. One passage by default; a full section is four passages through the same paragraph routine.
- Optional elapsed clock, no forced cutoff. Separate concise instructions page, worked example and rendered video. No Cappuccino/Decaf terminology.
- Fullpage exercise without app sidebar. Collapsible guide, collapsed after the first paragraph. Short specific action labels, comfortable spacing, preserved original passage text without source/publication prefaces.
- Microphone records throughout reading, recall and checking. Space hides the text and marks recall start; Space again reveals it and marks recall end. Only timestamp-bounded recall speech reaches grading.
- Save/recovery must prevent recording loss and duplicate finalization. Explicit feedback action after completed attempts grades eligible saved recalls; missing clips must not hide already saved feedback. History and status refresh reads must not trigger paid calls. Expired private playback links must be reopenable.
- After microphone interruption, the supported safe path is save/leave, recover and resume with a new capture. Do not switch an immutable or uncertain spoken window to silent in place. Failed leave must keep its warning visible and offer upload retry when audio is retained, or an explicit Leave anyway. Native Space activation of interactive controls remains intact; the optional checkbox explains which Begin button to use.
- Grade the transcript against canonical source meaning using fixed 2/1/0 points; show specific omissions/distortions and next steps. Unusable speech receives no invented zero. Cheap models, cached transcription and bounded retry/concurrency.

## Evidence and verification
Read verification-2026-10-18.md, backend-acceptance.md, grader-v2-acceptance-results-20261018.json, hardware-continuous-readback-20261018.json and hardware-full-section-readback-20261018.json. Host reports 853 Reading Center tests across 48 files, typecheck and production build passed. Actual Chrome microphone single and four-passage sessions saved successfully; those private recordings were not sent for grading. Synthetic controls scored accurate 100%, omission 33%, distortion 0%, and continuous reading/recall/checking 33%, proving reading/checking excluded. Five-call approved budget is exhausted. Further paid calls are out of scope.

## Acceptance criteria
Identify improvements that materially reduce confusion, friction, unsafe state transitions or misleading feedback. Cite exact files and evidence, explain student impact, and give concrete fixes. Inspect consistency between instructions, demo, actual runner and grading. Check keyboard/focus behavior, mobile layout, empty/error/save/retry paths and transcript/grade interpretation. Do not require decorative changes without a usability rationale. Preserve existing authorization and unrelated work.

## Coordination
Codex host and builder; Claude independent reviewer. Requested model Opus 5.5, effort low. Two completed review rounds and two initial inspection rounds are preserved with host-authored dispositions. Joshua explicitly authorized one additional final Opus inspection after seeing the final pushed fixes, tests and review limits. Prior implementation and conditional merge/publication authorization remain in force. This review itself is read-only. Private playback, video playback, final responsive spacing and merged-source checks have passed; release remains pending final inspection disposition.
