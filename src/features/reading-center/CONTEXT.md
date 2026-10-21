# Reading Center

Speed-reading tool for general articles (not LSAT RC). Spec: ai-os
brainstorms/2026-10-12-reading-center-build-spec.md.

- lib/: pure logic (tokenize, timing, constants, types). No React, no Supabase. Unit tested.
- hooks/: data access (react-query) and the reading clock.
- components/: UI. components/modes/ holds one renderer per reading mode.
- pages/: route components (library, reader, stats, admin).

Word lists (next phase) will link to (passage_id, word_index). Word indexes come from
lib/tokenize.ts and must stay stable for a given passage body.
