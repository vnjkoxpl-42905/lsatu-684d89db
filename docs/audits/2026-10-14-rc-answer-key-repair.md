# RC answer-key repair, 2026-10-14

## What was wrong and what changed

The complete static RC bank was compared with published LSAT Lab credited answers: 2,150 unique questions, including all 548 recovered questions. The audit found 56 disagreements and no unverified questions. Each disagreement was independently corroborated against an authored LSATHacks or 7Sage explanation with the matching official address, question stem and choice meaning. This is provider corroboration, not a claim of direct LSAC-issued key certification.

Exactly 56 `correctAnswer` values and 112 corresponding choice flags changed across nine bank files. Question text, choice text/order, IDs and other fields were preserved. In particular, PT159 S2 P1 Q2 (question10733, Torchy Brown) changes from B to D. The previous q6483/PT118 correction to A remains intact. The manifest therefore contains 57 documented corrections: 56 new and one preserved.

PT158 S1 and PT159 S2 contained repeated placeholder letters. The other corrections affect PT101, PT111, PT121, PT122, PT128, PT153 and PT155. The precise addresses, prior/current letters and evidence URLs are in `src/features/rc/lib/rcAnswerKeyCorrections.json`; the complete audit metadata is in `2026-10-14-rc-answer-key-audit.json` beside this report. Captured source files under `scripts/rc-source` were not edited.

## Prevention

`npm run rc:keys:check` binds every current question's address, passage/stem/choice identity and credited answer to the reviewed 2,150-record authority report. It validates the report hash, duplicate/stale/missing membership and documented corrections. Prebuild runs this gate before search/finder generation. Corrections cannot silently move to a different passage or changed question text.

The bank builder now checks explicit recovered keys as well as authored keys and choice flags, and rejects conflicting keys or malformed present choices before writing. The full CSV bank rebuild was not executed: this checkout lacks several original source inputs. The targeted correction runner validated all banks before applying the verified key-only changes. Original recovery captures remain evidence, rather than being rewritten to conceal their mistakes.

The application grades from the static bank. Repository/runtime SQL inspection found no grading function consuming the `rc_questions` archive keys. No database source keys, saved responses, scores or timing were rewritten.

## Existing attempts

A read-only production query found 26 response rows across five sessions touching documented corrected questions. One in-progress full practice-test response has a saved verdict different from the corrected key. Existing acknowledged responses retain their recorded verdict when the exact attempt ID, question and answer match a documented old key. New or changed selections use the corrected key. Unexplained mismatches still fail validation. Results disclose a saved-score/current-key difference.

The controlled browser replay rendered actual RcResults with a synthetic historical B/correct row for question10733 and current key D. It preserved 1/6 (17%), displayed D and the notice, kept the protected analytics control disabled, and made zero backend writes/external requests. Screenshot and JSON receipt were produced locally by `node scripts/verification/rc-key-browser.mjs`. This is controlled replay, not signed-in production persistence acceptance.

## Verification

- Independent semantic-diff review approved: nine bank files, 56 keys, 112 flags, zero other field changes; source captures unchanged.
- Answer-key tests: 9/9 passed; authority gate: 2,150 questions, 57 documented corrections, zero unapplied.
- Index tests: 7/7 passed; generated indexes verify all 2,150 IDs and official addresses.
- Historical grading, timed child/section and protected results tests: 21/21 passed.
- Targeted ESLint: zero errors, one existing unused-variable warning in timedSectionController.
- Typecheck passed. Production build passed, including the postbuild content scan (759 files); existing bundle-size, Tailwind utility and Browserslist warnings remain. Publication receipts are recorded below after completion.

No full-suite pass or broad RC device/accessibility acceptance is claimed by this bounded answer-key repair. Earlier UI acceptance gaps remain separate.

## Release integration

Repair commit `79155d4e` was independently approved for both key integrity and historical-grade compatibility. The safe-push procedure merged concurrent main changes without conflicts into `ee91cddf0b2b28e28c6ba36c8c0d1ad3a4433e20`, passed the merged typecheck, and pushed it to origin/main. A second production build of that integrated commit passed, including the 759-file content scan. No Edge Functions or database migrations are part of this release. The unrelated unstaged MCP edit was excluded.

Lovable reported the exact integrated SHA synced before the free direct publish request `d99d0281-24af-44c8-b922-c5a56f8e22ca`. At 2026-10-15 03:23:09 UTC (2026-10-14 locally), fresh public HTTP checks proved all nine changed bank files byte-identical by SHA256, question10733 credited D with its single D flag, and the historical-grade notice present in live `RcResults-CXV9uR-Y.js`, reached through `index-C9yNIW8o.js`. [Machine-readable publication receipt](2026-10-14-rc-key-publication.json). No paid agent request was sent.

Read-only before/after production aggregate receipts match for the 26 affected response rows across five sessions. See [attempt-preservation receipt](2026-10-14-rc-key-attempt-receipt.json). This verifies unchanged stored records plus released assets; no new signed-in production attempt was created in this answer-key pass. A subsequent documentation-only commit records these receipts without requiring another frontend publication.
