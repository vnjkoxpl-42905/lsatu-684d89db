# RC Create must open a new drill

Audit date: 2026-10-15. Starting source: `5014ce9161b18c6e18929a02374f38d8073b877e`. Evidence combines signed-in production inspection as Joshua, source tracing, public competitor inspection, local component rendering and regression tests. Publication evidence is recorded below after release.

## What was broken

The exact reported URL, `/practice/drills?section=rc&view=create`, selected Create but mounted a launcher followed by `PracticeInsightStage`, whose RC branch rendered all reading sessions. In-progress and completed sittings appeared together with Resume, Results and Delete. The actual builder existed only at `stage=type-drill`. This was an implemented route composition, not stale student data. Removing saved sessions would not fix it.

| Finding | Repair in this change |
| --- | --- |
| Create showed existing drills and required another Create click | Mount `RcHubSurface` directly with history disabled. Keep legacy builder links working. |
| RC In progress mixed LR and RC; the section switch disappeared in history | Tag history rows by section, filter by section and status, retain the current history view when switching sections. |
| Protected timed RC sittings entered ordinary drill history | Exclude practice-test, assigned and protected-section sessions from that list. Their own destinations remain authoritative. |
| Pale dark-card text was unreadable when the builder moved onto a light setup card | Scope Workroom semantic tokens to the entire RC setup. Correct inactive tab colors and preserve selected-state and keyboard focus contrast. |
| Fresh/adaptive preview could race the history read | Track readiness, block new previews/starts until history succeeds, and invalidate inspected sets when eligibility inputs refresh. |
| Legacy `start=1` bypassed normal full-content validation and shortfall acknowledgement | Use the same inspection checks for autostart; invalid links or incomplete sets stop at setup. Preserve valid link replacement and exact pending-launch recovery. |
| Save and exit persisted only the current unchecked answer; earlier selections could remain device-only | Save validated unconfirmed account drafts through the serialized config writer before leaving. Restore them as editable choices without scoring or revealing them. Show these saved drafts in In progress even before a scored attempt exists. |
| “At the end” claimed test conditions even though practice allows pause/overtime | Describe answer timing accurately: “Finish the drill, then review.” |
| Shared Saved sets implied RC template support | Label the destination Saved LR sets and direct RC sittings to In progress/Completed. No RC template feature is claimed. |

No stored sessions, attempts, historical scores, question text or answer keys are removed or rewritten by this repair. New session configuration may store draft selections. Existing question-bank authority gates still apply.

## What the comparison supports

[LawHub's public Drill Sets library](https://app.lawhub.org/library/drillsets) visibly separates Full Tests, Drill Sets, Lessons and Additional Practice. Its RC cards describe curated practice and require sign-in to practice. This audit inspected that public library, not a LawHub custom-builder workflow. [LSAC's preparation page](https://www.lsac.org/lsat/prepare) also establishes the official testing interface as the reference for test practice, not a reason to label flexible drills as simulated test conditions.

[7Sage's RC drill guide, 2023-07-27](https://7sage.com/discussion/43202/rc-drilling-by-question-type), describes choosing RC, passage count and filters before creation. [Its staff-authored Advanced Builder guidance, 2023-09](https://classic.7sage.com/forums/discussion/comment/207385/), describes narrowing the pool, selecting questions and creating the chosen set. These are dated first-party-site guides, not verification of the current signed-in layout. The current public homepage and guest curriculum were inspected; the authenticated builder was unavailable in that browsing session.

Design inference: creation should be a distinct passage-selection/configuration task with clear counts, timing, answer visibility and a read-only preview. Resume and results belong in history. Keep LSAT U's own presentation and existing safety boundaries rather than copying either platform's visual design.

## Further RC work, not claimed complete here

1. **Adaptive accuracy:** `rollingAccuracy` treats the 40 most recently touched distinct questions as incorrect if they were ever missed. A later correct response cannot repair that metric. Define recent first-attempt performance versus improvement through reattempts, then use an appropriate history representation. This change does not silently change that scoring policy.
2. **Reusable RC sets:** RC currently saves a sitting, not a reusable passage template. Implement explicit template creation/inspection/launch if desired; do not route RC templates into LR's question-ID launcher.
3. **Timing policy:** standard pace is pooled across the set, pausing is permitted and time can pass zero. A distinct exam simulation should use the protected testing workflow. Changing that policy is separate from correcting misleading setup copy.
4. **Broader reading/review quality:** this creation audit is not acceptance of every RC passage, explanation, review path, physical-device interaction or assistive-technology experience.

## Verification and release

- Integrated regression slice: **212/212 tests in 11 files passed**, covering builder, account writer, hydration, player save safety, historical grading, protected results/adapter, history, hub routing and the dev preview. The final legacy-route normalization then passed **24/24 route tests**. This is a targeted slice, not the full repository suite.
- Typecheck passed. Full production build, including question-bank authority, 2,150-question index identity checks and the canonical-content postbuild scan, passed before the last route normalization; the final release build and safe-push gate run before publication.
- Browser checks used the real `AcademyMainhub` and `RcHubSurface` components at `/dev/drill-setup-preview?section=rc&view=create`: 390, 768, 1024 and 1440 widths, light/dark setup, selected controls, history, keyboard activation/focus and legacy-link normalization. The 1024 check represents reduced canvas width with the preview sidebar; it is not physical-device testing. The anonymous local preview cannot load account history and correctly blocks launch.
- Fresh-storage draft restoration, editing/resaving, measured per-question time and no premature scoring/reveal were checked with fixture-backed persistence. Protected/test paths retain their previous behavior. No production scoring, completion or cross-device write is claimed from these tests.
- Signed-in production inspection confirmed the original defects and read the real passage picker and exact preview without starting or deleting an attempt. Publication and post-release UI readback are recorded in the vault's dated release log after deployment.

## 2026-10-19: restore the original dark Create surface

Joshua explicitly selected the original dark RC design. The white Create mapping originated in `12673998` on 2026-10-15. The later inline saved-set management block added unnecessary density and repeated complete names in action labels. The LR refinement did not change RC styling.

This repair restores the existing observatory launcher and removes the light RC token overrides. Create keeps its working preview, timing, passage selection and launch safety. Saved-set management remains in Saved sets; Create offers compact Save passages and Save settings controls only after a preview. Pending-save recovery remains mounted when a preview changes. Management actions display Open, Rename and Duplicate while retaining contextual accessible names. Adaptive detail and the history explanation move into the existing passage options panel; hidden-result guidance remains visible when needed.

Verification: typecheck passed; 116 focused tests across five files passed; independent source review found no high-confidence regression. Codex-browser synthetic previews exercised the actual components and classroom ancestors at 320, 650, 768, 1024 and 1440 px with no horizontal overflow in Create, preview or saved management. These checks do not establish physical-device, screen-reader or live account persistence acceptance. Production was inspected without starting or changing a drill.

Evidence: [restored Create](../implementation-plans/artifacts/2026-10-19-rc-design-repair/restored-dark.jpg), [320 px Create](../implementation-plans/artifacts/2026-10-19-rc-design-repair/builder-320.jpg), [320 px preview](../implementation-plans/artifacts/2026-10-19-rc-design-repair/preview-320.jpg), [saved management](../implementation-plans/artifacts/2026-10-19-rc-design-repair/saved-320.jpg). Release is pending a reviewed PR and explicit merge approval.
