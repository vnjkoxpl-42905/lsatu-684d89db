# Coordinate the notes rail and reader entrance

## User direction and release boundary

On 2026-10-27 Joshua reported that opening a note introduces a sidebar with a broken, abrupt transition. He requested a more dramatic GSAP stagger reveal. This authorizes a local correction. Do not commit, push, merge or publish. The scheduled Claude follow-up must review this new scope as well as the earlier remediation in `my-work-scroll-filters-gemini-review.md`.

The charcoal and warm off-white palette, authored note content, permissions, read state and return behavior remain authoritative. Claude resumed review on 2026-10-28. Its first result requested corrections; final independent approval remains pending.

## Observed cause

The signed-in production page was inspected directly. Clicking a read teaching note changed the main stage's left edge from 280px to 600px in one sampled frame, with no intermediate stage geometry. The secondary notes rail contributes 320px of effective width. The persistent ClassroomLayout does not remount, but its conditional rail and destination/reader column modes change together. Existing generic reader entrances do not coordinate that layout change.

Before evidence: `C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027/note-reader-transition/live-open-before.json` and `live-reader-before.png`.

## Implementation direction

- Give note reader transitions one root-scoped GSAP owner in the persistent shell. Use stable stage and rail targets and explicit reader block markers.
- Preserve the last settled stage geometry. On archive-to-reader entry, invert the new stage with a transform, then animate to its final position. Do not tween width or continuously reflow text. Disable conflicting column geometry transitions only during the owned entrance and restore their normal behavior afterward. Archive mode keeps its immediate prelayout transform reset and geometry suppression so child anchor restoration cannot measure a moving ancestor.
- Sequence the secondary rail paper and visible rail entries with the reader date, title, standfirst and article. Use a clear, crisp stagger and a deliberate ease, with no text blur and no animation of the permanent main navigation. Keep the full entrance bounded to about 900ms.
- Note-to-note selection reveals only the reader content. Rapid route changes cancel and clean up the previous owned sequence. Delayed note content joins safely once it exists and must not replay on ordinary data refetches.
- Stage and rail choreography requires a matching confirmed note row or reader marker. A cached archive note can coordinate chrome before its body is ready. An unknown item keeps its existing loading geometry until confirmed; if the rail is already allocated, reveal only the newly confirmed reader instead of rewinding the page. A permission-delayed rail that mounts with confirmed note rows may still invert from its last settled edge. Non-note items receive no note-owned shell tween.
- Track in-place secondary rail changes and delayed permission readiness under the same route. Refresh settled geometry while idle; coordinate a late rail insertion without replaying an already visible rail or reader. Non-item navigation must not acquire a new stage tween.
- Apply the confirmed note reader boundary to interactive lesson notes as well as ordinary notes, preserving the iframe and its existing behavior. Non-note items retain their existing content behavior.
- Keep the reader out of the generic shared entrance so it has no competing tween owner. Preserve generic animation behavior elsewhere.
- A new note PUSH may reset the reader to the top before measurement. Do not animate scroll or interfere with POP/history restoration, archive anchors, keyboard focus recovery or read counts.
- Carry a validated archive origin through sidebar note selections. Back returns to the original archive row or nearest surviving filtered row, including its search/type/unread/page state. An unrelated reader with no explicit origin must not restore a stale archive anchor.
- At narrow widths, preserve existing navigation/flyout semantics and omit desktop rail/stage travel when no secondary rail is visible.
- Reduced motion must leave layout and all content immediately visible. Cleanup, focus, resize and unmount must never leave hidden controls or transformed content.

## Proof required before completion

1. Meaningful unit/integration tests for archive-to-reader, note-to-note, delayed content, rapid cancellation, unmount, reduced motion and generic-owner exclusion.
2. A local synthetic fixture using the production secondary notes rail/list and production stage geometry, with real GSAP. A fake archive-only sidebar does not prove this fix.
3. Record natural playback at desktop and phone widths, inspect saved screenshots, and sample stage positions and reader block opacity over time. The stage must have intermediate visual positions and finish untransformed, with no hidden reader blocks at rest.
4. Verify deep archive opening, note switching and Back: correct top positioning for new reader entry, preserved archive position/focus and read counts on return.
5. Run the earlier targeted My Work regression suites, typecheck, production build and scoped diff check. Preserve the unrelated backend edit.
6. After Claude quota resets, independently review this plan and inspect the final expanded change scope. Do not label the new implementation approved before that happens.
