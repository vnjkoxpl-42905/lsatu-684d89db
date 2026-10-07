# Conditional Bootcamp recovery, 2026-10-07

Recovered local checkout: C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp.
Git baseline: 67230dfae74a1466515d570fcb7b8a96ab5cb9c5, detached. Current main and its existing changes were not modified.

Source bundle: C:/Users/Joshu/dev/ai-os/brainstorms/2026-09-30-conditional-curriculum/claude-pacing-20261004.
All 45 files listed in input-hashes.json were copied from input/ and SHA256 verified. The four pacing overlays from authored.diff were applied. At the recovery checkpoint, all 43 unaffected input files and all four final authored files matched their recorded hashes, totaling 47 recovered files. See hash-verification.json. Later authorized lesson and drill changes are intentionally different from that historical recovery checkpoint.

The retained authored.diff had unprefixed blank separators between headers. A derived pacing-normalized.patch removes only unprefixed empty lines so git apply can read the patch. ConditionalReferenceSequence.tsx required restoration of its recorded CRLF line endings after patching; its SHA256 then matched exactly. Sources were not modified.

Coverage includes opening composition and shell, CSS, flashcards, reference and counterexample labs, preview route, application routes, assignments, progress, curriculum data, teacher controls and tests. AGENTS.md and CLAUDE.md remain the original files from the recorded Git baseline.

Limitations: the source bundle restores the documented local source build. Runtime dependencies and environment configuration require separate machine setup; they are excluded from the recovery source package. The final audit text remains missing. The handoff and surviving hot/log notes provide the six later corrections and Activity integration scope.

Following recovery, the authorized corrections, Activity integration and focused drill runners were implemented locally. The preview launcher now checks the complete app before starting, and the normal bootcamp gate redirects signed-out visitors to sign-in with the requested destination preserved. See preview-launch.md. Authenticated production persistence remains unverified. No commit, push, deployment, backend write or student assignment occurred.

Final verification on 2026-10-07 passed: 237 tests across 19 files in the serial broad run, plus 11 isolated library assignment tests, totaling 248 tests across 20 files. The launcher preflight completed the full app typecheck with exit 0. Direct Vite build passed with 7,160 modules in 1m16s; canonical-content exclusion checked 770 files with zero canonical matches. Scoped lint reported zero errors and ten existing Fast Refresh warnings. A prior concurrent aggregate run hit one 30-second timeout while build/typecheck competed for resources and RPC latency was elevated; the same full modules passed serially without assertion or timeout changes.

After a final summary-copy refinement, the eight mixed-runner tests passed again and the direct Vite build was regenerated: 7,160 modules in 48.53s, exit 0. Canonical exclusion again passed across 770 files. These eight overlap the previous 248 tests; the distinct test count remains 248 across 20 files.

The final local source is preserved in the vault at brainstorms/2026-09-30-conditional-curriculum/2026-10-07-opening-final-overlay: 31 overlay files, byte lengths and SHA256 manifest, a 65-file final source inventory, prerequisite restoration instructions and separately hashed verification evidence. The final summary component and its test were refreshed with stored-copy and source-hash checks after the latest verification. Generated banks remain exactly the recovered frozen inputs. Current main remains untouched.
