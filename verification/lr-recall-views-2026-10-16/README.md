# LR Recall view switching, 2026-10-16

Implements the confirmed interview design: retain the purple introduction and animation, swap the entire area to four complete written steps or the paused three-example player, preserve existing text under Read more, keep section choice available and restore the opening view with Back to home. Removes the marked tagline, aside, lower duplicates and comparison. Watch instructions is absent until a real full-instructions video exists. Section starts retain their behavior with clearer labels.

## Verification

- Focused Reading Center and launch/library tests: 148 passed.
- Broader component/Reading Center run: 475 passed, 14 failed. The exact same 14 failures reproduce in a clean pre-change checkout at 1c247a0c; see baseline-comparison.json. These concern unrelated ActivityIntro/ActivityItemView tests and are not marked fixed.
- Production build and postbuild content guard passed; scoped ESLint and staged whitespace checks passed. Safe-push typecheck and publication tracked separately in release.json.
- Browser matrix: home, instructions and examples at 320/600/768/1024/1440. Full-step-text measurements verify no clipping after fixing the inherited four-line clamp. Reduced-motion mode, paused playback, Example 3, media exit, disclosure and focus verified.
- No new attempt was started, no microphone/provider call was made, and no student account was impersonated. Saved report/attempt data and access scoping are unchanged.

The baseline checkout is retained at C:/Users/Joshu/dev/ai-os-projects/lsatu-lr-baseline-20261016. Generated MCP changes and verification artifacts were excluded from the app commit. Publication is not confirmed until release.json records live readback.
