# Quality rubric for the finished Conditional version

Joshua requested this rubric for selecting and finishing the strongest version. It evaluates the current implementation and its evidence, rather than the provider or number of commits.

Each category is graded **Pass**, **Needs correction**, or **Unverified**. A local finish requires every local category to pass and no known material defect to remain. Unknown results are never counted as passes. A failed hard gate cannot be offset by visual polish or additional tests elsewhere.

| Category | Pass standard | Evidence required |
| --- | --- | --- |
| Logical accuracy | Complete conditions retain timing, restrictions, compounds and modality; originals and contrapositives express the same rule; approved definitions remain exact. | Item-by-item source audit, grading regressions and preserved source identity. |
| Teaching and progression | Meaning precedes notation; each lesson adds a distinct skill; guided recognition leads to production and transfer; requested flashcard destinations and group boundaries are respected. | Current preference ledger, active route composition and rendered learner flow. |
| Feedback and completion | A learner attempts before seeing the model; hints teach the error; help is deliberate; objective errors block advancement; prose self-review stays distinct from grading. | Wrong/correct/help/browser paths, first-answer scoring and completion tests. |
| Saved work and boundaries | Drafts, responses and previous runs survive reload and compatible changes; incompatible work is archived; old grading is revalidated; accounts and assigned groups cannot inherit unauthorized work. | Migration/history tests, account/hydration tests and actual reload checks. |
| Interaction and accessibility | Keyboard focus reaches the new task and remains visible; controls and rules have meaningful accessible names; active screens work at narrow, docked and wide widths; motion and hidden content do not interfere. | Actual keyboard navigation, accessibility-state checks and responsive inspection after transitions settle. |
| Verification and release honesty | The final code passes relevant tests, typecheck and build; reviews identify their actual coverage; source, browser and production acceptance remain separate. | Final command outcomes and browser receipts tied to the committed version. |

Hard failures include a wrong logical key, a lost saved attempt, cross-account or assignment leakage, premature answer disclosure, false completion, inaccessible navigation, or claiming acceptance that was not tested.

## Findings and disposition

- Mixed practice capped earlier archives and discarded them when saved question identities could not map. Preserve all prior snapshots and start the new bank with retained history. Four regressions cover content revision, a shortened bank, changed identity and a retired follow-up.
- Flashcard deck navigation changed only the query and lost focus. Observe destination search changes and focus its heading; cancel stale navigation frames.
- Embedded quiz Next/restart could leave focus on the document. Focus the new prompt with its rule as the accessible description, without stealing initial page-entry focus. Include same-question restarts.
- Both lesson flashcard links previously resolved to one mixed deck, and either assigned group exposed both. Restore dedicated Group 1 (13 cards) and Group 2 (7 cards), with separate saved progress; allow the optional 20-card mixed review only when both groups are available. Preserve the existing mixed record and authored cards.
- Browser acceptance found Next card returned keyboard focus to the document. Explicit card advance and restart now focus the next named group-choice prompt. Initial arrival and final results retain their own heading focus.
- Initial tab contrast/keyboard findings were traced to unused code. They are excluded from live-course findings and from claimed improvements.

## Final local assessment

All six local categories pass within the recorded coverage. Logical accuracy and feedback retain the prior source audit, worksheet/staged browser evidence and grading safeguards described in `reconciliation.md`; this pass adds four mixed-history migration regressions, isolated flashcard queues and assignment gates, and keyboard navigation regressions.

- Final typecheck and production build/postbuild content guard passed. The build reports its existing large-chunk advisory; no new dependency or authored card changes were introduced.
- Final Conditional/refresher regression run: **35 files, 440 tests passed** after the last card-focus fix (`quality-final-tests.log`).
- Actual Enter activation passed eight quiz Next/restart transitions: each new prompt held focus, described the corresponding rule and scrolled into view.
- Sufficient and necessary lesson links opened their correct dedicated deck with heading focus. Answers survived full reload in each deck; Next card focused the new named choice prompt. Separate Group 1/2 saved positions remained intact.
- Responsive acceptance passed 52 representative screens at 320/375/640/900/1440 pixels, including both dedicated decks and mixed review plus default-token samples. No document overflow or clipped controls. Phone and docked screenshots were inspected after transitions settled.
- Independent read-only review found no remaining actionable defect in mixed history migration, deck isolation or assignment gates. Focused deck tests additionally verify all seven cards, results focus and Go again focus.

**Unverified release outcomes:** signed-in production persistence, physical devices, screen-reader speech, Joshua's editorial approval and publication. Local passes do not certify those outcomes. Historical Intro to LR benchmark documents remain unavailable; this rubric does not certify historical parity. This finishes the local quality pass, not a claim that no future improvement is possible.
