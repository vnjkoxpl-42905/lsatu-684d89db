# Exact timed content is prepared for privileged installation

Date: 2026-09-30

Status: **Generator, deterministic catalog, INSERT-only seed and isolated source-validation tests are prepared. No backend deployment or frontend adoption.** This closes the arbitrary-client-blueprint design gap in the prepared PrepTest writer; it does not establish live atomic enforcement. Ticket #167 remains open.

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

Install only after independent review and isolated transactional writer tests. Retain prior manifest rows for historical protected sittings. Fresh live backend metadata, managed deployment route confirmation, and immediate approval for any potentially paid Lovable action are still required before deployment.
