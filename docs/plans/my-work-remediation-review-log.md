# My Work remediation: Claude review log

2026-10-27. User explicitly requested evaluating Gemini suggestions, Claude review, then implementation. Roles: Codex coordinator/builder; Claude Opus 5.5 Medium independent plan reviewer/fresh final inspector. Plan: docs/plans/my-work-scroll-filters-gemini-review.md. Budgets: five plan rounds, two inspections, two fix rounds. Inspection on. Local only; no commit/push/publish. Broad existing edits and unrelated MCP source modification are preserved. CLI run artifacts outside checkout in design/reviews/my-work-taste-v2-20261027/claude-remediation/.

Gemini disposition assessment: the five core suggestions are useful, with narrowed causal/severity claims documented in my-work-scroll-filters-gemini-dispositions.md. In particular the target measurement-offset claim is not established because focusin settles it synchronously. The accepted return fix concerns surrounding rows. A loading paragraph's excluded motion attributes are harmless, while blurred parent fallback conflicts with the crisp brief. Scope is these defects, not a redesign.

## Plan round 1: REVISE

Result: C:\Users\Joshu\dev\ai-os\design\reviews\my-work-taste-v2-20261027\claude-remediation\claudex-bxzvu21b\result.json

```json
{
  "status": "completed",
  "mode": "review",
  "provider": "claude",
  "roles": {
    "host": "codex",
    "planner": "codex",
    "reviewer": "claude",
    "builder": "codex",
    "inspector": "claude"
  },
  "repo": "C:\\Users\\Joshu\\dev\\ai-os-projects\\lsatu-my-work-20261026",
  "plan": "C:\\Users\\Joshu\\dev\\ai-os-projects\\lsatu-my-work-20261026\\docs\\plans\\my-work-scroll-filters-gemini-review.md",
  "plan_sha256": "052e5a453a050f55f64dc9e0b62f53640a726e141de8c2d90447ddb8811b34c5",
  "requested_model": "claude-opus-5-5",
  "requested_effort": "medium",
  "base": null,
  "snapshot": null,
  "previous": null,
  "started_at": 1793130765.81296,
  "artifacts": "C:\\Users\\Joshu\\dev\\ai-os\\design\\reviews\\my-work-taste-v2-20261027\\claude-remediation\\claudex-bxzvu21b",
  "cli_version": "2.1.309 (Claude Code)",
  "executable": [
    "C:\\Users\\Joshu\\.local\\bin\\claude.EXE"
  ],
  "exit_code": 0,
  "session_id": "39d662c3-f582-4e64-a938-4c4121603717",
  "response": {
    "verdict": "REVISE",
    "summary": "The plan correctly addresses the four motion and filter gaps Argon High found. I confirmed each one in the source: (1) pointer and portal filter clicks never set `listInteraction`; (2) rows visible on first render use a per-group delay index, `Math.min(index*.05,.15)`; (3) restoring the archive anchor settles only the focused row; (4) `subjects`/`kinds` are built from the currently visible rows. Two parts of the plan still need tightening before implementation. First, remediation item 5 rests on a wrong reading of how the blur reaches My Work. The \"redundant\" `data-motion-item` markers are what keep the `data-motion-enter` content wrapper in `StudentDestination` from being picked. Removing them as written would blur the whole My Work content, including the loading state that is crisp today. Second, item 1 makes filter intent last for the whole boundary lifetime. That conflicts with the plan's own \"pagination is not filter intent\" rule and the earlier MW-MOTION-01 decision, because the boundary key covers only the pathname. One lower-severity gap: the plan doesn't say how the boundary is found or delivered. The other areas (date semantics, scroll owner, return timing, access filtering before matching) look sound at plan level.",
    "findings": [
      {
        "id": "CL-PLAN-01",
        "severity": "medium",
        "path": "src/pages/StudentDestination.tsx:97; src/hooks/useClassroomMotion.ts:107-127; src/pages/MyWorkPage.tsx:17,52,61",
        "evidence": "The blur on My Work's non-list states mostly doesn't come from the line 109 fallback. It comes from the wrapper `<div data-motion-enter=\"\" className=\"student-destination-content\">` (StudentDestination.tsx:97), which matches the hook's selector. That wrapper is dropped only by `candidates.filter(element => !element.querySelector('[data-motion-item]'))` (useClassroomMotion.ts:122). Today the permissions/feed loading `<p data-motion-item role=\"status\">` and the outer `<section data-motion-item>` are what stop the wrapper from being chosen. The loading p is itself ineligible because of `[role=\"status\"]`, so the loading state is currently crisp. Item 5 says to remove these markers. If that happens, the wrapper becomes eligible and gets the full CLASSROOM_REVEAL (14px, blur 10px) during loading, empty, error and no-match states. That is a regression of the currently crisp loading state. The Teaching notes loading/empty/error states and Personal notes already hit this path, because TeachingNotesArchive and StudentNotesSection put no `data-motion-item` outside their rows. If the wrapper attribute were removed while no candidates remain, the line 109-116 fallback would walk root → .student-destination → the content div (header is local, nav is skipped) and blur its children. The disposition's premise that the 'dead loading markers are harmless' is therefore wrong: the markers do real work. Existing MyWorkPage tests render the page without the shared hook and StudentDestination, so they cannot catch this.",
        "fix": "Rewrite item 5 around this mechanism. For destination 'my-work', give the content wrapper an explicit list-only/crisp policy that the hook honours. For example, the hook could skip any `[data-motion-enter]` element carrying that policy as a candidate and stop the fallback descent at it, while still finding nested `[data-motion-list] [data-motion-item]` rows. Remove the loading/outer-section markers only after that policy exists. Add hook-composition tests that render StudentDestination + ClassroomMotionContent (or a DOM equivalent) for: assigned loading, error, empty and no-match; notes loading, error and empty; Personal notes. Each test should assert that no element gets a blur filter or y-offset. Add a regression test that a non-My-Work destination still enters through its wrapper."
      },
      {
        "id": "CL-PLAN-02",
        "severity": "medium",
        "path": "src/hooks/useClassroomMotion.ts:14-24,130,193-198; plan item 1",
        "evidence": "Item 1 says that after filter intent, 'newly discovered filter results are visible immediately for that boundary lifetime', which is the same sticky behaviour as `listInteraction`. `classroomMotionKey('/my-work/notes', '?filter=unread')` returns only the pathname, so the boundary survives every q/filter/type/shown change. After one pointer click on Unread or one Type choice, any later Load more rows hit `if (list && listInteraction)` and appear instantly. That contradicts the plan's 'Pagination is not filter intent' and disposition MW-MOTION-01 ('Do not suppress Load more's requested reveal as though pagination were a filter'). The test list only asks for 'unfiltered Load more', so this conflict would go untested.",
        "fix": "Pick one behaviour and state it. Recommended: make filter intent one-shot. It settles current list records and pending entries, and marks as immediate only the rows discovered in the commit caused by that update (e.g. a flag cleared on the next animation frame after the resulting MutationObserver discover, or on the next explicit pagination action). Load more after filtering then animates again. Keep the existing sticky keyboard/input behaviour if desired. Add a test: pointer Unread → Load more → the new rows are queued in the batch scheduler. If sticky behaviour is intended instead, amend the plan and dispositions to say that Load more after any filter is immediate."
      },
      {
        "id": "CL-PLAN-03",
        "severity": "low",
        "path": "src/components/classroom/shell/ClassroomMotionContent.tsx:10; src/features/reading-center/components/AppShell.tsx:214; src/pages/StudentDestination.tsx:76; plan item 1",
        "evidence": "The plan says the helper 'finds the nearest owning classroom-motion boundary' but gives no rule. My Work content is owned by ClassroomMotionContent's `display: contents` div, which has class `classroom-motion-root` but not `classroom-motion-local`. The StudentDestination header is a `classroom-motion-local` owned by a different hook instance. The Reading Center AppShell and teacher shells carry both classes. A helper keyed on `.classroom-motion-local` would miss the My Work owner. A bubbling DOM event with no propagation stop would let every ancestor hook root that listens set its own filter state. That breaks the requirement that only the owning boundary settles.",
        "fix": "State the mechanism. Either resolve with `pageRef.current.closest('.classroom-motion-root')` and dispatch on that element only, or have each hook instance register its root in a module WeakMap/set and walk ancestors to the first registered root. The handling hook should stop propagation. Add a nested-roots test where the inner boundary settles and the outer boundary's lists keep animating, plus a test that a signal from a portaled Select callback using the page ref reaches the My Work owner."
      }
    ],
    "coverage": [
      "Plan file and docs/plans/my-work-scroll-filters-gemini-dispositions.md read in full",
      "src/hooks/useClassroomMotion.ts read in full (selection, eligibility, fallback, list batch scheduler, listInteraction, interact, cleanup)",
      "src/components/classroom/shell/ClassroomMotionContent.tsx and ClassroomLayout.tsx mount sites (lines 1195-1234)",
      "src/pages/StudentDestination.tsx read in full (local header boundary, data-motion-enter content wrapper)",
      "grep of all useClassroomMotion callers and classroom-motion-local owners (Reading Center AppShell, TeacherWorkspaceShell, StudentDossier, TeacherSmartboard)",
[REDACTED CREDENTIAL]
      "src/components/my-work/TeachingNotesArchive.tsx read in full (update/Clear filters/Load more, restoration effect, month grouping)",
      "src/pages/MyWorkNotesPage.tsx read in full (Personal notes markup)",
      "src/components/my-work/WorkFilterSelect.tsx, assignedWorkOrganization.ts, teachingNoteDates.ts read",
      "src/hooks/useNotesArchiveScroll.ts read; classroom.css .classroom-stage checked to confirm the window is the scroll owner",
      "src/hooks/useAssignedTodoFeed.ts lines 90-309 (row kinds, sourceTable, workSection, loading contract)",
      "Existence of the proposed test files confirmed by glob; PrescribedWeek has no motion markers"
    ],
    "limitations": [
      "Read-only static review; no tests, typecheck, build or browser were run, and no host-reported results are treated as verified.",
      "I did not open the screenshots or JSON traces in C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027/, so I made no visual judgement.",
      "I did not read the test files (useClassroomMotion.test.tsx, TeachingNotesArchive.test.tsx, the MyWorkPage tests), the CSS files, select.tsx, useNotesSelectMotion.ts, teachingNotesArchiveData.ts or the verification preview scripts in detail.",
      "I did not check whether the Reading Center AppShell actually renders My Work routes; CL-PLAN-03 is stated conditionally.",
      "React passive-effect ordering on POP navigation versus MutationObserver discovery was worked out from React's scheduling semantics, not exercised.",
      "The broader dirty checkout, including supabase/functions/mcp/index.ts, was not reviewed."
    ]
  },
  "usage": {
    "input_tokens": 24,
    "cache_creation_input_tokens": 54961,
    "cache_read_input_tokens": 428075,
    "output_tokens": 19078,
    "output_tokens_details": {
      "thinking_tokens": 13192
    },
    "server_tool_use": {
      "web_search_requests": 0,
      "web_fetch_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 54961,
      "ephemeral_5m_input_tokens": 0
    },
    "inference_geo": "global",
    "iterations": [
      {
        "input_tokens": 2,
        "output_tokens": 7444,
        "cache_read_input_tokens": 58022,
        "cache_creation_input_tokens": 524,
        "cache_creation": {
          "ephemeral_5m_input_tokens": 0,
          "ephemeral_1h_input_tokens": 524
        },
        "type": "message"
      }
    ],
    "speed": "standard",
    "fallback_credit": null
  },
  "observed_models": [
    "claude-opus-5-5"
  ],
  "permission_denials": [],
  "total_cost_usd": 0.906959,
  "elapsed_seconds": 200.6
}
```

Host dispositions: Accept CL-PLAN-01/02/03. Rewrote item5 for explicit list-only policy with fallback exclusion before marker removal; corrected lifetime filter suppression to reset on explicit pointer pagination; fixed owner resolution to first registered WeakMap ancestor. No app edits.

## Plan round 2: APPROVED

Result: C:\Users\Joshu\dev\ai-os\design\reviews\my-work-taste-v2-20261027\claude-remediation\claudex-671kuvtg\result.json

```json
{
  "status": "completed",
  "mode": "review",
  "provider": "claude",
  "roles": {
    "host": "codex",
    "planner": "codex",
    "reviewer": "claude",
    "builder": "codex",
    "inspector": "claude"
  },
  "repo": "C:\\Users\\Joshu\\dev\\ai-os-projects\\lsatu-my-work-20261026",
  "plan": "C:\\Users\\Joshu\\dev\\ai-os-projects\\lsatu-my-work-20261026\\docs\\plans\\my-work-scroll-filters-gemini-review.md",
  "plan_sha256": "a835d7b16a0fa6dde6e6aab94a53a458bcbd8fa01b71fe29d9b85750aa29bf3c",
  "requested_model": "claude-opus-5-5",
  "requested_effort": "medium",
  "base": null,
  "snapshot": null,
  "previous": "C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027/claude-remediation/claudex-bxzvu21b/result.json",
  "started_at": 1793131128.0715284,
  "artifacts": "C:\\Users\\Joshu\\dev\\ai-os\\design\\reviews\\my-work-taste-v2-20261027\\claude-remediation\\claudex-671kuvtg",
  "cli_version": "2.1.309 (Claude Code)",
  "executable": [
    "C:\\Users\\Joshu\\.local\\bin\\claude.EXE"
  ],
  "exit_code": 0,
  "session_id": "39d662c3-f582-4e64-a938-4c4121603717",
  "response": {
    "verdict": "APPROVED",
    "summary": "I'm approving this revised plan; this is not certification of the current code or of production behaviour. All three round-1 findings are resolved in the plan text. CL-PLAN-01: item 5 now covers how the content wrapper and the fallback both get picked, and removes the old markers only together with the new list-only policy. CL-PLAN-02: filter suppression now ends at the next pointer Load more instead of lasting the whole boundary lifetime, with a test for filter then Load more. CL-PLAN-03: a WeakMap of registered hooks is walked from the page ref to the first owner, with no bubbling or class-only lookup, and a nested-owner test is required. I checked the revision against the routes. /my-work/to-do, /completed and /notes all render inside StudentDestination, so a wrapper policy there reaches every My Work content state, including the MyWorkGate and ProtectedRoute states. The only owner for that content is the ClassroomMotionContent root, and the header uses its own hook, so the ancestor walk resolves correctly. Items 2\u20134 are unchanged and still match the source. One low-severity point is left: the plan doesn't say whether the existing permanent keyboard/input flag survives pointer Load more. I'm not counting it as material because the plan intentionally keeps keyboard and typed-search settling immediate.",
    "findings": [
      {
        "id": "CL-PLAN-04",
        "severity": "low",
        "path": "src/hooks/useClassroomMotion.ts:62,130,193-198; plan item 1",
        "evidence": "The pre-existing `listInteraction` flag is set by any keydown, input or change event inside the root (line 198) and is never cleared. On /my-work/notes, typing in search fires `input`, and so does clearing the native search box. Pressing Tab from the search field fires keydown. In both cases the flag is set for the rest of the pathname-keyed boundary lifetime. Item 1 says pointer paginate clears only the new filter suppression, and that 'keyboard/input sticky settlement remains immediate'. So a mouse user who types one search and then clicks Load more never sees the reveal. The acceptance list only covers pointer Unread/type followed by Load more.",
        "fix": "Write the intended behaviour into the plan. Either (a) pointer paginate also clears the keyboard/input flag, so newly added rows are revealed, while keyboard Load more (event.detail === 0) stays immediate; or (b) keep it sticky and record that, once a student has typed a search, Load more appears without a reveal. With (a), add the test: type a search \u2192 pointer Load more \u2192 new rows are queued in the batch scheduler."
      }
    ],
    "coverage": [
      "Revised plan read in full and compared with round-1 findings CL-PLAN-01/02/03 and the host's dispositions",
      "src/hooks/useClassroomMotion.ts re-checked from the round-1 read: early returns, 300 ms window, `listInteraction` listeners, fallback descent, candidate filters",
      "src/App.tsx:600-644: /my-work routes (to-do, completed, notes) all render under StudentDestination destination=\"my-work\" with MyWorkGate/ProtectedRoute children",
      "Grep of MyWorkPage, MyWorkNotesPage and TeachingNotesArchive usages: no other mount sites",
      "From the round-1 reads: StudentDestination.tsx (local header boundary, data-motion-enter wrapper), ClassroomMotionContent.tsx, ClassroomLayout.tsx mount sites, MyWorkPage.tsx, TeachingNotesArchive.tsx, MyWorkNotesPage.tsx, WorkFilterSelect.tsx, assignedWorkOrganization.ts, teachingNoteDates.ts, useNotesArchiveScroll.ts, useAssignedTodoFeed.ts row contract"
    ],
    "limitations": [
      "This was a static, read-only review of the plan. No code is implemented yet; I ran no tests, typecheck, build or browser.",
      "I did not open the design screenshots or JSON traces in C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027/, so I made no visual judgement.",
      "I did not read the test files, CSS, select.tsx, useNotesSelectMotion.ts, teachingNotesArchiveData.ts, MyWorkGate or the preview harness in detail.",
      "Approval covers the remediation plan only. The baseline defects are still present in the source until the plan is implemented and inspected again.",
      "The broader dirty checkout, including supabase/functions/mcp/index.ts, was not reviewed."
    ]
  },
  "usage": {
    "input_tokens": 8,
    "cache_creation_input_tokens": 17007,
    "cache_read_input_tokens": 204260,
    "output_tokens": 4908,
    "output_tokens_details": {
      "thinking_tokens": 2920
    },
    "server_tool_use": {
      "web_search_requests": 0,
      "web_fetch_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 17007,
      "ephemeral_5m_input_tokens": 0
    },
    "inference_geo": "global",
    "iterations": [
      {
        "input_tokens": 2,
        "output_tokens": 3030,
        "cache_read_input_tokens": 74049,
        "cache_creation_input_tokens": 1504,
        "cache_creation": {
          "ephemeral_5m_input_tokens": 0,
          "ephemeral_1h_input_tokens": 1504
        },
        "type": "message"
      }
    ],
    "speed": "standard",
    "fallback_credit": null
  },
  "observed_models": [
    "claude-opus-5-5"
  ],
  "permission_denials": [],
  "total_cost_usd": 1.182059,
  "elapsed_seconds": 58.27
}
```

CL-PLAN-04 disposition: retain option(b), as the approved item1 already says keyboard/input sticky settlement remains immediate. After typing/search or keyboard navigation, new rows stay immediate for this pathname lifetime, including later pointer Load more. Pointer-only filter -> pointer Load more can reveal. This is a conscious fast-reading tradeoff, not a claim that every modality always animates. Plan hash remains unchanged. One failed resume command used a feedback path relative to the vault; corrected to absolute before completed round2. No approval inferred from that invocation.

Pre-build HEAD e4035d9c8ec97a3aaec01b0b3464533872328bc8. Exact selected pre-edit bytes/hashes are outside the checkout in claude-remediation/before/manifest.json.

## Inspection 1: REVISE; fix round 1

Result: C:\Users\Joshu\dev\ai-os\design\reviews\my-work-taste-v2-20261027\claude-remediation\claudex-s_5nm9_u\result.json

```json
{
  "status": "completed",
  "mode": "inspect",
  "provider": "claude",
  "roles": {
    "host": "codex",
    "planner": "codex",
    "reviewer": "claude",
    "builder": "codex",
    "inspector": "claude"
  },
  "repo": "C:\\Users\\Joshu\\dev\\ai-os-projects\\lsatu-my-work-20261026",
  "plan": "C:\\Users\\Joshu\\dev\\ai-os-projects\\lsatu-my-work-20261026\\docs\\plans\\my-work-scroll-filters-gemini-review.md",
  "plan_sha256": "a835d7b16a0fa6dde6e6aab94a53a458bcbd8fa01b71fe29d9b85750aa29bf3c",
  "requested_model": "claude-opus-5-5",
  "requested_effort": "medium",
  "base": "e4035d9c8ec97a3aaec01b0b3464533872328bc8",
  "snapshot": {
    "base": "e4035d9c8ec97a3aaec01b0b3464533872328bc8",
    "files": [
      {
        "path": "docs/verification/platform-motion-20261022.md",
        "kind": "file",
        "sha256": "06edf672ef79ccf5db7d12adabd15eb14502b584b24c3ef9db8e5abfb64e4412"
      },
      {
        "path": "scripts/verification/my-work-preview.tsx",
        "kind": "file",
        "sha256": "f62e6757ddb02347a48727138edc6541bc96e1d2c7a0dd2fb2bf8dc1ef9461a9"
      },
      {
        "path": "scripts/verification/start-my-work-preview.mjs",
        "kind": "file",
        "sha256": "c86132a8a69513fe6d8b47b26c0af9f4541fc8ab2929997a7e98024b66110132"
      },
      {
        "path": "src/components/classroom/ClassroomRouteViews.tsx",
        "kind": "file",
        "sha256": "290b30c7248cdc75e2a5ca811228a1fbdee66b3683c549e55d4ed5e3bf7b8d30"
      },
      {
        "path": "src/components/my-work/TeachingNotesArchive.test.tsx",
        "kind": "file",
        "sha256": "de9d4666e24c91d8f85d56ee56cb1b0cac28fe9b28f6fe4946324938d57a3b36"
      },
      {
        "path": "src/components/my-work/TeachingNotesArchive.tsx",
        "kind": "file",
        "sha256": "cf0030f08ecd804e0a9f51e31b5d771cfbe15f3e8456a5f95c45b3139303b399"
      },
      {
        "path": "src/components/my-work/WorkFilterSelect.tsx",
        "kind": "file",
        "sha256": "18526e161143be4629f5b5de02bbb91e961e99048fa34430fc19a8972a0b88b1"
      },
      {
        "path": "src/components/my-work/assignedWorkOrganization.ts",
        "kind": "file",
        "sha256": "0454ff47d5cd15157b2b717d0433970ae3cb7409d4392a82900ab5b722934fed"
      },
      {
        "path": "src/components/my-work/teachingNoteDates.test.ts",
        "kind": "file",
        "sha256": "6a75174b4bb3be831ac046660875a4cdbb45157b6004d9e6d1699d3ad5dadabd"
      },
      {
        "path": "src/components/my-work/teachingNoteDates.ts",
        "kind": "file",
        "sha256": "7e065252a3d943835ce3cc8e8594c12e29a84ea5301e47202eefc2d9a580d9c1"
      },
      {
        "path": "src/hooks/useClassroomMotion.test.tsx",
        "kind": "file",
        "sha256": "450879934abe21816c1af803d0e5d599fa77f377ca2cb4c1f7c00e7affe18265"
      },
      {
        "path": "src/hooks/useClassroomMotion.ts",
        "kind": "file",
        "sha256": "b4502fb3e382d27e42ce61fbdb267d5e6da89852fbd25d92566a73aa4cd9e388"
      },
      {
        "path": "src/hooks/useNotesArchiveScroll.test.ts",
        "kind": "file",
        "sha256": "3916c8525fffeb504427614c9282127c9c3081cbf5183fd4de6fa91b9c6fdb9d"
      },
      {
        "path": "src/hooks/useNotesArchiveScroll.ts",
        "kind": "file",
        "sha256": "9249bd891d54f1c17dec3c81ccfa02a750bed0e872a6dd13345a8e4c5e436cff"
      },
      {
        "path": "src/hooks/useNotesSelectMotion.ts",
        "kind": "file",
        "sha256": "8ffbbde6358a34638ff4df937496e537ba66037c302b486ed1c0462711fec0aa"
      },
      {
        "path": "src/pages/MyWorkNotesPage.tsx",
        "kind": "file",
        "sha256": "52bd7e593540d0539e74c5e9ecdf24ec52abeb0e960dc69a65101a85aaecdec9"
      },
      {
        "path": "src/pages/MyWorkPage.organization.test.tsx",
        "kind": "file",
        "sha256": "8f2f80a0e10345ff70151d42d668fae9be8383dccff0caac312e2178a9f653bd"
      },
      {
        "path": "src/pages/MyWorkPage.readingCenter.test.tsx",
        "kind": "file",
        "sha256": "838707bcba41e811b6adc38333b480eca060868781c8188a8ba634ea18e39082"
      },
      {
        "path": "src/pages/MyWorkPage.tsx",
        "kind": "file",
        "sha256": "2706b350ea3dba84de209f8b6f0b37ea6b1a408e3b1466c8f70a06ce3d22f884"
      },
      {
        "path": "src/pages/StudentDestination.test.tsx",
        "kind": "file",
        "sha256": "e2a663fcbc111c5f97548609f388508d4785e86785a526490ac0b722c300febf"
      },
      {
        "path": "src/pages/StudentDestination.tsx",
        "kind": "file",
        "sha256": "4c9fc2666e54a0fc5122f3fd6e2399d6926294be31f84a04d61ca1fefccc8bf7"
      },
      {
        "path": "src/pages/myWorkNotesRefinement.css",
        "kind": "file",
        "sha256": "97ab44a311fb41718ac53b658090f1b2719c6d0023245c6bce92532149263b0c"
      },
      {
        "path": "src/pages/myWorkOrganization.css",
        "kind": "file",
        "sha256": "bac50ff36ca390d8db7e4f02e4678ccd48ea45475cc0a95a1b22498b6aefdb12"
      }
    ],
    "diff_sha256": "042a9ed9a422256ad6440e663d049ec3887467fe9b25227bef36f01724f993dc",
    "scope": [
      "docs/verification/platform-motion-20261022.md",
      "scripts/verification/my-work-preview.tsx",
      "scripts/verification/start-my-work-preview.mjs",
      "src/components/classroom/ClassroomRouteViews.tsx",
      "src/components/my-work",
      "src/hooks/useClassroomMotion.test.tsx",
      "src/hooks/useClassroomMotion.ts",
      "src/hooks/useNotesArchiveScroll.test.ts",
      "src/hooks/useNotesArchiveScroll.ts",
      "src/hooks/useNotesSelectMotion.ts",
      "src/pages/MyWorkNotesPage.tsx",
      "src/pages/MyWorkPage.organization.test.tsx",
      "src/pages/MyWorkPage.readingCenter.test.tsx",
      "src/pages/MyWorkPage.refetch.test.tsx",
      "src/pages/MyWorkPage.tsx",
      "src/pages/StudentDestination.test.tsx",
      "src/pages/StudentDestination.tsx",
      "src/pages/myWorkNotes.css",
      "src/pages/myWorkNotesRefinement.css",
      "src/pages/myWorkOrganization.css"
    ],
    "sha256": "7be050f531c17db80057eb81418e27fa2c922469d99e88e879829f24b759f382"
  },
  "previous": null,
  "started_at": 1793132013.1689079,
  "artifacts": "C:\\Users\\Joshu\\dev\\ai-os\\design\\reviews\\my-work-taste-v2-20261027\\claude-remediation\\claudex-s_5nm9_u",
  "scope": [
    "docs/verification/platform-motion-20261022.md",
    "scripts/verification/my-work-preview.tsx",
    "scripts/verification/start-my-work-preview.mjs",
    "src/components/classroom/ClassroomRouteViews.tsx",
    "src/components/my-work",
    "src/hooks/useClassroomMotion.test.tsx",
    "src/hooks/useClassroomMotion.ts",
    "src/hooks/useNotesArchiveScroll.test.ts",
    "src/hooks/useNotesArchiveScroll.ts",
    "src/hooks/useNotesSelectMotion.ts",
    "src/pages/MyWorkNotesPage.tsx",
    "src/pages/MyWorkPage.organization.test.tsx",
    "src/pages/MyWorkPage.readingCenter.test.tsx",
    "src/pages/MyWorkPage.refetch.test.tsx",
    "src/pages/MyWorkPage.tsx",
    "src/pages/StudentDestination.test.tsx",
    "src/pages/StudentDestination.tsx",
    "src/pages/myWorkNotes.css",
    "src/pages/myWorkNotesRefinement.css",
    "src/pages/myWorkOrganization.css"
  ],
  "cli_version": "2.1.309 (Claude Code)",
  "executable": [
    "C:\\Users\\Joshu\\.local\\bin\\claude.EXE"
  ],
  "exit_code": 0,
  "session_id": "8ba50c03-e966-4643-a4bc-148eaceac471",
  "response": {
    "verdict": "REVISE",
    "summary": "Most of the remediation matches the plan. The shared hook registers an owner per root in a WeakMap (reduced-motion roots included), and notifyClassroomListIntent stops at the first ancestor owner. The heading's local owner is a sibling of the content, not an ancestor, so a notes or assigned-work intent reaches the ClassroomMotionContent owner. All list rows join one paused, DOM-ordered rAF batch with step=min(.05,.15/(n-1)). Filter, restore and keyboard interactions settle current and queued rows. Pointer paginate re-enables reveals unless a keyboard interaction already made settlement sticky. The motion key uses only the pathname, so filter URL changes cannot re-key the hook and replay rows. The list-only policy plus the eligible() change stops generic fallback from animating My Work content states. Subject and kind validity no longer depends on loaded rows, and options and counts come from rows after access filtering. Month keys and labels use one local-calendar helper. One concrete keyboard focus defect remains in the new assigned-work selects: the notes archive has a fix for it, My Work does not. There are also smaller issues: an unplanned shared-hook behaviour change, a possible one-frame hide on browser Back, and missing integration coverage.",
    "findings": [
      {
        "id": "MW-FOCUS-1",
        "severity": "medium",
        "path": "src/pages/MyWorkPage.tsx (my-work-list-controls: `(kinds.length > 1 || Boolean(kind)) && <WorkFilterSelect \u2026>` and the matching subject condition); src/components/my-work/WorkFilterSelect.tsx",
        "evidence": "Scenario: every to-do row is a Guided drill and the URL has ?kind=Activity, which is valid but has no rows (the case the plan explicitly preserves). A keyboard user opens 'Assignment type' and chooses 'All work types'. updateFilter clears kind, so `kinds.length` is 1 and `kind` is empty, and the whole WorkFilterSelect unmounts. Radix tries to return focus to a trigger that no longer exists, so focus falls to <body>. The same happens with a valid absent ?subject=. TeachingNotesArchive handles this exact case with recoverTypeFocus/searchRef, and its test 'returns keyboard focus to search when choosing All types removes the selector' covers it. MyWorkPage has no equivalent, and no My Work test checks focus after clearing an absent filter. Impact: keyboard and screen-reader users lose their place and must Tab again from the top of the document.",
        "fix": "Use the same pattern as the notes archive. In MyWorkList, keep a ref to the search input. Before onChange('') from a WorkFilterSelect, record whether focus is inside that select's trigger or content (pass a callback or have WorkFilterSelect report it). In an effect that runs when the select stops rendering, focus the search input. Add organization tests for kind and subject: valid absent value \u2192 keyboard 'All \u2026' \u2192 selector removed \u2192 search box has focus."
      },
      {
        "id": "MOTION-SHARED-1",
        "severity": "low",
        "path": "src/hooks/useClassroomMotion.ts:138 (`records.filter(record => record.element.querySelector('[data-motion-item]')).forEach(settle)`)",
        "evidence": "This new line runs on every discover() for every caller of the shared hook: ClassroomMotionContent on all classroom routes, TeacherWorkspaceShell, the Reading Center AppShell, StudentDossier and TeacherSmartboard. It is not limited to data-motion-list or the My Work policy. Example: on a non-My-Work destination, `.student-destination-content[data-motion-enter]` (still generic, as the plan requires) starts its 300ms blur entrance. A lazy outlet then mounts data-motion-item children about 100ms in. The wrapper snaps to progress(1), and its new children are then set to opacity 0/blur and re-enter. Content can show at partial opacity, disappear and fade back in, which is the 'readiness blinking' class an earlier round asked to remove. The plan says to preserve default non-list behaviour and does not authorize this change. Only one test covers it, and that test uses a list child.",
        "fix": "Limit the settle to the case the plan needs: settle only when the newly discovered descendants are data-motion-list rows, or when the record is inside a list-only policy. Otherwise keep the previous behaviour, where a running wrapper finishes and its children are excluded or capped. If the broader change is intended, add a test for a non-My-Work destination wrapper that receives non-list items mid-tween and record the decision in the plan."
      },
      {
        "id": "MOTION-RESTORE-1",
        "severity": "low",
        "path": "src/components/my-work/TeachingNotesArchive.tsx:58-72 (restore in useEffect) with src/hooks/useClassroomMotion.ts:174-185",
        "evidence": "When the route changes back to /my-work/notes, the shell's layout effect runs discover(true) first. fromTo with immediateRender sets every in-view list row to opacity 0 and y 8, paused, and queues the rows for the next rAF. The restore intent only arrives later, in the archive's passive useEffect. After a discrete click on 'Back to notes', React flushes passive effects synchronously, so nothing paints hidden. After browser Back (POP, which the code handles explicitly through navigationType), passive effects are not guaranteed to run before paint. The rows around the anchor can therefore paint invisible for a frame before restore settles them. The plan asks for restore to settle rows 'before archive anchor focus/scroll restoration'. That ordering holds, but rows can still flash hidden on POP. Separately, if the notes query refetches on return, the MutationObserver microtask can create hidden tweens before the passive restore runs.",
        "fix": "Send the restore intent from a useLayoutEffect, or from a layout-phase check that only reads the stored anchor, so settlement happens in the same commit as discovery. Alternatively, have the hook check a synchronous 'pending restore' marker on the owner root before creating list tweens. Add a test that renders the real hook plus the archive with a stored anchor and asserts that no row has opacity 0 after the first commit."
      },
      {
        "id": "COVERAGE-1",
        "severity": "low",
        "path": "src/components/my-work/TeachingNotesArchive.test.tsx; src/pages/MyWorkPage.organization.test.tsx",
        "evidence": "Both suites mock '@/hooks/useClassroomMotion', so notifyClassroomListIntent is a spy. They prove the call order (intent before the URL changes) but not that archiveRef or sectionRef resolves to the real ClassroomMotionContent owner rather than the StudentDestination heading owner. They also do not test the plan's required end-to-end sequence 'pointer Unread/type -> Load more reveals newly surfaced rows' with the real hook. The hook suite covers that sequence only with hand-built DOM, and its StudentDestination composition test renders a placeholder <p>, not TeachingNotesArchive or MyWorkList.",
        "fix": "Add one composition test that mounts ClassroomMotionContent > StudentDestination(my-work) > TeachingNotesArchive with the real hook and the GSAP mock. Pointer-click Unread and assert that existing row tweens reach progress(1) and that new identities create no tweens. Then pointer-click Load more and assert that the new rows create paused list tweens, which restart in DOM order. Do the same for MyWorkList with a WorkFilterSelect pointer choice."
      },
      {
        "id": "DATE-A11Y-1",
        "severity": "low",
        "path": "src/components/my-work/TeachingNotesArchive.tsx card() aria-label",
        "evidence": "The visible text now reads 'Shared Oct 3, 2026', and the <time> has title 'Date shared'. But the Link's aria-label replaces its contents for assistive technology and still says only `${dateLabel(note.created_at)}`. Screen-reader users hear a bare date on a session recap, which can read as the lesson date. The plan's date semantics say 'Date shown means date shared, not lesson date.'",
        "fix": "Change the aria-label date part to `Shared ${dateLabel(note.created_at)}` and update the aria-label assertions in the archive tests."
      }
    ],
    "coverage": [
      "Read the full plan text and the full tracked diff in the manifest.",
      "Read in full: src/hooks/useClassroomMotion.ts, src/components/my-work/WorkFilterSelect.tsx, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/components/my-work/teachingNoteDates.ts, src/components/classroom/shell/ClassroomMotionContent.tsx.",
      "Read TeachingNotesArchive.tsx lines 34-73 (state, restore effect) plus the rest through the diff; StudentDestination.tsx lines 20-110; the selector list of myWorkNotesRefinement.css.",
      "Traced all useClassroomMotion callers by grep (ClassroomMotionContent, StudentDestination heading, TeacherWorkspaceShell, Reading Center AppShell, StudentDossier, TeacherSmartboard) to check owner resolution and the shared-behaviour impact of discover() changes.",
      "Checked that classroomMotionKey returns only the pathname for My Work, so filter search params do not re-key or replay the hook.",
      "Grepped for <form> ancestors to rule out a Radix hidden native select dispatching a bubbling 'change' that would make pointer selection count as sticky keyboard settlement.",
      "Reviewed the test diffs for the hook, archive, organization, Reading Center and StudentDestination suites to judge acceptance coverage."
    ],
    "limitations": [
      "I ran no tests, typecheck, build or browser checks. Host-reported pass counts and the scroll trace are not independently verified.",
      "I did not open the external design report or screenshots (C:/Users/Joshu/dev/ai-os/design/reviews/...), so no visual inspection was done.",
      "Not read: src/components/ui/select.tsx, teachingNotesArchiveData.ts, useAssignedTodoFeed.ts, assignedWorkOrganization.ts beyond the diff, myWorkNotes.css, the full myWorkOrganization.css, MyWorkNotesPage.tsx beyond the diff, ClassroomRouteViews.tsx beyond the diff, MyWorkPage.refetch.test.tsx, useNotesArchiveScroll.test.ts, teachingNoteDates.test.ts, and the preview harness beyond the diff.",
      "GSAP ScrollTrigger `once` and kill semantics for paused list tweens restarted from onEnter on a very fast scroll were reasoned about, not executed.",
      "The broader dirty checkout outside the explicit scope, including supabase/functions/mcp/index.ts, the teacher and Reading Center shells' own runtime behaviour, and production RLS and read-state, was not reviewed and is not approved."
    ]
  },
  "usage": {
    "input_tokens": 16,
    "cache_creation_input_tokens": 85431,
    "cache_read_input_tokens": 537066,
    "output_tokens": 16444,
    "output_tokens_details": {
      "thinking_tokens": 11055
    },
    "server_tool_use": {
      "web_search_requests": 0,
      "web_fetch_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 85431,
      "ephemeral_5m_input_tokens": 0
    },
    "inference_geo": "global",
    "iterations": [
      {
        "input_tokens": 2,
        "output_tokens": 4778,
        "cache_read_input_tokens": 89451,
        "cache_creation_input_tokens": 461,
        "cache_creation": {
          "ephemeral_5m_input_tokens": 0,
          "ephemeral_1h_input_tokens": 461
        },
        "type": "message"
      }
    ],
    "speed": "standard",
    "fallback_credit": null
  },
  "observed_models": [
    "claude-opus-5-5"
  ],
  "permission_denials": [],
  "total_cost_usd": 1.1198052,
  "elapsed_seconds": 188.47
}
```

Dispositions: Accept MW-FOCUS-1 (search focus recovery when a cleared absent picker disappears); Accept MOTION-SHARED-1 (restrict ancestor settlement to explicit list descendants/policy); Modify MOTION-RESTORE-1 (layout-phase restoration plus pre-discovery focused-list settlement or equivalent pending marker, accounting for child-before-parent layout order; merely changing effect type is insufficient); Accept COVERAGE-1 (real components + real motion hook using GSAP mock, plus already executed actual browser pointer/filter/pagination/return traces); Accept DATE-A11Y-1 (Shared in accessible name). Also fix new blank line at EOF noted by host diffcheck. No behavior-contract replacement or plan hash change: these implement existing focus/restore/date/scope acceptance. No app edit may follow finalinspection approval.

## Final inspection round 2: REVISE

{
  "verdict": "REVISE",
  "summary": "The scoped implementation mostly matches the authorized remediation. Here is what I confirmed by reading the code:\n- Owners are registered in a WeakMap and lookup stops at the first registered ancestor. Reduced-motion owners register a no-op.\n- Filter calls settle rows before the URL changes, including portaled Radix choices and Clear filters.\n- Pointer pagination re-enables reveals, but keyboard and input settlement stays sticky.\n- There is one DOM-ordered rAF batch, with step = min(.05, .15/(n-1)) and restart(true). Cleanup cancels the frame and clears the queue.\n- Restore works when data is already cached: the child layout effect focuses the row before the parent owner registers, and initial discovery detects that focus. It also works when data loads later, because the layout-phase intent runs before the MutationObserver microtask.\n- The list-only policy on the My Work wrapper blocks generic and fallback entrances while still allowing explicit list rows.\n- Subject and work-type options are a fixed whitelist. The selected value is kept even when no rows match. Access filtering runs before options and counts are built, and invalid URL values fail open.\n- Dates share one local-calendar helper and are labelled 'Shared'.\n\nOne material problem remains, in the acceptance evidence. On the host's phone screenshot of assigned work, rows are center-aligned. The cause is equal-specificity CSS that depends on stylesheet order, and the synthetic harness loads classroom.css in a different order from production. So the phone evidence does not show production layout, and the rule itself is fragile. Other findings are low severity.",
  "findings": [
    {
      "id": "F1-phone-row-cascade",
      "severity": "medium",
      "path": "src/pages/myWorkOrganization.css",
      "evidence": "I viewed stagger-work-phone.png (390px wide). In 'Necessary Assumption: First Taste' the text starts at x\u224858; in 'Review your reasoning' it starts at x\u224878. Both match centering in the 298px card (block widths \u2248250 and \u2248210). The cause: the 600px media rule `.my-work-organized .student-work-row { align-items: flex-start; flex-direction: column }` (line 31) has specificity (0,2,0). The same is true of `.classroom-root .student-work-row { align-items: center }` (classroom.css:5696), so whichever loads later wins. scripts/verification/my-work-preview.tsx imports MyWorkPage (and with it myWorkOrganization.css) before '../../src/components/classroom/classroom.css'. That lets classroom.css win and centers each row's content column on phones. Production App.tsx imports ClassroomLayout (line 66, which brings in classroom.css) before MyWorkPage (line 69), so production probably left-aligns. Two consequences: the phone acceptance screenshot does not show production layout, and the layout depends on bundle order.",
      "fix": "Make the rule independent of load order. In the 600px media query, raise specificity to `.classroom-root .my-work-organized .student-work-row { align-items: flex-start; flex-direction: column; }`. In the harness, import index.css and classroom.css before the page modules (or with a side-effect import at the top) so the CSS order matches production. Then recapture the phone 390 and 320 screenshots of assigned work, including the 'Progress to confirm' rows."
    },
    {
      "id": "F2-list-scroller-coverage",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.test.tsx",
      "evidence": "The plan requires coverage of a nested scroller. The only nested-scroller test (line ~221) uses a generic `section data-motion-item`, not a `[data-motion-list]` row. The list-specific path is not tested inside an overflow scroller: `toggleActions:'none none none none'`, the `onEnter` \u2192 `queueListEntry` \u2192 `restart(true)` sequence, and the paused tween with that scroller. The onEnter tests call the mocked `scrollTrigger.onEnter` directly, with no scroller.",
      "fix": "Add a test with `<div style=overflow-y:auto><div data-motion-list>` holding rows below the fold. Assert that `scrollTrigger.scroller` is the nested element, that the tween is created with `paused:true` and `toggleActions:'none none none none'`, and that onEnter queues a DOM-ordered restart."
    },
    {
      "id": "F3-print-hidden-rows",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "List rows below the fold are created with `immediateRender:true` and `paused:true` (lines 181-190), which writes inline `opacity:0; transform` until their ScrollTrigger fires. List rows no longer have the 24-block cap (line 161), and `archiveShown` allows up to 10000 rows. If a student prints, or uses a reader-mode tool, before scrolling the archive, every row they have not yet scrolled to stays at opacity 0. Before this change, at most 24 generic blocks could be in that state.",
      "fix": "Add a scoped `@media print { [data-motion-list] [data-motion-item] { opacity: 1 !important; transform: none !important; } }`. Alternatively, settle list records on `beforeprint`, removing the listener in the existing cleanup."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts. I traced the owner WeakMap, policy eligibility, batch scheduler, settle/intent handlers, keyboard/input sticky listeners and cleanup.",
    "Read in full: WorkFilterSelect.tsx, teachingNoteDates.ts, teachingNotesArchiveData.ts, useNotesArchiveScroll.ts, useNotesSelectMotion.ts, MyWorkPage.tsx and StudentDestination.tsx.",
    "Read the full diff for TeachingNotesArchive.tsx (restore layout effect, filter/paginate/restore intent ordering, Radix type select), assignedWorkOrganization.ts, ClassroomRouteViews.tsx, MyWorkNotesPage.tsx, the CSS files, the fixture scripts, the platform-motion doc and every test file diff.",
    "Traced callers: ClassroomMotionContent (motion key = pathname for My Work, so filters do not re-key), ClassroomLayout (window is the scroll owner for classroom-stage), TeacherWorkspaceShell, the Reading Center AppShell, TeacherSmartboard and StudentDossier. Grep shows data-motion-list, data-motion-policy and notifyClassroomListIntent are used only in the My Work files, so other shells only gain inert listeners.",
    "App.tsx routes: My Work to-do, completed and notes render only under StudentDestination destination='my-work'.",
    "Checked CSS scoping: the portaled .notes-select-content has its own palette; myWorkNotes.css variables are scoped to .my-work-notes-page. Also checked classroom.css for .student-work-row and the stage overflow rules.",
    "Viewed these images directly: stagger-notes-desktop.png, stagger-notes-phone.png, stagger-work-desktop.png and stagger-work-phone.png. Desktop and phone notes looked crisp, with correct hierarchy and no overflow. The phone work screenshot shows the centering problem in F1."
  ],
  "limitations": [
    "I could not run tests, typecheck, build or a browser. The pass counts in the host's doc (90 tests, and the earlier 56) are not verified.",
    "I did not open stagger-scroll-trace.json, stagger-viewport-checks.json or REPORT.md. The timing and overflow claims are unverified, and I did not examine reduced-motion or keyboard runtime.",
    "GSAP behavior I could only reason about, not observe: a paused tween with immediateRender and ScrollTrigger once/clamp, and whether a tween stopped by settle's scrollTrigger.kill() still renders when progress(1) is called.",
    "Not reviewed: the rest of the dirty checkout, including supabase/functions/mcp/index.ts, plus useAssignedTodoFeed internals, the select.tsx primitive source, MyWorkGate/ProtectedRoute loading markup and the PrescribedWeek internals. Nothing outside the listed scope is approved.",
    "Not certified: production RLS and read-state, authenticated backend behavior, physical phone or Safari behavior, and runtime acceptance for every shared caller."
  ]
}

Host dispositions: accept F1 mobile cascade and fixture CSS import order; accept F2 nested list-scroller test; accept F3 print settlement. Implementing remaining authorized fix round 2. Independent inspection budget exhausted; final edits will be host-tested and explicitly not independently approved.

## User-authorized renewed inspection, round1

User explicitly requested another Claude review before pushing; new budget2inspections,2fixrounds; no push authorized. Model requested/observed Claude Opus5.5Medium.

{
  "verdict": "APPROVED",
  "summary": "I found no material defect in the scoped changes. The implementation matches all five authorized remediation items:\n1. **Owner registry and filter intent.** A WeakMap registry stops at the first registered owner, and reduced-motion owners get a no-op handler. Every filter path on both pages (notes, assigned work, portal menus, Clear filters) signals 'filter' before the URL update. Only pointer Load more signals 'paginate'. Keyboard, input and change interaction stays settled for the rest of the visit.\n2. **Single entry batch.** List rows enter in one paused, DOM-ordered batch with step = min(.05, .15/(n-1)). The 240ms, 8px, opacity-only preset has no blur. Below-fold rows use ScrollTrigger on the scroller that actually scrolls, and the frame queue is cleaned up on unmount.\n3. **Restore.** The layout-phase restore signals 'restore' before focus. For a cached first commit, the parent owner falls back to detecting the already-focused row.\n4. **Filter validity.** Subject and work type are checked against fixed domain lists (hasOwnProperty guards against inherited names). Options and counts come only from rows the student can access. A valid but absent selection stays selectable and recoverable, including when the feed partly or fully fails.\n5. **list-only policy.** It blocks wrapper and fallback entrances but still finds explicit nested list rows. The loading markers were removed only once the policy existed.\nDates use one local-calendar helper and are labelled 'Shared'. The three findings below are low-severity edge cases or older behaviour, not blockers. I did not run any tests; the host-reported test and build results remain unverified by me.",
  "findings": [
    {
      "id": "R1-stale-anchor-restore-on-filter",
      "severity": "low",
      "path": "src/components/my-work/TeachingNotesArchive.tsx (useLayoutEffect restore; storageKey derived from archivePath incl. q/filter/type/shown)",
      "evidence": "storageKey includes every query parameter, and restored.current only records the last key. Scenario: a student opens a note from /my-work/notes?shown=24, leaves the reader by the sidebar rather than Back, so the anchor entry stays in sessionStorage. Later the student returns to the bare notes route and clicks Load more with the pointer. paginate is signalled, then the URL changes to shown=24, the restore effect finds the stale entry, and it calls notifyClassroomListIntent('restore'). That settles the newly paginated reveal and jumps focus and scroll (possibly smooth) to the old note. The focus/scroll jump existed before this change. The new part is that the stale entry now also cancels the pagination reveal the plan asks for. The same can happen when a filter change lands on a stale key.",
      "fix": "Restore only on arrival from the reader. For example, consume the anchor only when navigationType is POP or location.state marks a return from the reader, or clear the anchor entries for this account/path family when the archive mounts without a return marker. Leave the account/path key format unchanged."
    },
    {
      "id": "R2-restore-target-missing-first-commit",
      "severity": "low",
      "path": "src/components/my-work/TeachingNotesArchive.tsx restore branch; src/hooks/useClassroomMotion.ts initial-focus detection (lines ~142-147)",
      "evidence": "With cached data, the child's layout effect runs before the shell's re-keyed hook re-registers, so the 'restore' intent reaches the outgoing owner. The new owner only suppresses list entrances if a list row holds focus. If no anchored row survives (nearestArchiveNote returns null), focus goes to #notes-archive-heading, which is not a list row. Every row then runs a first-paint entrance on Back, against the acceptance criterion 'reader Back with surrounding rows visible'.",
      "fix": "Have the hook's initial discover also treat focus on any element inside the list's owner subtree (such as the archive heading) as a restore signal. Alternatively, defer the restore intent with queueMicrotask or a layout-safe retry until listOwners resolves to an owner registered for the current key. Add a test for a cached Back where no anchored note survives."
    },
    {
      "id": "R3-eager-global-notes-css",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx:2-3 (imports myWorkNotes.css, myWorkNotesRefinement.css)",
      "evidence": "ClassroomRouteViews now imports both notes stylesheets at module load. myWorkNotes.css:2-3 contains unscoped destination rules: min-width:0 on .classroom-column, .student-destination and .student-destination-heading, and overflow-wrap:anywhere on .student-destination-heading p. These now apply to every destination from first load, where before they applied only after the My Work notes chunk had loaded. The impact is probably small, but it changes other surfaces without saying so, which the brief says not to do.",
      "fix": "Move the reader-only material rules into a reader-scoped stylesheet, or scope myWorkNotes.css:2-3 to :has(.my-work-notes-page). Otherwise, record the global effect explicitly and check other destination headings at 320px."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts, src/components/my-work/WorkFilterSelect.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/pages/StudentDestination.tsx, src/components/classroom/shell/ClassroomMotionContent.tsx, src/pages/myWorkNotesRefinement.css; src/pages/myWorkNotes.css lines 1-50; tail of src/pages/MyWorkPage.tsx.",
    "Reviewed through the supplied diff: TeachingNotesArchive.tsx and its tests, MyWorkPage.tsx, MyWorkPage.organization and readingCenter tests, useClassroomMotion.test.tsx, StudentDestination.tsx and its test, assignedWorkOrganization.ts, ClassroomRouteViews.tsx, MyWorkNotesPage.tsx, myWorkOrganization.css, the preview harness scripts, and the platform-motion doc.",
    "Traced callers: App.tsx routes for MyWorkPage, MyWorkNotesPage and the /classroom/recaps redirect; useAssignedTodoFeed kind union against WORK_KIND_LABELS; files that use data-motion-* (checked that only My Work uses data-motion-list, so the new settle, batching and keyboard listeners do not change other pages); classroom.css overflow scroll containers (main content scrolls on window, which matches the window ScrollTo in useNotesArchiveScroll).",
    "Images opened and inspected: stagger-work-phone.png (390 wide; Guided drill selected, 2 of 4, groups and Clear-filter controls intact, no overflow) and stagger-notes-desktop.png (warm paper, charcoal Unread badges, Shared dates, month rule, Type portal trigger). In the phone image the Progress-to-confirm row has a deeper inset than the To-start row, which looks like hover or row-state styling. I could not confirm this and have not counted it as a defect."
  ],
  "limitations": [
    "I did not execute any tests, typecheck, build or browser runs. Host-reported pass counts and runtime traces are unverified.",
    "I did not inspect stagger-notes-phone.png, stagger-work-desktop.png, the JSON traces or the REPORT.md design record.",
    "GSAP ScrollTrigger runtime semantics (once with a paused animation, kill on settle) were reasoned from library behaviour, not exercised.",
    "Not inspected: useAssignedTodoFeed.ts beyond the kind/workSection contract, teachingNotesArchiveData.ts, myWorkNotesNavigation.ts, src/components/ui/select.tsx, MyWorkPage.refetch.test.tsx, teachingNoteDates.test.ts, useNotesArchiveScroll.test.ts, and the teacher and Reading Center shell callers' runtime.",
    "Out of scope and not reviewed: everything outside the listed scope paths, including supabase/functions/mcp/index.ts and the rest of the dirty checkout. This review does not approve the whole repository, production RLS/read-state, authenticated backend behaviour, or physical phone/Safari behaviour."
  ]
}

Host disposition: APPROVED for exact scoped snapshot with no material findings. Accept all3low findings for bounded correction before renewed finalinspection. Tests124passed again. Production and unrelateddirtycheckout excluded.

## Renewed inspection round2: REVISE

{
  "verdict": "REVISE",
  "summary": "Most of the remediation matches the plan. The shared hook registers each list owner in a WeakMap, and the intent helper stops at the first registered owner, including reduced-motion owners. List rows start paused and join one requestAnimationFrame batch sorted in DOM order. The delay step is min(.05, .15/(n-1)), and restart(true) applies it. The non-list presets and the four-per-group/24-total caps are unchanged. Filter, restore and pointer-paginate intents fire before the URL changes, including from the portaled Radix menus, which use the page/section ref. Keyboard, input and change settlement stays sticky. The My Work content wrapper is marked list-only, and its loading and section markers were removed in the same change. Subject and work-type options use fixed domain lists; access filtering runs before options and counts; valid selections that match no rows stay selectable. Two concrete defects remain. First, archive restoration can fire for a navigation that never left the page (a modifier click, then a reload or Back), which moves focus and scroll. Second, the min-width/overflow-wrap rules in myWorkNotes.css were narrowed to the Notes page, so the Assigned work tab and every other destination lose them, and the 320px overflow check for those pages is not in the evidence. I also found a small harness inconsistency. I did not run any commands or tests.",
  "findings": [
    {
      "id": "R1-stale-anchor-modifier-click",
      "severity": "medium",
      "path": "src/components/my-work/TeachingNotesArchive.tsx",
      "evidence": "card() onClick calls remember(note.id, event.detail > 0) on every click. Ctrl/Cmd-click also fires click, but React Router's Link does not navigate in the current tab, so this saves an anchor whose archiveEntryKey is the current location.key. The restore useLayoutEffect accepts any POP whose location.key equals archiveEntryKey. Scenario A: the student Ctrl-clicks 'Reference 9' to open it in a new tab, stays on the archive, applies a filter (push, new key) and presses browser Back. That POP lands on the original key, the stored anchor matches, and the page calls notifyClassroomListIntent('restore'), focuses Reference 9 and scrolls to it, although the student never left. Scenario B: with BrowserRouter, a reload of the archive entry is also a POP whose history.state key survives, so the same focus and scroll jump happens on reload. The restore intent also settles every list row and suppresses later reveals until pointer pagination. The tests cover stale anchors reached by push/filter and by a default POP without a key, but not a modifier click followed by POP or reload.",
      "fix": "Only call remember() when the Link will navigate in this tab: skip it when event.defaultPrevented, event.button !== 0, or any of metaKey/ctrlKey/shiftKey/altKey is set. Optionally also clear the anchor in a pagehide/reload path, or require the anchor to be written in the same history transition. Add a test: modifier click, push a filter, navigate(-1), and expect no focus change and no 'restore' intent."
    },
    {
      "id": "R2-css-scope-narrowing-unverified",
      "severity": "low",
      "path": "src/pages/myWorkNotes.css",
      "evidence": "Lines 2-3 used to apply min-width:0 to '.classroom-root.classroom-root-destination .classroom-column', '.student-destination' and '.student-destination-heading', and overflow-wrap:anywhere to '.student-destination-heading p', on every destination. They are now limited to ':has(.my-work-notes-page)'. The Assigned work and Completed tabs (.my-work-organized, no .my-work-notes-page) and every other destination (Library, Practice, Progress) lose these flex/overflow protections. ClassroomRouteViews now imports this stylesheet globally, so the change is not limited to My Work either. The host's stagger-viewport-checks cover the notes view only, at 320/684/768/1024/1281/1440. The plan requires overflow checks at 320\u20131280 and keyboard/reduced-motion checks for both tabs, but no to-do/completed or other-destination overflow evidence was presented.",
      "fix": "Choose one: (a) restore the earlier global rules as a deliberate layout safeguard, or (b) keep the narrowing and add '.classroom-root:has(.my-work-organized)' to the same selectors. In either case, record overflow measurements at 320 and 390 for /my-work/to-do with long titles and long subject labels, and for at least one other destination, before claiming no regression."
    },
    {
      "id": "R3-harness-scenario-list-incomplete",
      "severity": "low",
      "path": "scripts/verification/start-my-work-preview.mjs",
      "evidence": "The scenarios line printed to the console lists only archive/personal/reader scenarios. my-work-preview.tsx also supports work-loading, work-error, work-empty, work-no-rows, work-empty-kind, work-empty-subject, work-no-match and archive-many-unread. The plan's acceptance list (empty/error/loading assigned states, selected empty work type, Clear filters) depends on those work-* scenarios. An operator following the printed list could leave the assigned-work state checks out.",
      "fix": "Add the work-* and archive-many-unread scenarios to the printed scenarios line."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts (owner registry, consumeRestore, list batch scheduler, settle/settleLists, intent handling, list-only eligibility, cleanup), src/components/my-work/WorkFilterSelect.tsx, src/hooks/useNotesArchiveScroll.ts, src/components/my-work/teachingNoteDates.ts, src/components/classroom/shell/ClassroomMotionContent.tsx.",
    "Reviewed the full supplied diff for: TeachingNotesArchive.tsx and its tests, MyWorkPage.tsx, assignedWorkOrganization.ts, StudentDestination.tsx and its test, useClassroomMotion.test.tsx, MyWorkPage.organization/readingCenter tests, ClassroomRouteViews.tsx and its notes test, MyWorkNotesPage.tsx, myWorkNotes.css, myWorkOrganization.css, scripts/verification/my-work-preview.tsx, start-my-work-preview.mjs, docs/verification/platform-motion-20261022.md.",
    "Read lines 1-60 of myWorkNotesRefinement.css (portal palette is self-contained under .notes-select-content, with dark mode and forced-colours variants) and lines 10-29 of myWorkOrganization.css (long titles in rows wrap via overflow-wrap:anywhere and min-width:0).",
    "Traced StudentDestination's separate heading owner (a classroom-motion-local header) and searched the classroom.css overflow scrollers to judge the scroll owner. The main column appears to scroll the window; only the aside and journal stage have their own overflow.",
    "Traced the ordering of child restore against the parent owner's registration (marker consumption), keyed row identity across filtering, pointer vs keyboard pagination, the reduced-motion no-op owner, and access filtering before options and counts.",
    "Images: listed the external design folder and inspected stagger-notes-desktop.png and stagger-work-phone.png. Both show warm paper, charcoal unread badges, 'Shared' dates and the Guided drill filter at 2 of 4 with status groups kept. I did not open stagger-notes-phone.png or stagger-work-desktop.png."
  ],
  "limitations": [
    "I did not run tests, the typecheck, the build or the browser, and I cannot play motion. GSAP ScrollTrigger runtime behaviour (once/kill timing, the interaction between paused tweens and the trigger) was judged from source and GSAP API knowledge only.",
    "I could not establish whether the stagger-* screenshots and JSON traces were captured before or after the current remediation edits, so I do not treat them as evidence for the current code.",
    "Files I did not read: useNotesSelectMotion.ts, src/components/ui/select.tsx, teachingNotesArchiveData.ts, useAssignedTodoFeed.ts, the full MyWorkNotesPage.tsx (personal notes), MyWorkPage.refetch.test.tsx, useNotesArchiveScroll.test.ts, teachingNoteDates.test.ts, and the teacher and Reading Center shells beyond the hook contract.",
    "The broader dirty checkout is not reviewed, including the unrelated supabase/functions/mcp/index.ts and the untracked docs and .taste-skill content. This is not approval of the whole repository.",
    "Production auth, RLS, read-state persistence, physical phone/Safari behaviour and runtime acceptance of the other shared-hook callers are not certified."
  ]
}

Snapshot file hashes match; unrelated backend hash unchanged. Hostproof134tests, typecheck/build/diffcheck pass. Accept R1 modifierclick guard, R2 extend scoped protections to organizedMyWork, R3 print all supported scenarios. No remaining independent inspection budget; final corrections will be tested but explicitly unreviewed. No push.

## User authorizes continued review until no unresolved findings

2026-10-27: User explicitly overrides previous two-inspection stopping boundary: Have Claude review final corrections again until no remaining issues. Do not push. Continue fresh Claude Opus5.5Medium independent inspections, arbitrate concrete findings, implement supported fixes, run affected proof, and re-inspect changed snapshots until clean. No commit, push or publish. First new result: claudex-ja9tlty6/result.json (pending).

## Continued inspection1: APPROVED with CR-1 low

{
  "verdict": "APPROVED",
  "summary": "I read the scoped implementation against the remediation design and found no material unresolved defects. The shared hook registers each owner in a module WeakMap and resolves only the nearest one, and reduced-motion owners get a no-op registration. Filter, restore and paginate intents behave as specified: filter and restore settle current, pending and queued list work; pointer Load more lifts the suppression; keyboard, input and change settlement stays sticky. List rows bypass the ordinary four-per-group and 24-total caps, start paused, and run in one DOM-ordered frame batch with step=min(.05,.15/(n-1)). StudentDestination's list-only policy keeps My Work states and the generic fallback immediate while explicit rows still reveal, and other destinations keep their entrance. The archive sets the restore marker and signals restore in the layout phase, before focus or scroll. That ordering also works on first mount, when the child layout effect runs before the parent owner registers, because the owner consumes the marker. Subject and work-type validity no longer depends on which rows are loaded. Access filtering happens before options and counts are derived, and invalid values fail open, including inherited object names like toString. Both pickers run through the portal with the section or archive ref. The date key and labels come from one local-calendar helper and are labelled Shared. I found one low-severity edge (mid-animation settlement by the existing ResizeObserver). I did not run tests or a browser. Approval is based on reading source and tests, not on host-reported results.",
  "findings": [
    {
      "id": "CR-1",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "The ResizeObserver callback (lines 209-215) settles any record whose tween still has a scrollTrigger and is in view. List rows keep their tween.scrollTrigger reference after onEnter fires with once:true. Scenario: the user scrolls, rows 7-9 queue and start their 240ms reveal. Within roughly 100ms of that, a root child changes height (pointer Load more adding rows, a font swap, or the Personal notes link wrapping). The debounced callback then sees those rows in view and calls progress(1), so they jump to the end state partway through their stagger. The same behaviour already exists for generic blocks, but the new list path makes it more likely because Load more resizes the wrapper during exactly the window when reveals are running. Impact: an occasional visible snap, not hidden content.",
      "fix": "In the ResizeObserver path, skip records whose trigger has already fired or that are in the entering queue or currently active. For example, mark a record as revealed in onEnter (or check tween.isActive() / tween.progress() > 0) and only settle untriggered records that layout has pushed into view. Add a hook test: onEnter, flush the frame, fire a resize, and assert progress(1) is not called on the revealing tween."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts, src/components/my-work/WorkFilterSelect.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/components/classroom/shell/ClassroomMotionContent.tsx",
    "Read lines 1-64 of src/pages/myWorkNotesRefinement.css (portal palette and trigger styles) and listed every selector in the file to check scoping; read the top-level MyWorkPage component (src/pages/MyWorkPage.tsx lines 14-29)",
    "Read through the supplied tracked diff: TeachingNotesArchive.tsx and tests, MyWorkPage.tsx, organization and readingCenter tests, StudentDestination.tsx and test, useClassroomMotion.test.tsx, ClassroomRouteViews.tsx and notes test, assignedWorkOrganization.ts, the CSS files, the preview harness scripts and the platform-motion doc",
    "Traced every useClassroomMotion caller (ClassroomMotionContent, StudentDestination heading local boundary, Reading Center AppShell, TeacherWorkspaceShell, TeacherSmartboard, StudentDossier). The new list, intent and policy branches only take effect where data-motion-list, data-motion-policy or the intent helper are present. The added keydown/input/change/beforeprint listeners do nothing for shells without list records.",
    "Checked React layout-effect ordering for restoration: the child archive's layout effect runs before the parent ClassroomMotionContent re-registers on a motionKey change, and the parent consumes the marker. MyWork's motionKey depends only on pathname, so filter URL changes do not re-run the hook.",
    "Checked test mocks: MyWorkPage.refetch.test uses the real hook, so the new import resolves; the readingCenter and organization mocks export notifyClassroomListIntent; StudentDestination.test mocks only useClassroomMotion, which is all StudentDestination imports.",
    "Checked AssignedTodoRow kind/workSection types in useAssignedTodoFeed.ts against WORK_KINDS and WORK_SUBJECT_LABELS"
  ],
  "limitations": [
    "No tests, typecheck, build or browser were run. Statements about behaviour come from reading source, and host-reported pass counts are not independently confirmed.",
    "The screenshots and JSON traces under C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027 were not opened, so there was no visual inspection. Visual hierarchy, overflow at 320/390/1440 and motion feel are not certified.",
    "GSAP ScrollTrigger runtime semantics (onEnter combined with once:true and paused tweens, and refresh after kill) were judged from library knowledge, not exercised. The tests mock GSAP.",
    "myWorkNotes.css and myWorkNotes test files were only seen through the diff hunks. TeachingNotesArchive.test.tsx, teachingNoteDates.test.ts, useNotesArchiveScroll.test.ts, teachingNotesArchiveData.ts and src/components/ui/select.tsx were not opened separately.",
    "The broader dirty checkout was not reviewed, including supabase/functions/mcp/index.ts and other files outside the explicit scope. This is not whole-repository approval.",
    "Production authentication, RLS, read-state persistence and physical-device or Safari behaviour are out of reach for this review. The preview harness uses synthetic data and is not backend acceptance evidence."
  ]
}

Host: snapshot hashes match. AcceptCR1 ResizeObservercantruncateinprogressliststagger. Fixscopedliststate/test, preservegenericbehavior, thenfreshinspectionperuseruntilclean.

## Continued inspection2: APPROVED with2lowfindings

{
  "verdict": "APPROVED",
  "summary": "I compared the implemented remediation against the five authorized design items and found no material defects. I found one low-severity accessibility issue and one test-coverage gap. I did not run any tests or commands. I did not open the host's screenshots, so this review includes no visual inspection.\n\nWhat matches the plan:\n- **Ownership:** `notifyClassroomListIntent` (`useClassroomMotion.ts:14-22`) calls only the first registered owner found by walking up from the element. Reduced-motion owners register too and unregister on unmount.\n- **Restore:** when returning from the reader, the archive's restore runs before the parent motion owner re-registers, because child layout effects run first. The `data-motion-list-restore` marker plus `consumeRestore()` (lines 54-65, 87, 257) covers that ordering.\n- **Batching:** list rows start paused and go through one shared frame queue (lines 111-126). Rows are sorted by DOM order, the step is `min(.05, .15/max(1,n-1))`, and each starts with `restart(true)`. Ordinary page blocks keep the four-per-group and 24-total caps (line 173). The resize handler does not snap rows that have already entered (line 215). All tweens, triggers, listeners and queued frames are cleaned up when the hook unmounts.\n- **Filter, paginate and keyboard intents:** filter settles current rows and stays in effect until a pointer paginate. Keyboard and typed input stay sticky (lines 238-243). The motion key ignores the URL search string for My Work, so filter changes do not re-run the hook.\n- **Filter validity:** Subject and work-type values are checked against fixed domain lists (`WORK_SUBJECT_LABELS` uses an own-property check, `WORK_KINDS`). Access filtering runs before options, counts and matching are worked out. Invalid values fail open, and a valid selection that matches nothing stays selected with Clear filters available, including when the feed fails with no rows.\n- **List-only policy:** `StudentDestination` adds `data-motion-policy=\"list-only\"` only for My Work. `eligible()` and the settle logic keep that wrapper and its non-list children still, while rows inside `data-motion-list` still reveal. The loading markers were removed together with this change.\n- **Dates and styling:** `teachingNoteDate` uses one local calendar for month keys, month labels and row labels, and rows say \"Shared\". The refinement CSS is scoped to `.classroom-root`/My Work classes, apart from the portaled `.notes-select-content`.",
  "findings": [
    {
      "id": "F1-clear-filters-focus-loss",
      "severity": "low",
      "path": "src/pages/MyWorkPage.tsx",
      "evidence": "Both Clear filters buttons (the no-match block in MyWorkList, and the `.teaching-notes-no-results` block in src/components/my-work/TeachingNotesArchive.tsx) are only rendered while there are zero matches. Scenario: a keyboard user activates Clear filters, matches become non-zero, the button unmounts and focus drops to <body>. The user then has to tab from the top of the page. The new picker-removal recovery (recoverFilterFocus/searchRef) only covers removal of the Select, not this button. This behavior existed before this change, but the plan's 'immediate focused/keyboard content' requirement touches it.",
      "fix": "In both Clear filters handlers, set a recover-focus flag (or reuse recoverFilterFocus) and, after the commit, focus searchRef.current (or the list heading) when the button is no longer mounted. Add one test per surface that Clear filters leaves focus on the search box."
    },
    {
      "id": "F2-access-grant-transition-untested",
      "severity": "low",
      "path": "src/pages/MyWorkPage.organization.test.tsx",
      "evidence": "The plan's proof list asks for 'access grants'. The tests cover unauthorized rows staying hidden and absent from counts and options ('never derives counts or available options from unauthorized rows'), and `state.generalAccess` is now mocked. However, no test switches access from denied to granted, or granted to denied, while a filter is active. The code path looks correct (the `visible` filter runs before subjects, kinds and matches), but this transition is not exercised.",
      "fix": "Add a rerender test that starts with generalAccess=false or Reading Center denied and ?kind=Reading+Center, asserts the selected empty state, then grants access and asserts the authorized row appears with correct counts. Add the reverse case too."
    }
  ],
  "coverage": [
    "Read the plan and the full tracked diff for all 25 manifest files.",
    "Read in full: src/hooks/useClassroomMotion.ts, src/components/my-work/WorkFilterSelect.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/components/classroom/shell/ClassroomMotionContent.tsx.",
    "Traced every production useClassroomMotion caller: ClassroomMotionContent (used by ClassroomLayout), the StudentDestination heading (header.classroom-motion-local, not an ancestor of the content), the Reading Center AppShell, TeacherWorkspaceShell, TeacherSmartboard and StudentDossier. None of these is a nested owner between the My Work content and ClassroomMotionContent.",
    "Checked classroom.css for overflow scrollers to confirm that window is the scroll owner for the My Work column, as useNotesArchiveScroll assumes.",
    "Listed every selector in myWorkNotesRefinement.css to check scoping, since ClassroomRouteViews now imports it globally.",
    "Checked the order of restore intent vs. owner registration under React layout-effect commit ordering, filter/paginate/keyboard state transitions, list-only eligibility and the fallback path, the access filter running before option, count and match derivation, valid-but-absent and invalid URL values, and partial or failed feed states."
  ],
  "limitations": [
    "I did not run any tests, typecheck, build or browser checks. The host's 56/90 test counts and build results are not independently confirmed.",
    "I did not open the screenshots or JSON traces in C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027. No visual inspection was done, and motion timing was not observed at runtime.",
    "I did not read these in full: TeachingNotesArchive.tsx beyond the diff, teachingNotesArchiveData.ts, src/hooks/useAssignedTodoFeed.ts, src/components/ui/select.tsx, MyWorkNotesPage.tsx beyond the diff, MyWorkPage.refetch.test.tsx, or all of myWorkNotesRefinement.css and myWorkNotes.css.",
    "Not certified: real GSAP ScrollTrigger behavior (fast scroll jumps, onEnter when skipping past rows), Safari or physical phone, production RLS and read state, and runtime behavior for the teacher and Reading Center shells.",
    "Files outside the explicit scope are not reviewed or approved. That includes the unrelated pre-existing changes such as supabase/functions/mcp/index.ts, and the untracked docs/plans and verification artifacts outside the manifest. This is not a whole-repository approval."
  ]
}

Host: allsnapshotfilesmatch. CR1fixedandconfirmed. Hostproof141tests,typecheck,buildpassed. AcceptClearfiltersfocusrecoverybothsurfaces andaccessgranttransitioncoverage; implementandfreshinspectperuser.

## Continued inspection3: REVISE pointerfocusmodality

{
  "verdict": "REVISE",
  "summary": "I read the scoped implementation against the five authorized remediation items. Most of it matches. Items 1 to 5 are implemented as specified: the module-WeakMap owner with nearest-owner resolution and a reduced-motion no-op handler, filter/restore/paginate intents called synchronously before URL updates (including portaled selects through page or section refs), a single DOM-ordered rAF batch with paused 240ms/8px/opacity list tweens, layout-phase restore settlement (including the case where a child focuses a row before the parent owner registers), the domain whitelists that fail open on invalid values while keeping valid absent selections, access filtering before counts and options, and the list-only My Work content policy. I found one material phone-UX defect introduced by the new focus-recovery code. Focus is moved programmatically into the search input after pointer or touch actions, not only keyboard ones. On phones this opens the soft keyboard and scrolls the page after a tap on Clear filters or a picker reset. There is also one low-severity motion-stickiness note. I did not run any tests, builds or browsers. Host-reported checks were not treated as evidence.",
  "findings": [
    {
      "id": "F1-pointer-clear-focuses-search",
      "severity": "medium",
      "path": "src/components/my-work/TeachingNotesArchive.tsx",
      "evidence": "In TeachingNotesArchive, clearFilters() always sets recoverClearFocus.current = true. The dependency-free useLayoutEffect then calls searchRef.current?.focus() during the commit triggered by the click. That commit runs synchronously inside the tap's user-gesture task, so iOS Safari and Android Chrome open the soft keyboard and scroll to the input. Scenario: a phone user taps Unread, gets 'No notes match these filters', taps Clear filters, and the keyboard covers the restored archive. The same happens through changeType: Radix focuses options under pointer hover/touch, so focus.closest('.notes-select-content') is true for a pointer choice of 'All types' when the selector disappears. src/pages/MyWorkPage.tsx has the same pattern. The Clear filters handler sets 'clear' when event.currentTarget === document.activeElement, and Chrome on desktop and Android focuses buttons on tap. WorkFilterSelect's focusedWithin is also true for pointer selection inside the portal content. The MyWorkList effect then focuses search. The tests only exercise keyboard and detail-0 paths (e.g. 'returns keyboard focus to search after Clear filters'), so the pointer/touch side effect is untested. The plan's rendered checks require pointer Clear filters and the 390px phone state to be correct.",
      "fix": "Recover focus only when the removed control actually held focus because of keyboard interaction. The cleanest gate is event.detail === 0 on the Clear filters click; for the Select, use the existing selectModality/modality state === 'keyboard'. Otherwise, focus the section/heading with preventScroll, or leave focus alone if it is still on a mounted element. Add tests: a pointer click on Clear filters (detail 1) and a pointer 'All types'/'All work types' choice do not focus the search input."
    },
    {
      "id": "F2-any-keydown-sticky",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "useList is attached to every keydown, input and change event that bubbles to the root (line 242-243). It permanently sets keyboardInteraction = true, so a later pointer paginate never re-enables reveals for that route visit. Pressing a lone modifier (holding Cmd/Ctrl before a Cmd-click to open a note in a new tab) or Escape counts. So does any key pressed while focus is on an earlier-clicked row link. Each of these silently disables the requested Load more stagger for the rest of the visit. This is consistent with the docs' 'sticky' wording, so it is a fidelity and edge-case concern, not a crash.",
      "fix": "Optionally ignore modifier-only and Escape keydowns (event.key in Meta/Control/Shift/Alt/Escape) when setting keyboardInteraction, or set the sticky flag only for navigation and activation keys (Tab, arrows, Enter, Space, PageUp/PageDown) and text input. Add a unit test showing that a Meta keydown followed by pointer paginate still reveals new rows."
    }
  ],
  "coverage": [
    "Read the plan text and the full tracked diff for every manifest path",
    "Read src/hooks/useClassroomMotion.ts in full: owner registry, consumeRestore, list-only eligibility, batch scheduler, settle/intent handling, resize/mutation/print listeners, cleanup",
    "Read src/components/my-work/WorkFilterSelect.tsx (untracked, not in the diff)",
    "Read src/components/my-work/teachingNoteDates.ts (local-calendar key/month/label)",
    "Read src/hooks/useNotesArchiveScroll.ts (return-scroll modality)",
    "Read src/components/classroom/shell/ClassroomMotionContent.tsx and StudentDestination.tsx lines 40-104 (heading local owner vs. list-only content wrapper)",
    "Traced callers of useClassroomMotion across src (TeacherSmartboard, StudentDossier, TeacherWorkspaceShell, Reading Center AppShell, ClassroomMotionContent, StudentDestination heading) for nested-owner resolution",
    "Read src/App.tsx lines 560-649 for the My Work route nesting, gates and the reader route under the same ClassroomLayout (old-owner cleanup and new-owner ordering on reader Back)",
    "Checked myWorkNotesRefinement.css select/menu variables, reader styles and scoping; checked that the My Work CSS variable mappings in myWorkOrganization.css feed the shared trigger styles",
    "Checked the AssignedTodoRow.workSection typing in useAssignedTodoFeed.ts for the subject whitelist"
  ],
  "limitations": [
    "I did not run tests, typecheck, build or a browser. All host-reported results (test counts, scroll traces, viewport checks) are unverified.",
    "I did not inspect the design-report screenshots under C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027 or the docs/verification images. No visual inspection was performed.",
    "GSAP ScrollTrigger runtime semantics are unverified from source: specifically whether once:true self-kill leaves the paused list tween alive for the deferred rAF restart(true). The correctness of below-fold reveals depends on this; only the host trace attests to it.",
    "Not read in full: useNotesSelectMotion.ts, myWorkNotes.css beyond the grep hits, the full myWorkOrganization.css/MyWorkPage.tsx outside the diff hunks, teachingNotesArchiveData.ts, ui/select.tsx (Radix BubbleSelect change-event behavior was assessed from library knowledge only), and the full test files beyond the diff.",
    "The broader dirty checkout outside the explicit scope, including supabase/functions/mcp/index.ts, the untracked docs/plans files and .taste-skill/, was not reviewed. This is not a whole-repository approval.",
    "Physical phone/Safari behavior, production RLS/read-state and runtime acceptance for other shared motion callers are not certified."
  ]
}

Host: snapshotmatches;144tests,typecheck/buildpass. AcceptF1restrictsearchfocusrecoverytokeyboard,neutralpointertargetwhenremoved;acceptF2ignoremodifier/Escapeonlykeydownforstickylistinteraction. Preserveinput/change/navigationactivation. Freshinspectionafterproof.

## Continued inspection4: APPROVED withcalendar/marker lowfindings

{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the scoped remediation. The shared hook's owner registry, notifyClassroomListIntent, the single DOM-ordered list batch scheduler and the list-only policy all match the authorized design. So do restore, filter and paginate settlement, domain-validated subject/kind filters with access filtering applied before options and counts, and reader return state. For the ScrollTrigger and focus paths I traced, I found no causal path to hidden rows, replays, unauthorized option leaks or animation of non-list My Work content. Two low-severity edge issues remain: a non-Gregorian calendar mismatch between month keys and month labels, and a restore marker that is not consumed when the owner is already registered. Neither blocks approval.",
  "findings": [
    {
      "id": "DATE-CAL-1",
      "severity": "low",
      "path": "src/components/my-work/teachingNoteDates.ts:8-12",
      "evidence": "The month group key comes from Intl.DateTimeFormat('en-US', \u2026) (Gregorian calendar), but the month heading and row labels use Intl.DateTimeFormat(undefined, \u2026), which follows the user's default locale calendar. Some locales default to a non-Gregorian calendar (for example fa-IR uses Persian, th-TH uses Buddhist). For those users, one Gregorian-keyed group can hold notes from two different locale months. TeachingNotesArchive.tsx labels the group with its first note's month, so the heading can disagree with row dates in that group. This breaks the plan's rule that dates and month groups use the same calendar.",
      "fix": "Use one calendar for both. Either add calendar: 'gregory' to the two display formatters, or build the key from formatToParts of a formatter using the same locale and calendar as the labels. Add a test with a non-Gregorian locale or a mocked resolvedOptions."
    },
    {
      "id": "RESTORE-MARKER-1",
      "severity": "low",
      "path": "src/components/my-work/TeachingNotesArchive.tsx (restore useLayoutEffect) / src/hooks/useClassroomMotion.ts:54-65,238-241",
      "evidence": "When restoration happens after the owner is already registered (for example, archive data loads after the shell hook mounted), the archive sets data-motion-list-restore and calls notify('restore'). handleIntent settles the lists but never removes the marker. The marker is only consumed when an owner registers (consumeRestore at lines 87 and 260), so it stays on .teaching-notes-home until the archive unmounts. If the owner effect re-runs while the archive stays mounted (motionKey change), the stale marker sets listInteraction=true and suppresses that visit's list entrances. Current routes remount the archive when the pathname changes, so I found no live user-facing failure. This is a latent coupling.",
      "fix": "Have the owner remove matching restore markers in handleIntent('restore'), for example by calling consumeRestore() there. Alternatively, have the archive remove the attribute after notify when an owner handled it."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts. Traced owner registration and cleanup, consumeRestore, the list-only eligibility rules, the queueListEntry batch and stagger formula, settle, the resize path, keyboard/input/change stickiness, and the paginate, filter and restore intents.",
    "Read in full: src/components/my-work/WorkFilterSelect.tsx, teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/components/classroom/shell/ClassroomMotionContent.tsx (motion key is pathname-based, so search filters do not re-key the hook).",
    "Read the portions of src/pages/StudentDestination.tsx showing the list-only policy wrapper and the separate classroom-motion-local heading owner.",
    "Read the tail of src/pages/MyWorkPage.tsx plus the full diff for MyWorkPage, TeachingNotesArchive, assignedWorkOrganization, ClassroomRouteViews, StudentDestination, the CSS files, the preview harness and all scoped tests.",
    "Read the top of myWorkNotesRefinement.css and grepped it for portal palette and dark/forced-colors styling of .notes-select-content.",
    "Grepped other useClassroomMotion callers and data-motion usage (Reading Center AppShell, ReadingCenterHome, LibraryPage, FirstAnswerProgressPanel). Their default, non-list behavior is unaffected by the list-only and list branches.",
    "Grepped classroom.css overflow rules to confirm the main destination column scrolls the window, which is what useNotesArchiveScroll assumes."
  ],
  "limitations": [
    "I did not open the screenshots in C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027 or the scroll-trace and viewport JSON files, so there was no visual inspection. Visual, material, responsive and overflow acceptance rests on host evidence only.",
    "I could not run tests, typecheck, build or the browser. I make no claim that tests passed, and I did not exercise runtime GSAP/ScrollTrigger behavior (once/onEnter with paused tweens, real scroll timing).",
    "Partially read: MyWorkNotesPage.tsx (diff only), assignedWorkOrganization.ts beyond the diff, useNotesSelectMotion.ts, teachingNotesArchiveData.ts, src/components/ui/select.tsx, myWorkOrganization.css and myWorkNotes.css beyond the diff, and the remainder of myWorkNotesRefinement.css.",
    "I did not inspect useAssignedTodoFeed internals or the production RLS/read-state paths. Access correctness was judged only from client-side filtering in MyWorkPage.",
    "Not reviewed: the broader dirty checkout outside the explicit scope, including supabase/functions/mcp/index.ts, the untracked docs/plans files and the .taste-skill/ output. This is not whole-repository approval.",
    "Physical phone, Safari, reduced-motion OS settings and the shared Reading Center and teacher shells are not certified at runtime."
  ]
}

Host: snapshotmatches;154tests/typecheck/buildpass. AcceptDATE-CAL-1 forcegregorydisplaycalendarconsistentkey, locale regression. AcceptRESTORE-MARKER-1 withownershipsafedeferredconsumption: cannotremovebeforeincomingownercachedlayoutregistration. Testbothdelayedregisteredrestoreandcachedemptyfirstcommit. No release.

## Continued inspection5: APPROVED with2lowreturn/focusextensions

{
  "verdict": "APPROVED",
  "summary": "I found no material defects. The scoped implementation matches the authorized remediation. notifyClassroomListIntent only reaches the nearest registered owner. Reduced-motion owners register a no-op and unregister on cleanup. There is one rAF batch for list rows, sorted in DOM order, with step=min(.05,.15/(n-1)) and restart(true). List rows use a crisp 240ms/8px preset with no blur and skip the 4-per-group/24-total caps; the ordinary preset and caps are unchanged. Filter intent fires before every URL update, including portaled Radix choices through the page/section ref. Pointer-only paginate re-enables reveals, and keyboard/input settlement stays sticky. Restore works through a marker plus an intent call made in the layout phase; this covers the child-before-parent effect order on a fresh owner. data-motion-policy=\"list-only\" is applied to My Work content only, and the loading markers are removed together with it. Subject and work-type whitelists apply after the access filter, so options and counts never come from unauthorized rows. Invalid values fail open, and an active valid filter keeps its controls and Clear filters even with no rows. Month keys and row labels use one local Gregorian calendar, labelled \"Shared\". Two low-severity edge cases remain (a stale archive anchor, and keyboard focus lost after Clear filters on an empty failed feed). Neither blocks approval. I did not run tests, a browser or GSAP; host-reported results were not taken as proof.",
  "findings": [
    {
      "id": "F1-stale-anchor-restore",
      "severity": "low",
      "path": "src/components/my-work/TeachingNotesArchive.tsx (restore useLayoutEffect) with src/components/classroom/ClassroomRouteViews.tsx:293,354",
      "evidence": "Restoration runs whenever location.state.notesArchiveReturn === true, and the stored anchor is never checked against the note the reader actually showed. Scenario: the student opens note A from the archive, which saves an anchor under /my-work/notes. They then leave the reader through the rail instead of Back, so the anchor is never consumed. Later they open note B from somewhere without a returnTo (e.g. Home). The reader's \"Back to notes\" then navigates to the fallback /my-work/notes with state {notesArchiveReturn:true}. The archive restores the stale anchor A: it focuses and scrolls to an unrelated old note and fires 'restore', which suppresses list reveals for that visit. The POP path is protected by archiveEntryKey; the push path is not.",
      "fix": "Have the reader pass its item id in the return state (e.g. {notesArchiveReturn: itemId}). Restore only when anchor.id === state.notesArchiveReturn or the id is in anchor.ids; otherwise delete the stale key. Alternatively, store and compare the reader route's location key. Add a test: open from archive, leave without Back, return from an unrelated reader \u2192 no focus/scroll and no restore intent."
    },
    {
      "id": "F2-clear-focus-loss-failed-empty",
      "severity": "low",
      "path": "src/pages/MyWorkPage.tsx:52-57,71,93",
      "evidence": "When failed && rows.length === 0 and filters are active, the section renders the no-match message with Clear filters. When a keyboard user activates Clear, recoverFilterFocus is set to 'clear'. Clearing makes hasFilters false, so the early-return alert branch (line 71) replaces the section and searchRef/sectionRef are both null. The recovery effect then focuses nothing, and focus falls to <body>.",
      "fix": "When recovery targets are missing, fall back to the alert's Try again button (give it a ref or use a query inside a stable wrapper). Or keep the section mounted with its alert when Clear is triggered from the failed-empty state. Add a test for keyboard Clear with failed=true and rows=[]."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts (current), src/components/my-work/WorkFilterSelect.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/pages/MyWorkPage.tsx, src/components/classroom/shell/ClassroomMotionContent.tsx, src/pages/StudentDestination.tsx lines 40-109, src/pages/myWorkNotesRefinement.css lines 1-60 plus grep of the remaining selectors",
    "Reviewed through the supplied diff: TeachingNotesArchive.tsx and its tests, useClassroomMotion.test.tsx, MyWorkPage.organization/readingCenter tests, StudentDestination test, ClassroomRouteViews(.notes.test).tsx, assignedWorkOrganization.ts, myWorkNotes.css, myWorkOrganization.css, MyWorkNotesPage.tsx, the preview harness scripts and docs/verification/platform-motion-20261022.md",
    "Traced other callers and writers: grepped every data-motion marker in non-test src to confirm data-motion-list and data-motion-policy exist only in My Work and that the list-only/settle rules leave Home, Reading Center, teacher, analytics and practice callers unchanged; grepped test mocks of useClassroomMotion for the missing-export risk (none found); checked validateNotesReturnTo's fallback; checked the classroom.css overflow owners to confirm the main column scrolls the window, so window-based return scroll and ScrollTrigger default to the real scroller",
    "Checked against the plan: intent ownership/nesting/reduced-motion registration, batch timing formula, filter \u2192 paginate \u2192 keyboard stickiness, restore timing against React layout-effect order, list-only eligibility and fallback exclusion, access filtering before options/counts, hasOwnProperty whitelist (inherited names fail open), portal menu palette independent of page variables, local-calendar month keys"
  ],
  "limitations": [
    "I did not open or inspect any screenshot (stagger-*.png or docs/verification images), so I make no visual claims about hierarchy, theme, long titles or responsive layout.",
    "I executed no tests, typecheck, build or browser run. Host-reported results (56/90 tests, scroll trace, viewport checks) are unverified.",
    "Real GSAP/ScrollTrigger behaviour is unverified, in particular how once:true, paused:true and toggleActions 'none' interact with restart(true) after onEnter; the unit tests mock GSAP.",
    "Not read: useNotesSelectMotion.ts, components/ui/select.tsx, teachingNotesArchiveData.ts, useAssignedTodoFeed.ts, MyWorkPage.refetch.test.tsx, useNotesArchiveScroll.test.ts and teachingNoteDates.test.ts beyond what the diff shows. The Radix version-specific BubbleSelect 'change' behaviour is assumed absent outside forms.",
    "Out of scope and unreviewed: the broader dirty checkout, including supabase/functions/mcp/index.ts, other untracked docs, production RLS/read-state persistence, physical phone/Safari behaviour and runtime acceptance of the other shared motion callers. This is not a whole-repository approval."
  ]
}

Host: snapshotmatches159tests/typecheck/buildpass. AcceptexplicitreaderreturnIDmustmatchsavedanchorbeforepushrestore; preservePOPentrykey. AcceptfailedemptyClearfocusfallbackRetrybutton. Implementtestsandfreshinspect.
