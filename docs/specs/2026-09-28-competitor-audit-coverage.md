# Four-platform audit coverage for the connected experience

Date: 2026-09-28
Source: [four-platform UI audit](../audits/2026-09-27-competitor-ui-audit.md)
Specification: [GitHub #165](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/165)

This matrix is a build checklist, not an implementation report. The audit inspected signed-in desktop paths on LSAT Lab, 7Sage, AdeptLR, and LSAT Demon. It did not verify every paid state, mobile layout, or action outcome. “Included” means the LSAT U specification and ticket require a result; “existing” means source inspection found relevant code, subject to live verification. A ticket is done only after its acceptance checks pass in the running app.

| Audit takeaway adapted for LSAT U | Decision | Build ticket | Current evidence and completion check |
|---|---|---|---|
| Short labeled student rail, bounded local expansion, more reading width | Include | [#168](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/168) | In progress; verify seven routes, URL tabs, legacy redirects, locks, and responsive widths. |
| Persistent question finder and Inbox, without extra rail items | Keep and polish | [#168](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/168) | Existing finder and Inbox code; verify visibility, result scanning, return destination, and teacher context. |
| One reasoned next action linked to assigned work and review | Include | [#174](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/174) | Approved Home v3 design; live source and completion response need verification. |
| Scannable teacher-prescribed week, reliable estimated size, finish rule | Include | [#180](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/180) | Needs end-to-end teacher-to-student task walk; no invented duration. |
| Every assignment instance, true start and finish status, notes and recaps together | Include | [#166](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/166), [#169](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/169) | Existing feed collapses repeated guided drills and marks a viewed TA item In progress; fix and reconcile source rows. |
| One Practice area with Drills and full Practice Exams | Include | [#168](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/168), [#171](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/171), [#172](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/172) | Complete Overview, All Exams, Attempts, saved sets, and unfinished work. |
| Exact drill selection, available pool, actual launched count, RC unit, mode and feedback timing | Include | [#171](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/171) | Existing builder is the base; verify exact PT/S/Q and honest count with real generated set. |
| Create, In progress, Completed, Saved sets and Continue/Results/Review | Include | [#171](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/171) | Expanded acceptance; verify owned runs and results, not just tabs. |
| Account-backed timed work, explicit start, safe resume, save-failure pause | Include; part exists | [#167](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/167), [#172](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/172) | Full PrepTest sync exists on current `main`; LR/RC error paths still allow clocks to run. Verify target backend and network failure. |
| Compact test result above expandable per-question detail | Include | [#172](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/172) | First/blind answer, time, source, note, flag, review state, and exact-question links required. |
| Review Inbox with missed, flagged, skipped, and teacher-selected reasons | Include | [#170](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/170) | Typed source links must work for LR, RC, Activities, and bootcamps. |
| First answer, optional Blind Review, deliberate Reveal, choice-specific written reasoning | Include | [#170](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/170), [#179](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/179) | Preserve original response and teacher note; distinguish pause-for-review from auto-reveal. |
| Compact queue with optional advanced question table and return context | Include | [#170](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/170) | Filters and selected question survive back navigation; default student view stays light. |
| Inspect a known question without a scored attempt | Include | [#171](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/171) | Confirm no attempt, completion, review task, or Progress change. |
| First-answer diagnostic Progress with sample size and missing coverage | Include | [#166](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/166), [#173](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/173) | Existing Analytics and History calculations differ; trace every numerator and denominator. |
| Summary above detailed, filterable History and topic evidence leading to Review or Practice | Include | [#173](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/173) | 7/14/21/30/All across measures; filter taxonomy only where source data is reliable. |
| Small written reasoning exercises, clear instructions, progress, and finish state | Include | [#175](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/175) | Improve existing Activities and bootcamps; no new video dependency. |
| Topic hub centered on Joshua's written rule and worked example | Include | [#175](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/175) | Pilot one LR hub, link direct drill and student's own evidence. |
| One-to-one session prep, recap, and follow-up chain | Include | [#176](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/176) | Reuse Schedule and typed recap records; preserve timezone and booking clarity. |
| Teacher authoring and selected-student view with full controls | Include | [#177](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/177) | Keep current Today, Inbox, Library, Insights; teacher answers stay teacher-owned. |
| Separate bookmarks, passage find/highlight/elimination, optional second attributed explanation | Include after core | [#179](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/179) | Only use tools the question surface supports; do not conflate bookmark and flag. |
| Consequence-aware accommodations, feedback, review, analytics, contrast, text-size settings | Include after core | [#180](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/180) | Persist provenance; no retroactive score changes. |
| Calm card hierarchy, one primary action, restrained color, readable explanation pane | Include as cross-cutting design | [#168](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/168), [#170](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/170), [#178](https://github.com/vnjkoxpl-42905/lsatu-684d89db/issues/178) | Apply LSAT U tokens, inspect phone/laptop/wide/sidecar, then run Impeccable critique and fixes. |

## Ideas we are not building in this release

- **New video catalog, group classes, broad forum, tutor marketplace, leaderboards, generic streak pressure:** poor fit for the current one-to-one offer or require ongoing operations Joshua has not chosen.
- **LawHub or paper-score import:** ownership, rights, consent, source mapping, and actual demand need a separate decision. Existing results remain available.
- **Automatic capacity-based scheduling and a 3D analytics hero:** these are separate product and performance bets. The teacher-prescribed week and readable 2D evidence ship first.
- **Response popularity and score predictions:** a sparse or unvalidated comparison group would imply false precision.
- **Old browser-only exam import:** owner cannot be proven. Preserve copies untouched and outside account Attempts.

The full audit can inform later refinements. It does not imply that competitor features or these tickets are already implemented in LSAT U.

## First verified slice (2026-09-28)

The first code slice adds the seven-destination rail and locked URL tabs, a scoped My Work ledger with student notes and Joshua's recaps, a saved LR wrong/flagged Review queue, a distinct first-answer Progress card in student and selected-student views, and an actor-owned Home next action. It preserves separate assignment instances and does not mark practice complete merely because a page was opened. The timed LR section now waits for an account save before question navigation. Local typecheck, production build, 157 focused tests, and signed-in browser checks passed. Home, My Work, Review, and Progress were checked at 390, 820, 1060, 1280, and 1600 CSS pixels for page overflow; the Progress detail table scrolls internally on narrow screens.

This is partial coverage. The Review queue currently draws from saved LR wrong-answer and flag records; RC, Activity, bootcamp, and teacher-selected review tasks are still open. Full PrepTest report expansion and RC save recovery are coded locally but held out of the first commit pending a completed-test browser fixture and backend failure verification. Live student-role and RLS checks are still needed. Exact drill selection, full History and topic evidence, Library topic hub, Schedule chain, selected-student controls, study tools, settings, and the final Impeccable pass remain open. No ticket should be closed solely because this slice ships.

## Second local slice (2026-09-28)

The next code slice adds completed standalone RC wrong answers and flags to Review, with exact question links; a saved-answer History page and LR Topics page with a persisted 7/14/21/30/all-day window; and clearer exact-drill pool counts with an all-question set preview. RC activity, bootcamp, active-session, and practice-test questions remain outside the Review queue until they have reliable exact-item review routes. Topics use saved LR question types only; sections remain all time because their source dates are not reliable enough to filter. The drill builder still needs saved run lifecycle, Inspect mode, and feedback-mode behavior before ticket #171 is complete.

Integrated typecheck, production build, and 54 consolidated tests in eight relevant files passed. Local browser reads of Review, History, and Topics passed at 390px, 900px, and 1440px without page overflow. The drill builder showed the actual available count and opened a ten-question exact-set preview at each of those widths. A scoped code review reported no high-confidence material defect. The second slice was manually published through Lovable. A signed-in student account showed the saved-answer History filters and LR Topics evidence on `lsatprep.study`.

## Third local slice (2026-09-28)

The next slice adds a written Main Conclusion lesson pilot to Library, drawing its rule and worked example from existing Joshua-authored material. It links to a filtered drill and shows saved first-answer evidence when the account permits it. Joshua's selected-student dossier gains Review and Progress tabs with explicit actor/subject context. Review lists saved first-answer misses for the selected student; it does not create a scored teacher attempt. These pages are bounded pilots, not completion of #175 or #177. The Library still needs more topic hubs and Activity/bootcamp improvements. Teacher Review still needs flags, wrong-answer notes, exact question inspection, and a fuller control walkthrough.

Local browser checks loaded the lesson and both teacher tabs at desktop and 390px without page overflow. Four focused tests, integrated TypeScript checking, and the production build passed. A scoped code review found no material issue at confidence of 80% or greater. An Impeccable technical pass on the new views found and corrected a nested lesson panel, a heavy quote border, low-contrast teacher helper text, an untokenized background, and undersized teacher links. Push and live publication remain release gates for this slice.

The full PrepTest result detail and RC save-recovery changes remain local and unpublished. Completed-run browser evidence and backend failure behavior are required before those paths can be released.
