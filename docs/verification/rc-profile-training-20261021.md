# RC profile timing and training modes, 2026-10-21

Local implementation only. No commit, push, deployment, real profile preference update, or real drill launch was performed.

## Reference behavior checked

Inspected the user's signed-in 7Sage LR builder and Preferences in the Codex browser. Did not change settings or start a drill.

- Immediate feedback: review after each question, rather than the end. RC's screenshot uses after each passage.
- Anticipation: answer choices remain hidden until explicitly requested. This does not reveal correctness.
- Line-by-line: reveal the stimulus or passage one sentence at a time.
- Timing menu: Standard, Unlimited, Target, custom percentage, custom duration. The exact Target calculation was not established.
- Profile timing accommodations: None, 125%, 150%, 175%, 200%. These are distinct from a drill's custom clock.

References: https://7sage.com/users/settings/preferences and https://7sage.com/discussion/62764/training-modes-immediate-feedback-and-anticipation

## Implemented

- Collapsed Training modes and Accommodations sections in the neutral right drawer. Automatic customization places them above passage filters. Manual picking retains search priority.
- Existing Show answers remains the single feedback timing control.
- Explicit Save to profile uses owner-checked auth metadata and updates shared practice defaults only after acknowledged success. Cancel/Apply do not undo a separately completed profile save. Failed saves retain the previous clock and show a retryable error.
- Fresh profile reads, actor-change and stale-response guards, and default launch loading guards. Explicit drill clocks and already-started sessions remain unchanged.
- Existing supported practice timing presets remain standard, time-and-a-half, double time, and unlimited. 125%/175% are not implemented; the certified accommodation entitlement is not modified.
- Saved sets and session configuration retain optional training flags. Missing flags mean both off.
- Actual player hides choices until reveal and supports sentence-by-sentence passage presentation. Protected exam, assignment, and review behavior ignores these practice modes.
- Direct lookup keeps its exact passage while the practice-only drawer changes training options. Timing/training edits do not recompute automatic passage selection.

## Browser evidence

Real React builder and presentation components with synthetic account/backend adapters. These fixtures do not prove production persistence or a signed-in end-to-end session.

- Profile save success and failure; Cancel discards training draft while retaining an explicitly saved profile preference.
- Both training flags apply and appear in Review. Text and answers stay hidden in Review.
- Direct lookup PT140/S3/P1 retained through practice-only customization and Review. Synthetic Start payload contained passage 1188, anticipation true, and 788 seconds per passage.
- Explicit sentence and choice reveal; next question hides choices again. Protected context exposes the ordinary full passage and choices, with training flags ignored.
- Drawer visually inspected at 1440, 980, 768, 390, and 320 CSS pixels at normal zoom. No document horizontal overflow; fixed footer and profile form remain accessible. Header description now clears Close. CDP viewport-only captures sometimes clipped the host-composited image; complete captures and DOM geometry were used to distinguish capture artifacts from actual clipping.
- Training presentation inspected at 1440 and 320 CSS pixels.

External evidence set: `RC-Profile-Training-2026-10-21`. These local captures are not included in this repository.

- drawer-desktop.jpg
- drawer-mobile.jpg
- training-desktop.jpg
- training-mobile.jpg
- synthetic-launch.jpg

## Automated verification

- Final builder suite: 137 passing tests, including loading/default synchronization and explicit-clock bypass regressions.
- Training/type/codec/progress/player/save-safety/passage suites: 141 passing tests.
- Profile/account/settings/section-selector/testing-centre suites: 91 passing tests.
- Final SectionSelector rerun after the Unlimited-to-Standard fix: 21 passing tests; final typecheck passed. The new regression exercises the explicit timing setup contract, rather than claiming browser acceptance of the live section selector.
- Root combined builder/context/player/presentation rerun: 163 passing tests.
- Final typecheck and production build passed after the TestingCentre loading guard, including content/index verification and the no-canonical-content postbuild check.
- git diff --check passed with existing CRLF conversion notices only.

Existing unrelated working-tree changes were preserved. The production build's generated Windows MCP stub was inspected and restored separately.

## Independent integration review

A read-only second-agent review found two clock issues, both corrected before completion:

- An Unlimited profile followed by explicit Standard timing in the LR section selector displayed 35:00 but launched unlimited. The launch now uses the displayed numeric base clock.
- RC could follow its initial untimed state before a fresh profile lookup finished. Profile-dependent review and launch now wait for that lookup and the corresponding timing-state synchronization, regardless of the initial timing label. Explicit URL/saved clocks remain independent.

This was a code integration review, not a new Claude review or production acceptance run.
