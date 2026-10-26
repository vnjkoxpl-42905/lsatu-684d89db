# Exact timed content is installed as the active server catalog

Date: 2026-09-30

Status: **Current server selection is the deterministic 59-PrepTest catalog `c27b478f2d50f8353a98d4a1a905d2f94f87929ba2ea2179230d4f7a3d51c25c`, seeded INSERT-only alongside the original catalog. Enabled configuration selects this hash with a 30,000ms lease. Official runners are integrated locally; frontend publication and live timed acceptance remain open.** This closes the arbitrary-client-blueprint design gap in the prepared PrepTest writer; it does not establish live atomic enforcement. Ticket #167 remains open.

Run from the application checkout:

```powershell
npx vite-node --script scripts/knowledge/build-timed-manifest.ts
npx vite-node --script scripts/knowledge/build-timed-manifest.ts --check
npx vitest run src/lib/timedContentManifest.test.ts --maxWorkers=1
```

The generator reads editable `public/data/PT<n>-S<s>-LR.json`, `public/data/rc/rc-index.json`, and each index-referenced `public/data/rc/RC-PT<n>.json`. `scripts/build-question-bank.mjs` identifies individual LR files as editable authority; `_bank.generated.json` is intentionally excluded. RC index membership is checked against its full passage/question files, rather than trusting a count alone.

It imports the actual `buildPracticeTests`, `buildRcSections`, and `normalizeQType` runtime rules. LR question order follows the loader's ascending question number; removed positions never enter the queue. PT118 therefore has scored LR S1 (25 questions, excluding Q5), RC S2 (27), and LR S4 (25), with S3 excluded. RC questions retain their native integer IDs, ordered by passage position then question position. Current output contains **59 PrepTests, 177 legs, and 222 hashed source files**.

## The writer freezes these server-owned rows

The agreed SQL table is `public.timed_content_manifests_v1(manifest_sha256 text, pt integer, blueprint jsonb)`, primary key `(manifest_sha256, pt)`. The transactional writer owns its schema and grants. The generator's SQL artifact creates no schema, policy, role, or grants. It inserts reviewed versions and rejects existing conflicting content instead of replacing it.

Each `blueprint` has:

| Field | Meaning |
| --- | --- |
| `pt`, `questionCount`, `rcFullLength` | Runtime PrepTest identity, exact total and full-length RC flag |
| `breakAfterLeg`, `breakSeconds` | Fixed existing break rule: after leg 2, 600 seconds |
| `legs[]` | Runtime scored sections in published order |
| Leg `kind`, `section`, `questionCount`, `qids[]` | Exact ordered leg identity and frozen question queue |
| LR `questions[]` | `qid`, `qnum`, normalized `qtype`, `level`, `contentSha256` |
| RC `passageIds[]`, `questions[]` | Native integer passage IDs and native question IDs; `qid` is `String(questionId)`, plus `passageId`, `qnum`, `contentSha256` |
| RC `passages[]` | `passageId`, `section`, `setNumber`, `contentSha256` |

Creation accepts a PrepTest identity and uses the server-configured active manifest hash. A caller cannot choose an arbitrary manifest version, queue, passage set, or leg blueprint. The writer copies the complete blueprint and version into protected parent state, and validates each child command against the frozen matching leg. Manifest rows and historical versions must remain immutable and unavailable to ordinary caller INSERT/UPDATE/DELETE. Activation is a privileged deployment decision, not a client flag.

The generated JSON artifact includes schema version, the blueprint catalog, sorted source-relative paths with SHA-256 hashes, and `manifestSha256`. This hash is SHA-256 of the recursively key-sorted JSON body **excluding the hash field itself**. Arrays retain semantic order. It covers canonical files, relevant runtime rule files and the generator source. It is a whole catalog/version identity, not the digest of PostgreSQL's differently formatted `blueprint::text`. Question fingerprints cover raw source text and choices; file/rule hashes additionally identify answer-key and loader-normalization changes.

Artifacts contain no stimuli, prompts, passage text, explanations, choice text, or correct answers. They provide membership/content identity, not a new secure-grading guarantee. Existing client-derived correctness remains the explicit scoring boundary in the timed implementation plan.

## Invalid or changing source content prevents generation

Validation rejects duplicate or contradictory LR source positions; wrong PT/section identity; unsupported difficulty; missing prompts, choices or keys; duplicate RC passage/question identity; missing choices; index/file roster disagreement; duplicate passage positions in an offered RC leg; and queue/count mismatch. All source hashes are checked again before returning a catalog, so a concurrent canonical edit cannot silently create a mixed snapshot.

Tests compare all offered blueprints with the actual runtime builders, pin PT118 removed numbering, verify exact RC ownership and ordered question IDs, reproduce both artifacts byte for byte, and reject injected source identity/duplicate/choice/index defects in isolated temporary fixtures. Changed question content must change its fingerprint and manifest version. These checks do not claim official completeness beyond the bank we ship; the existing practice-test audit remains the authority for gaps in captured official material.

The reviewed catalog is installed and selected, as recorded in [deployment evidence](../agent/verification/2026-09-30-timed-deployment.json). Retain all catalog versions for historical protected sittings. Catalog installation and activation do not prove live runner, outage or multi-device acceptance.

Current rollout checkpoint: root temporarily disabled configuration after a live-connected local LR launch rejected valid PostgreSQL offset/microsecond timestamps. The narrow v1 LR adapter now uses strict explicit-zone ISO validation before normalizing the local parser input to UTC Z; invalid calendar, missing-zone and malformed timestamps still fail closed, and the authoritative account record is unchanged. Root re-enabled the same catalog and 30,000ms lease at 14:24 UTC. Actual LR browser verification then rendered the full question, acknowledged an answer and confirmed it by SQL readback. Blocking commit RPC hid questions and showed paused recovery; clearing the block and retrying the retained command recovered the question. Mandatory LR closeout was deliberately not exercised on this administrator fixture, to preserve its existing journal identities. LR/RC timestamp regressions passed 35 tests across two files; the child UI suite passed five tests. Frontend publication, RC browser acceptance, complete closeout, revocation and second-device acceptance remain open.

Latest root browser evidence: ordinary-account retained creation/claim/start opened the RC-first administrator QA run `qa-timed-rc-ui-cd812b72-4496-4738-bc7f-246cb4290279`. The full passage and question rendered; B was acknowledged and SQL readback confirmed attempt `1d694066-01bd-4e0a-a75c-26d4a1895f8f` for question 7660 selected B with correctness true. Next acknowledged question 2. Actual browser viewports at 390, 820, 1060, 1280 and 1600 pixels had document width equal to viewport for both LR and RC. At 390 pixels, Passage only exposed Risk Communication and Show questions returned to the question. LR paused reload retained exactly 32:55, then resumed; returning to PrepTest acknowledged the checkpoint and pause. The final integrated suite passed 176 tests across 15 files and typecheck passed. Final production build subsequently passed; 755 canonical output files were checked. RC outage/reload, mandatory closeout, publication, revoked-write and second-device acceptance remain open. Configuration is enabled with the reviewed catalog and 30,000ms lease. An ineffective initial browser capability override is excluded from acceptance evidence.

Final catalog selection: a staged-byte audit checked all 222 manifest inputs and found only `src/lib/practiceTest.ts` differed by working-tree CRLF versus staged LF. With no unstaged source changes, root normalized that file to the exact staged bytes and regenerated catalog `c27b478f2d50f8353a98d4a1a905d2f94f87929ba2ea2179230d4f7a3d51c25c`. Live SQL comparison confirmed all 59 blueprint JSONB values are identical between the catalogs. Its 59 rows were seeded INSERT-only alongside the prior 59-row catalog, and enabled configuration now selects the new hash with the same 30,000ms lease. The prior administrator QA parents retain their frozen `cacaf2b0ab5cc71535d1efa543f284d601404ae7d0133dc32126ea4801878872` version; their recorded browser evidence is historical evidence for that version, not a rewritten sitting.

RC outage acceptance: blocking Next's commit hid questions with the friendly paused error. After removing the block, retry returned PT410 because the acknowledged lease expired; it did not silently claim recovery. Parent Preserve rejected change archived the rejected envelope/evidence, then an explicit claim reopened the saved section paused at 31:22. Reload preserved exactly 31:22 and the administrator fixture was left paused without mandatory closeout or journal mutation. The separate ordinary-tester baseline closeout probe passed; that is RPC evidence, not a browser closeout walk. All network blocks and device override were cleared. Final production build passed, checking 755 canonical output files without a canonical-content failure; 176 integrated tests across 15 files and typecheck passed. Frontend publication, mandatory closeout, revoked in-flight writes and actual second-device acceptance remain open.
