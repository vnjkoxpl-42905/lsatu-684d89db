# The LR question bank splits into a lightweight index plus per-section bodies

`public/data/_bank.generated.json` is 5.53 MB and is fetched, parsed, and indexed on every
page under `/*`, because `QuestionBankProvider` wraps that whole route subtree in
`src/App.tsx`. Measured on a cold load of `/classroom` — the student's home page, which
renders no LSAT questions at all — the browser pulls 5,527,682 bytes of question bank plus
one explanation sidecar per PrepTest, 5.68 MB across 26 requests. That is the app's
slowness, and the unified picker would have made it worse by putting a filterable list in
front of more students more often.

We are splitting it the way Reading Comprehension already works: a lightweight LR question
index (stem, PrepTest, section, type, reasoning type, features, difficulty — no stimulus, no
answer choices, no explanations) that every picker and list surface reads, plus full question
bodies fetched **per section** whenever a body field is actually required — a drill starting, the
preview drawer, the journal, flagged, or the second stage of a search. "Only when a drill starts"
would have been false the moment a list surface needed a stimulus. Per section, not per
PrepTest: the content already lives in 156 per-section files (`PT101-S2-LR.json`), and
inventing PT-grain bundles would mean a second normalization pipeline alongside the one
`questionLoader` already runs at runtime. RC proves the pattern in
this repo: `rc-index.json` (110 KB) and `rc-question-index.json` (536 KB) exist precisely
so `/rc/search` never loads a PrepTest file.

Consequences: `scripts/build-question-bank.mjs` gains an index output alongside the merged
bank, and must first restrict its source glob to `/^PT\d+-S\d+-LR\.json$/` so it cannot
re-ingest its own artifact on the next build; the normalization currently done at runtime in
`questionLoader` is extracted into one pure pipeline shared by index generation, body loading,
and the fallback; `questionLoader` grows a two-stage load with the index as the default and
bodies on demand; anything that reaches for a question body from a list surface (the preview drawer,
the journal, flagged) has to await a body fetch rather than reading it synchronously from
the singleton. The merged 5.5 MB file stays as the fallback path it already is, so a
missing or malformed index can never be the sole source of the pool.

Rejected: only scoping `QuestionBankProvider` to the routes that need it. Cheaper and
safer, and worth doing on its own, but the drill, journal, and flagged surfaces would still
each pay 5.5 MB on first visit.

## Amendment, 2026-08-17 — keyword search does not live in the index

`lrDrillFilters` searches stimulus and answer choices today, so the first revision of the
plan proposed putting them in the index. Codex sized that document at roughly 5.07 MB
uncompressed / 1.44 MB gzip, against the current bank's 5.53 MB / 1.47 MB — the index would
have *been* the bank, and this ADR would have bought nothing.

The index therefore stays genuinely lightweight: facets plus the question stem, nothing more.
Keyword search runs in two stages — the typed query matches stems from the index
immediately, and matching against stimulus and choices runs over the **already-filtered
result set** by loading those bodies on demand. A search with no facets selected searches
stems only, and says so in the UI. This trades instant full-corpus full-text search, which
the product never actually promised, for a first paint that does not ship the corpus.

The same rule binds RC: `RcIndexPassage` carries only `firstWords`, so passage-body search is
a second-stage read over the filtered set, not an index field.

The second stage is **bounded, not best-effort**. It runs only when the facet-narrowed candidate
set is within all three limits — candidate count, distinct body files, and total body bytes —
because a candidate count alone says nothing about how much gets downloaded. Above any limit the
search stays stem-only and says so in the UI. Without that rule "second-stage search" is just the
corpus download this ADR exists to prevent, arriving one query later.
