# RC Training: local acceptance and remaining release work

RC Training is one Reading Centre destination for instructions, a watchable guided example, and passage practice. One passage is the default; a full four-passage section uses the same paragraph routine. The passage list starts with PT140 Section 4 Passage 2, Online Game Currencies, which also supplies the on-page demonstration. All 320 bank passages and 80 full sections are available in the list or its search.

The main page begins with the goal and three short instructions. “Let's start” focuses the passage list. The dedicated instructions route is `/reading-center/rc-recall/instructions`. There are no separate RC Practice navigation entries or source workout names in the introductory UI.

## What was verified locally

- Reading Centre suite: 785 tests passed across 43 files.
- Subsequent RC and routing suite: 646 tests passed across 18 files. This includes real-bank coverage of every single passage and complete section, plus verification that the demonstration text matches the recommended bank passage.
- Final navigation and runner checks: 61 tests passed across two files. Typecheck and the final production build passed, including the postbuild content-leak check. Receipts are retained locally alongside this report; runtime logs are not release source.
- Signed-in Codex browser: instructions route, return link, passage list, PT140 search, single/full-section switch, demonstration hide/reveal, and explicit unavailable-saving state.
- Measured browser widths: 390, 768, 1000 and 1440 CSS pixels. No horizontal overflow. Repeated start-link navigation focuses the passage-list heading with its top at approximately 90 pixels.
- Recorder regressions cover failed-start retry after a failed status write, preserving another recorder's work, device interruptions, interruption during stop, and preserving incomplete crash audio without reporting a complete upload.

The actual drill's save/resume/finalization flows have automated mocked-boundary coverage. Those tests do not establish production persistence.

## What is still blocked on production

Read-only backend probes on 2026-10-18 returned `PGRST205` for both `public.rc_recall_attempts` and `public.rc_recall_recaps`. A bucket probe returned `NoSuchBucket`; private-bucket authorization makes that result inconclusive on its own.

Apply both migrations, in order, through the authorized Lovable backend deployment route:

1. `20261016120000_rc_recall_attempts.sql`: tables, policies, immutability guards, private recordings.
2. `20261018180000_rc_recall_single_passage.sql`: one-or-four passage constraint and explicit authenticated SELECT/INSERT/UPDATE grants, still governed by RLS.

Then perform the signed-in acceptance matrix in `backend-acceptance.md`: create, silent completion, reload/resume, optional recording/upload/playback, retry, original-time finalization, and cross-account isolation. No production attempt or recording was created during this local verification.

No frontend merge or publication is claimed. A frontend publication must follow an authorized merge, matching Lovable's commit SHA and verifying the changed live asset.

## The video is a separate checked source project

The sibling `rc-training-demo` HyperFrames project contains a 60-second silent walkthrough in the LR Recall visual style. Runtime, layout and motion checks passed; contrast passed 101/101 checks, and its seven scenes were inspected in a contact sheet. Eight structural warnings concern keeping seven states on one stable stage.

The video has a local editable preview. MP4 rendering and embedding the encoded file await the required final-preview approval. The app's on-page watch/pause walkthrough already works independently of this encoding step.

The HyperFrames CLI unexpectedly refreshed global skill copies. The exact known paths and uncertainty about prior versions are recorded in that project's `docs/skill-refresh-side-effect.md`; no deletion or speculative restoration was attempted.
