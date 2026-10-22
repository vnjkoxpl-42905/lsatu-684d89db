# Review integrity and return-state verification

Date: 2026-10-02
Ticket: #170, remains open.
Base: `0f48e65`, current main when this isolated checkout was created.
Branch: `codex/review-170-finish`.
Status: source, local browser checks and the scoped live publication checks passed. Whole #170 remains open.

## Scope

This slice is isolated from Claude's #171 drill-builder ownership and the pending #176 session-link deployment. It changes only Review queue/detail/client-contract code, tests and verification helpers. No backend deployment, AI inference, database mutation, bank edit, historical-answer rewrite or flag removal occurred.

Activity queue/detail now require completed status plus a valid completion timestamp, and accept only attributable judged responses with valid attempt identity. The detail page verifies the exact owner/assignment, hides stale account/route data before effects settle, and offers Retry on read failure.

The saved review service validates episode/event identities, supported enums, timestamps, text payloads, student event ownership, unique immutable events and exact scope before interpreting completion. An independent reviewer caught a new incompatibility with server-valid empty reflection payloads; it was removed and both historical forms have regression coverage.

Review adds URL-backed area/source filters, searches displayed flag notes, and retains the last-opened item key alongside query/reason/view/pagination in its detail return URL. Returning marks the exact row Last opened. Changing filters clears stale selection and pagination. Source failures explicitly describe the count as partial.

## Automated evidence

- Final related suite: 87/87 tests across 12 files.
- Typecheck: passed.
- Scoped ESLint: passed, no warnings or errors.
- Final production build: passed, 7138 modules and 769 canonical-output checks.
- Diff whitespace check: passed.
- Generated bank/address-index/MCP churn restored before staging.
- Independent source re-review approved after the reflection correction.

## Actual authenticated browser evidence

Normal teacher sign-in used existing locally configured credentials. Credentials are absent from this record. The actual app at port8184 displayed 282 owned Review items.

Selecting Wrong-answer journal, LR, search PT159-S1-Q10 by its displayed address, and detailed table produced one owned row. Opening its exact journal route and using Back to review queue retained source/area/search/table and its last-opened key. Reload preserved the controls and marker. No answer or reflection was submitted.

Responsive checks used an iframe of the actual authenticated app, with no fabricated auth or rows:

| Requested width | Effective document width | Horizontal overflow |
| --- | --- | --- |
| 390 | 375 | 0 |
| 820 | 805 | 0 |
| 1280 | 1265 | 0 |
| 1440 | 1425 | 0 |
| 700px docked frame | 685 | 0 |

At requested390, root font32px also had zero horizontal overflow; reason controls wrapped. This certifies root-font enlargement, not browser zoom. Screenshot: `artifacts/review-170/narrow-double-text.png`.

A targeted local network block on Activity assignment/response reads showed a friendly read error and Retry Activity review. Removing the block and clicking Retry returned the unavailable-in-this-account state for the QA student's assignment under the teacher's personal Review route. This is genuine read-failure/retry and owner-denial evidence, not a positive owned Activity miss. Screenshot: `artifacts/review-170/activity-read-failure.png`. All network blocks and viewport overrides were cleared.

## Outstanding acceptance

Whole #170 remains open. Positive ordinary-student Activity-miss detail, broader source task walks, review completion/flag independence in a real account, later-miss episodes, first/blind/reveal behavior across all supported families, and teacher/student queue agreement still require acceptance. This pass did not manufacture new misses or mutate student work to provide them. Full runtime detail coverage is not inferred from mocked tests.

The separate #176 backend deployment still requires its outstanding route confirmation and immediate credit approval for a paid Lovable agent turn. This frontend slice needs no backend change.

## Published frontend checkpoint

Functional commit `cc294c7227281a5db4ee38c1ada595fd20ed2a02` reached GitHub main through `.claude/safe-push.sh`, including its typecheck gate. Lovable imported that exact SHA. Free deployment `592d5dad-5f50-4e93-9b89-aec7a6c80f9a` completed with the editor showing Your website was updated. The initial fresh production check served the previous UI; after the deployment transition, a reload rendered the new area/source controls.

Authenticated production `lsatprep.study/review/to-review` displayed the same owned journal row. Its exact journal route and Back to review queue retained source, LR area, search, table view and selected identity; the link had `aria-current=true` and the row displayed Last opened. Screenshot: `artifacts/review-170/production-filter-return.png`. Production entry was `/assets/index-Bntll0hI.js`; runtime build SHA was not exposed, so exact runtime-SHA identity is not claimed.

The detailed table also passed the four measured widths above without horizontal page overflow. An initial browser-global measurement did not change the targeted frame width and was discarded; target-tab emulation produced the stated actual widths. All overrides were reset. No answer, note, completion, database or paid AI action was performed. Temporary verification tabs were closed, the production Review tab retained, and the owned port8184 server stopped. The separate port8080 session-link server was not stopped.
