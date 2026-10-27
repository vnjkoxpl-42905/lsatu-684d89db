# Host dispositions, round 1

Accept CL-PLAN-01: plan item5 now explicitly specifies list-only wrapper policy, exclusion from both candidate animation and fallback descent, nested list discovery, and atomic removal of old marker guards. Composition tests cover all content states and a non-My-Work regression. Heading boundary stays unchanged; content no-blur assertions do not claim to cover that heading.

Accept CL-PLAN-02: filter suppression now ends at explicit pointer pagination, not boundary lifetime. notifyClassroomListIntent(element,'paginate') runs before pointer Load more updates shown; keyboard/input suppression remains immediate. Added pointer filter -> Load more acceptance. This preserves current and asynchronous filter updates as immediate without a fragile one-frame React timing assumption.

Accept CL-PLAN-03: plan defines a WeakMap registry per hook root and ancestor walk to first registered owner. It does not use portal event targets, class-only matching or bubbling events. Nested roots test required. Reduced-motion roots register a no-op boundary so helper cannot escape to an unrelated ancestor.

Please review the revised remediation plan. No code has been implemented. Existing app findings remain baseline defects to fix after plan approval; APPROVED would approve the remediation plan, not certify baseline source as fixed or production-ready.
