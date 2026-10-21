# RC workflow implementation contract

Approved 2026-10-21. Implement locally; do not merge, push main, or deploy without separate approval.

One continuous Create → Configure → Review → Start experience. One primary landing action, Create your own RC drill, and a secondary Pick specific passages shortcut into the same builder's actual picker. Empty manual selections say Choose passages; nonempty selections say Edit selection. Automatic and manual methods preserve their existing applied drafts.

Configure exposes passage count or selected count, topic, difficulty, timing and answer timing. Specialized filters remain in a transactional drawer. Manual difficulty is a catalogue filter, not adaptive selection. Search distinguishes no catalogue match from a match excluded by active filters, and offers a filter adjustment action. Hidden selected passages remain selected and ordered.

Review shows the exact inspected passages, order, question count and timing/reveal conditions. Edit setup preserves selections and the inspected snapshot until relevant settings change. Returning to unchanged Review must not resample passages. Start is intentional and retains existing owner, pending-launch, protected-section, history, shortfall and exposure safeguards. Preview creates no session and no exposure unless the student explicitly reveals content.

Save exact passages and Save reusable settings remain distinct. Contextual saving stays accessible; full management belongs to the existing Saved sets destination. Preserve owner-scoped pending saves and retries.

Only positively classified RC assignments appear under Assigned RC work. Resolve subject from source metadata, canonical question/section mappings and content identities, never title substrings or generic activity modes. Missing/conflicting evidence stays unknown and accessible through My Work. The current PT21.S3 spoken-recall activity is LR based on canonical content and tests. Do not change generic/LR panels or RC Recall.

Visual contract: existing off-white host and flat dark working surface, compact proportions, readable labels, restrained borders, keyboard focus and reduced motion. Verify actual normal zoom, CSS viewport dimensions and viewport scale instead of compensating for reduced browser zoom. Test 320/390 mobile, 768 tablet, 1024 docked and 1440 desktop. Inspect landing, both methods, filters, exclusions, review/edit, drawer, contextual save, assignment classification, loading, empty, errors and protected launch/recovery. Run focused regression tests, typecheck and build, and report local-versus-live limits honestly.
