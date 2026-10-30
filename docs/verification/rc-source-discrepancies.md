# RC source discrepancies requiring an original-source check

These are not permission to rewrite official passages or keys. Authored explanations must distinguish the supplied passage's claims from outside facts.

## PT122, passage 751, Maize; question 6926

The supplied passage classifies rice with C-4 plants. Q6926 uses that premise. The International Rice Research Institute describes rice as a C3 plant and its C4 research as an effort to change that photosynthetic pathway: [IRRI, research on C4 rice](https://news.irri.org/2015/02/research-on-c4-rice-makes-mit.html). This establishes a real-world discrepancy; it does not establish which word appeared in the official test.

The extracted-original path referenced by `scripts/build-rc-bank.mjs` (`scripts/rc-source/data/passage_texts.ndjson`) is absent in this checkout. An authoritative official scan or the immutable original extraction is needed to distinguish an import/transcription error from a statement in the original passage. The current review preserves the supplied passage and answer key. Passage-relative reasoning should use the given premise without presenting it as general biology instruction.

## PT156, passage 1752, Formalism vs. Substantive Justice; question 10655

The supplied prompt asks what the author conveys "in using the phrase in the final sentence of the passage" but does not supply the phrase. The final sentence ends with "a misguided project," which is a plausible intended target, but that inference is not an authoritative transcription. The source prompt, choices and key remain unchanged. Recover the official question or immutable extraction before correcting assessment text. This incomplete quotation is a source-quality gap, separate from the authored explanation review.

## Recovery trace performed on 2026-10-18

The original dataset route is documented in `docs/plans/RC-DRILL-BUILD-SPEC.md`, section 2.1: `~/Downloads/lsat-lab-rc.zip` (2.3 MB), copied to `scripts/rc-source/lsat-lab-rc.zip`, with a README, SHA-256 manifest and `data/passage_texts.ndjson`. The builder reads that NDJSON at `scripts/build-rc-bank.mjs:52`. This checkout currently contains only `scripts/rc-source/data/questions.csv` and `scripts/rc-source/recovered/questions.ndjson`; neither the ZIP nor passage NDJSON is present. A filename-only search across sibling `C:/Users/Joshu/dev/ai-os-projects` checkouts (excluding Git internals, dependencies and build output) found neither file. A matching-name search in Downloads found no ZIP. `git log --all -- scripts/rc-source/data/passage_texts.ndjson scripts/rc-source/lsat-lab-rc.zip` returned no history. This establishes local unavailability within those searched locations, not that no external backup exists.

For Q10655, the captured record at `scripts/rc-source/recovered/questions.ndjson:471` was parsed directly. Its complete top-level field list is `question_id`, `preptest`, `position`, `passage_id`, `questiontext`, `total_responses`, `answers`. Each answer contains only `letter`, `text`, `correct`, `response_count`, `percent`. There is no alternate HTML, rich-text, formatting, highlighted-phrase or original-response field. The captured `questiontext` already omits the target phrase, exactly as the bank does. The upstream provider passage identifier is `15133`, distinct from the bank passage ID `1752`.

The earlier answer-key audit records Q10655 as official address PT156-S3-P1-Q2 and provider URL [LSAT Lab Q10655](https://www.lsatlab.com/lsat-explanations/PT156-S3-P1-Q2/formalism-vs-substantive-justice). A current read of that public page also shows the same incomplete prompt. This corroborates that the omission is not unique to the bank conversion; public rendering alone does not prove what the provider's complete raw API response or official test contains. `scripts/rc-recovery-pull.js` documents the existing authenticated provider route `/api/questions/10655` and captures only selected fields, including `q.questiontext`. Recovery would require examining a complete raw response in an existing authorized provider session for omitted rich-text fields, or obtaining the licensed official PT156 section 3 question 2 scan. No new login, credentials, provider API call or guessed phrase was used in this trace.

For Q6926, `docs/audits/2026-10-14-rc-answer-key-audit.json` records PT122-S3-P4-Q25 and [LSAT Lab's Maize question page](https://www.lsatlab.com/lsat-explanations/PT122-S3-P4-Q25/maize), previously HTTP 200. The current browser retrieval failed, so that old receipt is not current passage-text verification. The retained `questions.csv` supplies only identifiers/classification, not passage prose. An immutable original `passage_texts.ndjson` plus manifest can show whether the classification already appeared in the import; only the licensed official PT122 section 3 passage 4 scan or equivalent authoritative original can finally establish whether the official passage says rice. Neither a general biology reference nor an inferred replacement crop authorizes rewriting the supplied assessment.

Disposition: both source issues remain unresolved pending those exact authorities. No official passage, prompt, choice or key was changed.


## Official recovery and bounded disposition, 2026-10-18

The preceding unresolved disposition records the earlier investigation. New authoritative evidence now resolves the Q10655 quotation. [LSAC's January 2023 Disclosure Booklet](https://www.lsac.org/document-library/810), Form LTZC01, printed page 20 (zero-based PDF page 19), supplies the omitted target. The official answer-key page lists RC question 2 as E. Both page images were visually inspected; all five choice texts were mechanically matched after whitespace normalization. Captured PDF SHA-256 is `95b5c8e8595148d045175935adb02264546a3e10145f5855ca39962bafccecdf`. See [evidence provenance](source-evidence/PROVENANCE.md) and [hash manifest](source-evidence/SHA256SUMS).

Proposed single-field correction in `public/data/rc/RC-PT156.json`, passage 1752, question 10655:

Before:
> Which one of the following most accurately expresses the message the author intends to convey in using the phrase in the final sentence of the passage?

After:
> Which one of the following most accurately expresses the message the author intends to convey in using the phrase “misguided project” in the final sentence of the passage?

This restores an official quotation; it changes no passage text, offsets, choices, imported statistics, question order, IDs or key. The correction is now applied through the separately pinned `scripts/rc-source-correction.json` manifest and exact-match validator. The same prompt is updated in `rc-question-index.json`; all other source fields remain protected. Nine source/authored-overlay node tests cover source restoration/idempotence, prompt/identity/key failure, manifest-expansion rejection, exact integrity exception and existing authored-overlay reconstruction. Independent implementation review is pending.

The current authored-overlay capture and integrity audit intentionally reject prompt edits. Preserve that default and the pinned baseline. A separate narrowly typed source-correction manifest should pin the bank path, passage/question IDs, exact prompt before/after, immutable source URL/PDF hash and page. Both capture and integrity checks must recognize only that exact reviewed exception, fail on changed identity/value/extra protected fields, and report the exception separately from authored changes. The builder must validate the complete source and authored overlays before applying either; a malformed overlay must leave banks untouched. Do not broaden the authored allowlist or silently rebaseline against moving main.

For PT122 passage 751, a [PowerScore-branded reproduction](https://s3.amazonaws.com/studentcenter/lsat/fl/explanations/Additional%20L10HW%20SciTech%20Passages.pdf), printed page 10-4, labeled June 2006 Questions 21–27, also says rice among C-4 crops. The relevant page was visually inspected and captured with hashes. This materially corroborates that the word predates this bank conversion. Bounded searches of LSAC's public site for June 2006/PrepTest 49 and the distinctive crop phrase did not locate an LSAC-hosted original. No licensed account access or paid retrieval was attempted. Preserve the supplied passage and key. If an official-source certificate is required, obtain the licensed June 2006/PT49 RC passage 4 scan or equivalent LSAC original and compare its final sentence. No guessed crop replacement is appropriate.

T09 packet scope is inventory and honest missing states, structured written explanations and accessible media support. The original packet explicitly budgets missing media production separately and forbids mass-generating unreviewed authoritative reasoning. The 556 absent question writeups and four absent Standard summaries are accurately inventoried content gaps, not evidence that the requested existing-content review was skipped. Producing these would be a separate reviewed authoring effort. Accessible player support does not imply any real media assets were created.

The retained provider key-audit receipt is unchanged. `questionForOriginalAuthority` binds only the exact reviewed Q10655 quotation restoration, address and E key back to its earlier prompt for historical identity comparison; all passage and choice identity inputs remain hashed. Mutating any other identity input continues to fail. Combined source, authored-overlay and answer-key suites pass 18 tests.


## Canonical timed-source holdback, 2026-10-18

This checkpoint supersedes the earlier applied-restoration status. The LSAC authority resolves the omitted quotation, but **the correction is prepared, not applied in this release**. The bank and search index retain the legacy Q10655 prompt; the builder does not automatically apply the candidate. The authored overlay remains 1898 corrections and the deployed source delta is zero.

Integration review found that protected timed sections compare the complete question payload (passage text, prompt and choices) to server-owned frozen content hashes. A frontend-only prompt change breaks PT156 section 3 source verification for existing and newly created sittings backed by the old manifest. No frozen-source hash bypass, backend deployment or immutable manifest rewrite was performed. Application requires a coordinated new canonical source version and preservation of older sittings' exact content, or a separately reviewed exact-version compatibility strategy. The source candidate, official PDF/hash/page and tests remain available for that coordinated change. Rice wording remains preserved with publisher corroboration; its LSAC original remains unverified.
