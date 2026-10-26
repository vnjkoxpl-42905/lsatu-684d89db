# Round 1 dispositions

All F1-F10 accepted with these implementation decisions:
F1 explicit My Work landing independent of tab ordering; pending/denied retain MyWorkGate.
F2 sanitized inert template extraction, memoized; browser proof of no side effects required.
F3 explicit archive URL keys and validated returnTo for both Back branches, legacy notebook IDs retained.
F4 shared current assignment projection; link-only fallback has no count; partial counts labelled.
F5 BrowserRouter retained; local control confirmations plus account-keyed session drafts preserve navigation/reload, beforeunload on tab departure; account save is separate.
F6 add shell tests and path-based tab assertions.
F7 retain existing month headings above threshold; created_at desc/id asc.
F8 preserve existing RLS/admin behavior; only student-shaped evidence validates student totals.
F9 audit questionLoader dependency then bank-free Notes entry if valid.
F10 restore note anchor or surviving neighbour on return from Unread.

Independent read-only recon also confirmed actual archive defect: classroom.css:5043-5057 hides StageIndexList at >=1280; ClassroomLayout.tsx:72-99 supplies no activeSection on /my-work/notes, so :1200-1204 supplies no archive side column. Plan now pins that evidence and a dedicated always-visible archive component without globally disturbing legacy layout. Please inspect these CSS/layout lines as part of round 2.

Current hook has no pagination; proposal now explicitly requires exhaustive stable retrieval before claiming full search/count coverage under server row caps. This is bounded client query work, no schema migration.

Please review revised exact plan. This is the SECOND AND FINAL Claude invocation within user budget. Report unresolved findings honestly. No tools to mutate project, no build authorization, no requirement for a finding quota.
