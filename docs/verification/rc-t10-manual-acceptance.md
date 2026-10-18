# RC acceptance that requires people and devices

Prepared 2026-10-18. This is an execution checklist, not evidence that the checks passed. The published PR #220 is the baseline. Follow-up changes are on `codex/rc-t09-t10-acceptance`.

## Preserve account work

Use Joshua's existing labelled test work. Ordinary sitting `6ca71bac-0813-453e-b3b3-d6bbe466ee68` is completed, revealed and excluded from analytics. Protected sitting `4b0b9a21-7905-4190-a923-40efeb325538` reached real expiry on 2026-10-18 with no answers; its completed RC child is `8c5eba0b-27f0-4ab7-b1d0-4e6e8c3b8c6a`. This supersedes the earlier paused checkpoint. Do not complete, discard or overwrite unrelated sittings. New clocks and new accounts need their own scope; the prior authorization covered one test section clock.

## Record evidence for each check

Record date, deployed SHA, device/OS/browser, viewport, input method, account pseudonym, expected result, actual result, and pass/fail. Do not record credentials. Save the failure and recovery sequence rather than retrying until a pass hides the first failure.

| Check | Procedure and pass condition |
|---|---|
| Actual screen-reader speech | With NVDA or VoiceOver, navigate builder, preview, reader, results and saved definitions. Read source identity, full answer descriptions, selected state, save/error status, missing coverage and dialog titles. Operate with keyboard only. Escape returns focus; no focus trap. Capture what was actually spoken, not only the accessibility tree. |
| Actual 200% browser zoom | Set browser zoom to 200%, record the zoom indicator, then operate builder, reader, review and dialogs. All controls stay reachable; prose and controls reflow without lost text. Text-size settings and pinch magnification do not replace this check. Restore zoom afterward. |
| Physical phone and tablet | Use each device's actual browser and touch keyboard. Find, switch panes, open Display, read long/comparative passages, navigate questions and return from review. No clipped action, obstructed choice or accidental answer during scroll. Browser viewport emulation is separate evidence. |
| Two devices | Open the same saved recipe and existing test sitting on two independently authenticated devices. Confirm acknowledged records restore; a stale device does not silently overwrite newer work. Observe conflict/recovery handling. Do not infer cross-device timed annotations; marks are device-only. |
| Two actors | Use two authorized test accounts. After sign-out/sign-in, verify no previous actor's saved definitions, choices, recovery draft, note, confidence or score appears. Never use a real student's credentials for this test. |
| Protected conditions | In a controlled test environment, exercise sealed assignment, feature disabled, standard/custom/accommodated budget, expiry and reconnect. Training is absent; original timing/assignment identity is preserved. Do not change production feature flags globally to create a fixture. |

## Learner and comparative acceptance

Recruit 5-8 representative learners for a formative round. Give neutral tasks: start a fresh one-passage drill, find a source question, explain the configured conditions, save/reuse a set, resume interrupted work, and enter blind review. Record task completion, time, help needed and failures. Do not coach during a timed task. Use equivalent tasks and account/content assumptions for the competitor baseline. This is formative usability evidence, not a population success-rate estimate.

After repairing observed failures, run the acceptance group with counts and uncertainty. Evaluate fresh material, repeated material and delayed retention separately. A unit test or an agent completing a task cannot establish learner success rates or learning effectiveness.

## Completion boundary

These checks cannot be marked passed from source review, synthetic fixtures or viewport emulation. Missing explanation/media production is a separate content backlog. No message or learner recruitment has been sent by preparing this checklist.
