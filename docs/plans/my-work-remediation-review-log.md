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

## Continued inspection6: APPROVED with4lowdetails

{
  "verdict": "APPROVED",
  "summary": "I read the scoped implementation by hand and found no material correctness, access or spec-fidelity defects. I traced callers in ClassroomMotionContent, StudentDestination, ClassroomLayout, App routes and ClassroomRouteViews. Shared-hook owner registration, nearest-owner resolution, the reduced-motion no-op owner and cleanup match plan item 1. The single DOM-ordered list batch (paused tweens, step=min(.05,.15/(n-1)), restart(true), 240ms/y8/no blur) and the preserved non-list caps match item 2. Restore intent runs in the layout phase and hands its marker to the replacement owner (item 3). Subject and work-type validity comes from a domain whitelist with a hasOwnProperty guard. Access filtering happens before counts and options, absent valid selections are kept, and invalid values fail open (item 4). StudentDestination applies the list-only policy, and ready markers were removed only together with that policy (item 5). Month keys and row labels share one local-calendar helper. I found four low-severity issues: a band of rows that stays visible but transparent at rest, unlabelled shared dates in the reader, an unplanned change to the reader's entrance motion, and notes-select modality tracking. None blocks approval. This verdict comes from reading code only. I ran nothing, inspected no screenshots, and did not treat the host-reported test, build or browser results as verified.",
  "findings": [
    {
      "id": "R1-bottom-band-hidden-rows",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts:185-213",
      "evidence": "A list row counts as 'below' when rect.top >= viewport bottom - 100. It is then created as a paused fromTo with immediateRender:true and a ScrollTrigger start of 'clamp(top bottom-=100)', so it renders at opacity 0 straight away. If a row's top edge falls inside the last 100px of the viewport (common on a 390x844 phone with ~150px cards), that part of the card is on screen but transparent. It stays blank until the user scrolls past the start point or interacts. Generic blocks already behaved this way, but this opt-in makes it the default for every notes and work row. It also conflicts with the documented claim that no rows are hidden at rest.",
      "fix": "For list rows only, base 'below' on rect.top >= viewport bottom (no 100px margin), and use a matching trigger start such as 'clamp(top bottom)'. Rows that are partly visible on first paint would then join the immediate in-view batch. Add a test with a row whose top sits within the bottom 100px."
    },
    {
      "id": "R2-reader-date-not-labelled-shared",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx:173-190, 312-316",
      "evidence": "The archive now labels dates 'Shared <date>' using teachingNoteDate. The note reader, which this change wraps in the My Work notes styling, still renders DetailHeading with a bare formatClassroomDate(created_at) next to the kind, for example 'October 25, 2026 | Session recap'. A student reading a session recap can take that as the lesson date, which the brief prohibits ('Date shown means date shared, not lesson date').",
      "fix": "For NOTE_TYPES, prefix the reader dateline with 'Shared', or set title='Date shared' on it. Optionally reuse teachingNoteDate(...).label so the archive and reader format the date the same way."
    },
    {
      "id": "R3-reader-wrapper-changes-generic-entrance",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx:362-364; src/hooks/useClassroomMotion.ts:145-153",
      "evidence": "Note readers now render as a single <section class='my-work-notes-page classroom-note-reader'> and carry no data-motion markers. When cached items are present (the usual case when opening a note from the archive, since both use useClassroomItems), the hook's initial generic fallback stops descending at a single section child. The whole reader, including Ask/Back actions, then enters as one 14px blurred block. Before, the dateline, title, standfirst and article entered as separate staggered blocks. This is a motion change to a shared shell caller outside the planned My Work opt-in.",
      "fix": "Use a div wrapper (or display:contents) so the fallback still descends, or mark the reader's internal blocks explicitly with data-motion-item. Then add a ClassroomRouteViews motion-composition test."
    },
    {
      "id": "R4-notes-select-modality-not-captured-in-portal",
      "severity": "low",
      "path": "src/components/my-work/TeachingNotesArchive.tsx:66-70 and the SelectContent props",
      "evidence": "WorkFilterSelect records the input modality on SelectContent through onPointerDownCapture and onKeyDownCapture. The notes Type select records modality only on the trigger. If the menu is opened with the keyboard and an option ('All types', when no other type exists) is then chosen with the pointer, changeType still sees selectModality==='keyboard'. It then moves focus to the search field, which on touch devices can open the on-screen keyboard. This conflicts with the pointer behaviour pinned by the existing tests.",
      "fix": "Add onPointerDownCapture={() => setSelectModality('pointer')} and onKeyDownCapture={() => setSelectModality('keyboard')} to the notes SelectContent, and read the value through a ref as WorkFilterSelect does."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts, src/components/my-work/WorkFilterSelect.tsx, src/pages/MyWorkPage.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/components/classroom/shell/ClassroomMotionContent.tsx",
    "Read in part: src/pages/StudentDestination.tsx (hook usage and content wrapper), src/components/classroom/ClassroomRouteViews.tsx (lines 146-364, plus formatClassroomDate), src/pages/myWorkNotesRefinement.css (lines 1-64, plus the selector list for scoping)",
    "Reviewed through the provided tracked diff: TeachingNotesArchive.tsx and tests, useClassroomMotion.test.tsx, MyWorkPage organization and readingCenter tests, StudentDestination.test.tsx, assignedWorkOrganization.ts, myWorkNotes.css, myWorkOrganization.css, MyWorkNotesPage.tsx, the preview harness and its start script, ClassroomRouteViews.notes.test.tsx, and docs/verification/platform-motion-20261022.md",
    "Traced callers: App.tsx My Work and classroom item routes, the ClassroomLayout mounts of ClassroomMotionContent, the StudentDestination heading owner, and the classroomMotionKey behaviour for /classroom/item and /classroom/recaps",
    "Checked plan items 1-5 against the code: intent ordering before setParams (including portal callbacks), sticky keyboard settlement, paginate re-enable, restore marker hand-off and microtask cleanup, the list-only eligibility exclusion and generic fallback, domain whitelists and the access-first visible filter, and month-key and label agreement"
  ],
  "limitations": [
    "I executed no tests, typecheck, build or browser checks. Every runtime and test claim comes from the host and is unverified.",
    "I did not open the screenshots in the external design report (stagger-*.png) or the JSON traces, so I did no visual inspection.",
    "Untracked files I did not read directly: src/components/my-work/teachingNotesArchiveData.ts, teachingNoteDates.test.ts, useNotesArchiveScroll.test.ts, MyWorkPage.refetch.test.tsx and myWorkNotesRefinement.css beyond line 64. I also did not read the full test bodies outside the diff.",
    "I did not read the internals of useAssignedTodoFeed, MyWorkGate, ProtectedRoute, PrescribedWeek or src/components/ui/select.tsx. Behaviour that depends on them is inferred.",
    "Finding R1 rests on GSAP's documented immediateRender and ScrollTrigger semantics, not on runtime observation. Finding R3 assumes ProtectedRoute renders its children without a wrapper element.",
    "Everything outside the explicit scope is unreviewed and not approved, including supabase/functions/mcp/index.ts and the rest of the dirty checkout, other shell callers' runtime behaviour, production RLS and read-state, and physical phone or Safari behaviour."
  ]
}

Host: snapshotmatches163tests/typecheck/buildpass. AcceptR1listviewportbottomthreshold, R2Sharedreaderdate NOTE_TYPESonly, R3preservereadergenericfallbackthroughdivwrapper, R4portalmodalitycapture/ref. Implementtargetedregressionsandfreshinspectperuser.

## Continued inspection7: APPROVED withhistoryidentity/detachedlistlows

{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the scoped changes, and the implementation matches the authorized remediation. The shared hook registers each owner in a WeakMap and resolves intents from the nearest registered ancestor. Reduced-motion owners get a no-op handler, and owners are removed on unmount. Every list tween starts paused and joins one rAF batch sorted by DOM order. The stagger step is min(.05, .15/(n-1)), the preset is 240ms / y8 / opacity with no blur, and the 4-per-group and 24-total caps still apply to non-list content. Filter and restore intents settle current, queued and pending rows and keep later rows immediate. Pointer pagination (detail>0) turns animation back on unless the user has used the keyboard. Restoration calls 'restore' in the layout phase before focus. When the child's layout effect runs before the parent owner registers, the data-motion-list-restore marker and the initial focus check cover the gap. StudentDestination marks only my-work content as list-only, and the eligibility rule stops both the generic fallback and the wrapper's ancestors from animating while still finding explicit list rows. In My Work, Subject and kind validity come from fixed lists rather than loaded rows. Access filtering runs before options and counts are built. A valid filter that matches nothing keeps the selector and Clear filters visible, and invalid values (including inherited object keys) are ignored as before. The Notes month key and row labels use the same local Gregorian calendar, and the reader also formats in local time. I found only two low-severity edge cases. These are code-reading conclusions; I did not run any tests or browsers.",
  "findings": [
    {
      "id": "R1-pop-default-key",
      "severity": "low",
      "path": "src/components/my-work/TeachingNotesArchive.tsx (restore useLayoutEffect, matchingPop)",
      "evidence": "A Back-navigation (POP) is accepted as a return to the original archive entry when anchor.archiveEntryKey === location.key. On BrowserRouter, any fresh document entry with no history state has the key 'default'. Scenario: the student loads /my-work/notes directly (key 'default') and clicks a note; remember() stores archiveEntryKey 'default'. They leave through the rail, so the anchor is kept because the PUSH carries no notesArchiveReturn state. Later, in the same tab, a full-document load of /my-work/notes produces another 'default' POP entry. matchingPop is true, so the stale anchor focuses and scrolls to an old note and settles all list reveals for that visit. The existing test 'ignores stale anchors on a direct default POP' uses an anchor without an archiveEntryKey, so it does not cover this case.",
      "fix": "Don't store an archiveEntryKey when location.key is 'default', or require location.key !== 'default' for matchingPop. Add a test where the stored archiveEntryKey is 'default' and the page arrives by POP with key 'default'."
    },
    {
      "id": "R2-detached-batch-entries",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts (queueListEntry / records)",
      "evidence": "Rows removed by a non-filter refetch or route-state change before the rAF stay in the `entering` map. The batch includes them, so n grows, the stagger step shrinks, and compareDocumentPosition gives an implementation-specific order for disconnected nodes. `records` also keeps every detached row and tween for the whole visit, so settleLists() and the resize pass keep visiting dead entries after repeated filtering or month regrouping. Visible rows still settle, but timing can drift from the 150ms/50ms contract and memory grows during long sessions.",
      "fix": "In the rAF callback, drop entries whose element is no longer connected (element.isConnected) before sorting. In discover(), remove records for disconnected elements after killing their ScrollTrigger."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts (current file), src/components/my-work/WorkFilterSelect.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/pages/MyWorkPage.tsx, src/pages/StudentDestination.tsx, src/pages/myWorkNotesRefinement.css, src/components/classroom/shell/ClassroomMotionContent.tsx.",
    "Read from the supplied tracked diff: TeachingNotesArchive.tsx and its tests, assignedWorkOrganization.ts, ClassroomRouteViews.tsx and its notes test, useClassroomMotion.test.tsx, MyWorkPage organization and readingCenter tests, StudentDestination test, MyWorkNotesPage.tsx, myWorkNotes.css, myWorkOrganization.css, both preview scripts, and docs/verification/platform-motion-20261022.md.",
    "Traced related code: every non-test caller of useClassroomMotion (TeacherSmartboard, StudentDossier, TeacherWorkspaceShell, the Reading Center AppShell, StudentDestination heading, ClassroomMotionContent inside ClassroomLayout). None is a DOM ancestor of the My Work content, so intent resolution cannot reach an unrelated owner. Also checked NOTE_TYPES, TEACHING_NOTE_TYPES/archiveNoteType and the reader's formatClassroomDate (local time zone, consistent with teachingNoteDate).",
    "Visual inspection: I opened and actually viewed stagger-work-phone.png (Guided drill selected, 2 of 4, groups and controls crisp at 390 wide) and stagger-notes-desktop.png (month section, lead row, charcoal Unread badges, 'Shared' dates, Type select). Neither showed a visual defect."
  ],
  "limitations": [
    "I did not run any tests, typecheck, build, browser session or motion recording. The test counts and runtime traces in the plan and docs are host-reported and I did not verify them.",
    "I did not open stagger-notes-phone.png, stagger-work-desktop.png, stagger-scroll-trace.json or stagger-viewport-checks.json. Reduced motion, overflow at 320/684/768/1024/1280 and keyboard runs were not visually checked.",
    "I read useAssignedTodoFeed.ts, components/ui/select.tsx, teachingNotesArchiveData.ts, MyWorkPage.refetch.test.tsx, useNotesArchiveScroll.test.ts and teachingNoteDates.test.ts only indirectly or not at all. Their contracts are inferred from callers and the diff.",
    "Real GSAP/ScrollTrigger timing (for example onEnter when a fast scroll jumps past a row), physical phone and Safari focus behaviour, production RLS and read state, and authenticated backend acceptance are not certified. The preview harness is synthetic.",
    "The rest of the dirty checkout was not reviewed, including supabase/functions/mcp/index.ts and anything outside the explicit scope paths. This is not whole-repository approval."
  ]
}

Host: snapshotmatches171tests/typecheck/buildpass. AcceptR1documentidentityforPOPdefaultcollisionwithoutbreakinggenuineinitialdefaultBack. AcceptR2prunedetachedlistqueueandrecordspreservinggenericbehavior. Regressiontestsandfreshinspectioncontinue.

## Continued inspection8: APPROVED withoneaccessiblenamefinding

{
  "verdict": "APPROVED",
  "summary": "I found no material correctness, security or spec-fidelity defects in the scoped remediation. These five remediation items are implemented as the plan describes:\n\n1. **Filter, restore and pagination intents.** `notifyClassroomListIntent` uses a module WeakMap and stops at the first registered owner. The archive, MyWorkPage filters and Clear filters call it before updating search params. Restore intent and the restore marker work even when the archive restores itself before the parent motion owner registers. Pointer Load more re-enables reveals; keyboard Load more does not.\n2. **One reveal batch.** Visible, async, paginated and below-fold rows share one frame queue, sorted in reading order. Delay spacing is min(.05, .15/(n-1)), rows use 8px / opacity / 240ms with no blur, and normal page sections keep their old 4-per-group / 24-per-page caps.\n3. **Return from the reader.** It settles every row before focus or scroll, and stale anchors only restore on a matching browser Back to the same history entry or an explicit return from the reader.\n4. **Filter values.** Subject and work type are checked against fixed lists, with `hasOwnProperty` blocking names like `toString`. Valid values that match no rows stay selected with Clear filters available, invalid values are ignored, and access filtering happens before matching and counting.\n5. **`list-only` policy.** The policy covers the My Work wrapper and the generic fallback, while other destinations keep their default entrance.\n\nThe motion key is the path only, so changing filters in the URL does not re-run or replay the hook. I traced callers, and `ClassroomMotionContent` is the only owner above the archive and work list; the StudentDestination heading has its own separate boundary.\n\nOne low-severity accessibility issue remains.",
  "findings": [
    {
      "id": "WFS-LABEL-IN-NAME",
      "severity": "low",
      "path": "src/components/my-work/WorkFilterSelect.tsx:23-29",
      "evidence": "The trigger's accessible name comes only from an sr-only span (\"Assignment type\" / \"Assignment subject\") via aria-labelledby. The only visible text is the value (\"All work types\", \"Guided drill\"). A voice-control user saying \"click All work types\" or \"click Type\" will not match the accessible name (WCAG 2.5.3 Label in Name). Sighted users also get no visible label, unlike the notes archive Type filter, which has a visible \"Type\" label (TeachingNotesArchive.tsx). The old subject <select> also used an sr-only label, so this is a continued pattern, not a regression in this pass.",
      "fix": "Show a short visible label (e.g. \"Type\" / \"Subject\") the same way the archive's teaching-notes-type-label does (visible on desktop, visually hidden at narrow widths if needed). Alternatively, make the accessible name include the visible value, e.g. aria-labelledby=\"{labelId} {triggerId}\"."
    }
  ],
  "coverage": [
    "Read the plan and the full tracked diff for every changed file in the manifest.",
    "Read the untracked/new files in full: src/components/my-work/WorkFilterSelect.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/pages/myWorkNotesRefinement.css.",
    "Read src/hooks/useClassroomMotion.ts lines 24-170, including classroomMotionKey (path-only key for /my-work/*, so filter URL changes don't re-run the hook), owner registration and restore-marker consumption, eligibility with the list-only policy, the batch scheduler, settle and prune.",
    "Traced callers: ClassroomMotionContent.tsx (the single shell owner, used in ClassroomLayout), StudentDestination.tsx (heading-only local boundary), and grep of the other callers (TeacherWorkspaceShell, Reading Center AppShell, StudentDossier, TeacherSmartboard). None of these is a nested owner above the My Work archive or work list.",
    "Read ClassroomRouteViews.tsx lines 255-369: Back to notes passes notesArchiveReturn state; the interactive-lesson iframe branch is unwrapped; the note reader wrapper is applied; reader dates use the same local timezone as archive dates.",
    "Checked MyWorkPage access gating: Reading Center library-only filtering and general access are applied before subject/type options, counts and matching.",
    "Checked the classroom.css overflow declarations to see what scrolls the page (only the sidebar card shows overflow: auto among the lines read)."
  ],
  "limitations": [
    "I did not open the host screenshots or JSON traces under C:/Users/Joshu/dev/ai-os/design/reviews/my-work-taste-v2-20261027/, so there was no visual inspection. Visual and material hierarchy, overflow at 320\u20131440, and how the menu looks in the portal were not independently verified.",
    "I did not run tests, typecheck, build or the browser preview. Host-reported test counts (56, 90) and build results are unverified.",
    "Real GSAP/ScrollTrigger behaviour is only checked in mocked tests. In particular, whether onEnter fires when a scroll jumps past a whole row in one frame (scrollbar drag, End key with focus outside the list root) can't be confirmed from code. If it doesn't, a paused row could stay at opacity 0. This needs a real-browser check.",
    "I did not review src/hooks/useAssignedTodoFeed.ts, src/components/ui/select.tsx, teachingNotesArchiveData.ts, MyWorkNotesPage.tsx (beyond its diff), the test files beyond their diffs, or ClassroomLayout's real scroll owner in depth.",
    "I did not review the broader dirty checkout outside the explicit scope, including supabase/functions/mcp/index.ts and the docs/plans files. This is not a whole-repository approval.",
    "Production RLS, persisted read state, the authenticated backend, physical phones/Safari, and every other shared caller's runtime behaviour were not reviewed or certified. The synthetic preview harness is not proof of backend acceptance."
  ]
}

Host: snapshotmatches175tests/typecheck/buildpass. AcceptWFS-LABEL-IN-NAME includevisiblevaluewithfieldlabelinnativecomboboxaccessiblenamewithoutvisualredesign; testsandfreshinspectioncontinue.

## Continued inspection9: APPROVED withpurepagescrollkeylow

{
  "verdict": "APPROVED",
  "summary": "I read every changed file in scope plus the related callers and found no material defect. The scoped implementation matches the five authorized remediation items.\n\n1. **Boundary intent.** `notifyClassroomListIntent` walks the ancestors of the element it is given and stops at the first registered owner. That owner lookup lives in a module WeakMap, which reduced-motion owners also register in, and owners are removed on unmount. The notes code (search, Unread, type, Clear) and the My Work code (`updateFilter`, Clear) both signal `filter` synchronously through their page or section ref before calling `setParams`. That includes choices made in the portaled menus.\n2. **Batching.** All list tweens start paused. Visible rows, rows that load later, Load more rows and scroll-entered rows all go through one per-frame queue. The queue drops disconnected rows, sorts by DOM order and spaces delays with step=min(.05,.15/(n-1)). Ordinary non-list blocks keep their old preset, their 4-per-group / 24-total caps and their 100px margin.\n3. **Restore.** Restore is signalled in the layout phase, before focus or scroll. When the shell owner is not registered yet (returning from the reader changes the motion key), a `data-motion-list-restore` marker covers the gap. Path-scoped storage, the nearest-survivor rule and read-state are unchanged.\n4. **Filter validity.** Subject and type values are checked against fixed lists of known values (`hasOwnProperty` blocks names like `toString`). A valid selection stays chosen even when no loaded row has it. Options and counts come only from rows the student is allowed to see. Invalid values are ignored and show all work, as before.\n5. **list-only policy.** `data-motion-policy=\"list-only\"` is set only on the My Work content wrapper. It blocks animation of the wrapper and its generic children while still letting explicit list rows reveal. The redundant loading/ready markers were removed in the same change. Other destinations and other hook callers (TeacherWorkspaceShell, the Reading Center AppShell, StudentDossier, TeacherSmartboard, the StudentDestination heading) see no behaviour change unless they opt in.\n\nI opened three host screenshots and could see them: notes-phone, work-desktop and work-phone. Notes-phone and work-desktop look consistent with the brief. In work-phone the two visible rows have different text insets, which I could not explain from the CSS (see limitations).\n\nRemaining issue: one low-severity finding about keyboard scrolling turning off reveals.",
  "findings": [
    {
      "id": "F1-scroll-keys-sticky",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "useList (lines 266-269) treats every keydown inside the root as keyboard list use. The only keys excluded are Meta, Control, Shift, Alt and Escape. It sets keyboardInteraction=true and calls settleLists(), and handleIntent('paginate') then refuses to clear listInteraction for the rest of the visit (line 263). Example: in Chromium, a pointer click on 'Load more notes' or 'Unread' leaves focus on that button inside the root. If the student then scrolls with PageDown, End or the arrow keys, every queued or pending scroll-triggered reveal settles at once, and later pointer Load more rows never reveal. The keydown fires while focus is on that button even though the key only scrolls the page and never reaches a row. The brief asks for reveals 'as they scroll' and for keyboard-reached content to be immediate, so pure page scrolling is caught by a rule meant for keyboard travel between rows.",
      "fix": "Count keydown as list use only when it can move focus or edit content: Tab, Enter or Space on a row or control, or keys typed in input/textarea/contenteditable/combobox. Ignore PageUp, PageDown, Home, End and arrow keys when the target is not an editable element or a list row; Space on a button already counts as activation. Add a test showing that PageDown after a pointer Load more keeps the queued reveal and still allows a later pointer paginate."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useClassroomMotion.ts (current), src/components/my-work/WorkFilterSelect.tsx, src/pages/MyWorkPage.tsx, src/pages/StudentDestination.tsx, src/components/my-work/teachingNoteDates.ts, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/pages/myWorkNotesRefinement.css, src/pages/myWorkOrganization.css, src/components/classroom/shell/ClassroomMotionContent.tsx",
    "Read the full supplied diff for: TeachingNotesArchive.tsx and its tests, ClassroomRouteViews.tsx and its notes test, assignedWorkOrganization.ts, useClassroomMotion.test.tsx, MyWorkPage.organization and readingCenter tests, StudentDestination.tsx and its test, myWorkNotes.css, MyWorkNotesPage.tsx, scripts/verification/my-work-preview.tsx, start-my-work-preview.mjs and docs/verification/platform-motion-20261022.md",
    "Traced callers: every useClassroomMotion caller (ClassroomMotionContent, StudentDestination heading, TeacherWorkspaceShell, the Reading Center AppShell, StudentDossier, TeacherSmartboard), App.tsx route nesting for /my-work (all three tabs sit inside StudentDestination's list-only wrapper), test mocks of the hook module, formatClassroomDate/NOTE_TYPES, and classroom.css student-work-row rules",
    "Checked the React commit-order path for reader Back when the motion key changes (old owner removed, child restore leaves a marker, the new owner picks it up on its first discovery), restore when notes load asynchronously, the order of filter intent and URL commit, pointer vs keyboard pagination, pruning of removed rows, and that options/counts cannot be inferred from rows the student is not allowed to see",
    "Images opened and visually inspected: stagger-notes-phone.png, stagger-work-desktop.png, stagger-work-phone.png"
  ],
  "limitations": [
    "I did not run any tests, typecheck, build or browser. The host's claims (90 tests passed, rendered checks, the stagger-scroll-trace timings) are unverified.",
    "Real GSAP/ScrollTrigger behaviour is not covered by the unit tests, which mock GSAP: for example, whether once:true kills a paused list tween, and progress(1) after scrollTrigger.kill(). Only the host's runtime trace speaks to it.",
    "I did not open stagger-notes-desktop.png, stagger-scroll-trace.json, stagger-viewport-checks.json or REPORT.md.",
    "In stagger-work-phone.png the first 'To start' row is tinted, probably a sticky :hover after a tap (the hover rule in classroom.css applies on touch devices too), and its text inset differs from the 'Progress to confirm' row (about 59px vs 78px from the edge). I could not attribute this to any CSS in scope. The host should re-capture to confirm the rows line up on phone.",
    "No physical phone or Safari, production authentication/RLS, persistent read-state or Supabase acceptance was reviewed. The preview fixture is synthetic.",
    "Not reviewed: the broader dirty checkout outside the scoped paths, including supabase/functions/mcp/index.ts, untracked docs/plans files and .taste-skill/. This is not whole-repository approval."
  ]
}

Host: snapshotmatches175tests/typecheck/buildpass. Acceptclassifykeyboardfocus/edit/activationversusnoneditablepagescroll; preserveimmediatekeyboardreachedcontentwithoutdisablingpurepagereveals. PreviouslyreportedphoneinsethistoricalartifactwasfixedCSSspecificityinpriorround; refreshhostrenderedproofasneeded.

## Continued inspection10: BLOCKED by Claude session quota

Fresh inspection failed before model work, no completedreview/noapproval. Result claudex-jk37sikm/result.json. stdoutfirstparty429 usage_limit_reached: sessionlimit resets1am America/Toronto, meaning2026-10-28 01:00EDT fromverifiedcurrent2026-10-27 22:41EDT. Nofallbackorblindretry. Finalpurepagekeydowncorrectionstillindependentlyunreviewed; allpreviousreportedfindingsimplemented. No commit/push/publish. Hostfinalproofinprogress.

## Latest status: Claude quota blocks the final inspection

2026-10-27: The user authorized continuing beyond the former round limit until no unresolved findings and explicitly prohibited pushing. Every finding from completed inspections has been corrected. The last correction distinguishes pure page-scroll keys from keyboard focus/editing/activation, preserving scroll reveals.

Claude Opus 5.5 Medium could not inspect this correction: first-party API 429 usage_limit_reached, session resets 2026-10-28 01:00 America/Toronto. Failed run: claudex-jk37sikm/result.json. Last completed run: claudex-neg1uqpr/result.json, APPROVED with one low finding, now fixed but not independently re-reviewed. This is not a clean final independent sign-off. No provider/model fallback was used.

Final local proof: 193 tests passed across 9 suites; JSON full rerun exited0 with no reported errors (final-tests.json). A preceding run passed all193 assertions but exited1 with one after-teardown timer error attributed to the refetch test environment. An isolated rerun and full JSON rerun were clean. GSAP import-time timers are a plausible cause, not established without the lost stack; no speculative mock or product edit was made. Typecheck and production build exit0; existing build warnings remain. Scoped diffcheck exit0; final source files match the failed inspection's frozen snapshot. Unrelated backend hash unchanged.

Real-browser refreshed checks: 390px fast jump to archive bottom left all4visible rows fully revealed after650ms, no horizontal overflow. Current390px assigned-work rows all compute flex-start and content left43.153px. New screenshot capture was disrupted by hot reload/emulation and is diagnostic only; older preserved readable screenshots remain historical. Browser overrides were reset. Production authentication/RLS/read-state, physical phones and Safari are not certified.

No commit, push or publication. Resume with a fresh inspect invocation using the same repo, approved plan, base and exact scopes from claudex-jk37sikm/result.json after quota reset. Do not treat the failed invocation as approval or resume its failed session. Continue supported fixes and fresh reviews until no unresolved findings.


## 2026-10-28: resumed note transition plan review

{
  "verdict": "REVISE",
  "summary": "The core reader entrance in `src/hooks/useNoteReaderTransition.ts` is mostly sound. One GSAP owner lives in the persistent shell. Rapid changes cancel the previous sequence by rebasing from the current x offset. Delayed content joins through a MutationObserver keyed by `playedKey`, so it does not replay. The ResizeObserver guard handles scrollbar width changes, and the generic owner skips the reader through `.classroom-motion-local`. I found two medium defects that need fixing. First, the stage-travel tween runs on every ClassroomLayout navigation, not just archive-to-reader. Second, the saved stage position and rail state go stale whenever the rail appears or disappears without a route change. In that case the original abrupt jump can come back, or the stage can slide when it should not. I also found smaller gaps against the plan: CSS transitions stay disabled for the whole route instead of only during the entrance, the stage offset reads wrong under the archive CSS override, and interactive-lesson notes are not covered. Required proof items 3\u20136 were not visible in the repository.",
  "findings": [
    {
      "id": "NRT-1",
      "severity": "medium",
      "path": "src/hooks/useNoteReaderTransition.ts",
      "evidence": "`navigateRef.current` runs for every `location.pathname`/`location.key` change in ClassroomLayout (`ClassroomLayout.tsx:934`). In `play()`, `newShell = shellKey !== currentKey` is true on every navigation. Line 76 then tweens `main` by `fromLeft - destinationLeft` whenever the stage edge moved, and no route or mode is checked. Example: going from `/flagged` (flagged rail visible) to `/review`, or from `/journal` to `/practice`, or a reader's 'Back to notes' whose `returnTo` is `/my-work`. Each changes the stage left edge by about 320px, so the whole stage gets a 0.52s x-tween on routes the plan never covered. On those routes `data-note-transition-mode` is undefined, so the column's max-width/padding CSS transitions (`classroom.css:842-852`) run at the same time as the transform, which is the conflict the plan says to disable. The transform also creates a containing block for any `position: fixed` descendants of the stage while it plays. This breaks 'Preserve generic animation behavior elsewhere' and the archive-to-reader-only scope.",
      "fix": "Only run the stage/rail shell sequence when the destination is a note reader (`expectedId` is set) and the previous settled route was the notes archive, or at least when entering reader mode. For every other navigation, call `measure()` and return without adding a stage tween. Add a test showing that a rail-toggling non-note navigation (for example `/flagged` \u2192 `/review`) creates no stage tween."
    },
    {
      "id": "NRT-2",
      "severity": "medium",
      "path": "src/hooks/useNoteReaderTransition.ts",
      "evidence": "`previousLeft` and `previousRail` only update in `navigate`, in `play`, or in `onResize`. `onResize` watches the root and the window, not the stage or rail, so it misses changes to the stage edge that leave the root's size alone. The rail can mount or unmount without a navigation in two ways. (a) `openSection` sets `selectedSection` on `/classroom` (`ClassroomLayout.tsx:1001,1059`), which renders the notes rail while the route stays the same. When the user then clicks a rail note, `fromLeft` still holds the stale 280px, `destinationLeft` is 600, and `previousRail` is false. The stage slides 320px even though nothing moved, and the rail paper, which was already on screen, fades back in from opacity 0. (b) The notes rail is gated on `!permissions.loading` (`ClassroomLayout.tsx:1002-1005`). If permissions are still loading when the reader commits, `hasRail` is false, so `enteringRail` is false. When the rail mounts afterwards, `play()` reaches only the reader blocks, or returns early if the reader is already shown. The stage then jumps 280\u2192600 with no tween, which is the original defect.",
      "fix": "Track the settled geometry continuously: observe the stage and rail elements (or their parent) with the ResizeObserver, and refresh `previousLeft`/`previousRail` whenever no owned timeline is running. If the rail or stage edge changes after commit but under the same `currentKey`, treat it as a late shell change: tween from the last settled left edge and run the rail entrance. Add tests for a rail opened in place followed by a note click, and for a rail that mounts after commit."
    },
    {
      "id": "NRT-3",
      "severity": "low",
      "path": "src/styles/note-reader-transition.css",
      "evidence": "Lines 2-3 set `transition: none !important` on `.classroom-column`/`.classroom-stage` for the whole time `data-note-transition-mode` is present. ClassroomLayout sets that attribute to 'reader' for every `/classroom/item/*` route, including non-note items such as self-contained homework and documents (`ClassroomLayout.tsx:1131`), and to 'archive' for `/my-work/notes`. The plan says to disable conflicting column transitions during the entrance and restore them afterward. Here they stay off for the life of the route and also on routes that are not notes.",
      "fix": "Turn the suppression on only while the owned timeline is active, for example with an attribute the hook sets in `play()` and removes on complete, kill or revert. Alternatively, limit the reader mode to note items."
    },
    {
      "id": "NRT-4",
      "severity": "low",
      "path": "src/hooks/useNoteReaderTransition.ts",
      "evidence": "On a reader\u2192archive navigation, line 76 still runs `fromTo(main, {x: 320})`, but `note-reader-transition.css:4` forces `transform: none !important` in archive mode, so nothing moves on screen while GSAP's x stays non-zero for 0.52s. If the user reopens a note within that window, line 90 reads `gsap.getProperty(stage,'x')` (for example 200) and computes `fromLeft = 280 + 200`. The reader stage then travels about 120px instead of 320px.",
      "fix": "Skip the stage tween when the destination is archive mode, which NRT-1 would cover. Alternatively, compute the visual offset as the difference between `getBoundingClientRect().left` and the untransformed layout position, rather than trusting the GSAP x property."
    },
    {
      "id": "NRT-5",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "The interactive-lesson note branch (lines 289-310) returns an iframe without a `data-note-reader` wrapper. On a PUSH into that note, `scrollToReader` is never used, so the reader stays at the archive's deep scroll offset and the content gets no coordinated reveal. Meanwhile the shell/rail sequence still runs, because `expectedId` is set. The plan says a new note PUSH may reset the reader to the top before measurement.",
      "fix": "Wrap the interactive-lesson branch in `data-note-reader={item.id}`, with the back button and iframe as reader blocks. Alternatively, have the hook scroll to the top on a reader PUSH once ClassroomItemView settles, whether or not the marker is present."
    }
  ],
  "coverage": [
    "The plan text in full",
    "src/hooks/useNoteReaderTransition.ts (complete)",
    "src/hooks/useNoteReaderTransition.test.tsx (complete)",
    "src/styles/note-reader-transition.css (complete)",
    "src/components/classroom/shell/ClassroomLayout.tsx: hook wiring, mode attribute, activeSection/permissions gating, openSection/selectedSection, rail/stage markup, SectionList notes rows and openRow",
    "src/hooks/useClassroomMotion.ts (complete): the generic-owner exclusion through .classroom-motion-local and EXCLUDED",
    "src/components/classroom/shell/ClassroomMotionContent.tsx",
    "src/hooks/useClassroomRailMotion.ts: confirmed it animates only the primary-nav marker",
    "src/components/classroom/ClassroomRouteViews.tsx ClassroomItemView: reader markers, read-state invalidation, interactive-lesson branch",
    "src/components/classroom/classroom.css: root, stage, column and section-list geometry, z-index, and the existing geometry transitions",
    "scripts/verification/my-work-preview.tsx: how the fixture wires the hook and shell markup (grep only)"
  ],
  "limitations": [
    "I could not run the tests, typecheck, build or browser playback, so this review does not claim that any of them pass.",
    "I found no saved natural-playback recordings, stage-position samples or phone/desktop screenshots for this transition in the repository's docs/verification. Proof items 3\u20135 are unverified. The before-evidence the plan cites (C:/Users/Joshu/dev/ai-os/design/...) is outside this worktree and I did not inspect it.",
    "The unit tests mock gsap entirely, so timing, clearProps and immediateRender behaviour is untested at unit level. The fixture in scripts/verification/my-work-preview.tsx re-creates the shell markup instead of mounting ClassroomLayout, and its mode logic differs (it marks 'reader' only when readerId is set). It may therefore miss production-only paths such as NRT-1 and NRT-2.",
    "I did not inspect MyWorkNotesPage/TeachingNotesArchive scroll-anchor and focus-restoration code in detail, so I am taking it on trust that POP restoration is unaffected beyond the hook not scrolling on POP.",
    "Other modified files in the branch (supabase/functions/mcp/index.ts, StudentDestination, MyWorkPage, etc.) were not reviewed for this scope."
  ]
}

Host dispositions: accept NRT-2 late/in-place rail geometry, modify NRT-3 to active owned suppression plus archive prelayout restoration exception, accept NRT-5 interactive note boundary. NRT-1 and NRT-4 causal claims conflict with the current play guard that returns when expectedId is absent; add explicit non-item navigation and rapid archive reopen regressions, then ask Claude to reassess. No final approval. No commit/push/publish.


## Note transition review2 and fresh expanded inspection1

Result: claudex-373buamr
{
  "verdict": "APPROVED",
  "summary": "The revision fixes the material issues from the first review. NRT-1 and NRT-4 are withdrawn: I was wrong. The early return in `play()` (`if (disposed || !expectedId) return`, now line 54, and also in the version I reviewed before) already stops non-item destinations and archive Back from creating any stage tween. Those two findings came from my misreading, not from a defect. NRT-2 is resolved: `synchronizeGeometry()` re-measures settled geometry whenever no animation is running. It now catches a rail that mounts in place or late under the same route key, both through the MutationObserver (which runs before paint) and through ResizeObserver, which now watches the real stage and rail. A late rail starts from the last visual left edge, and reader blocks that already played do not replay. NRT-3 is resolved as modified: suppression now follows `data-note-transition-active`, which is set in `play()` and cleared on completion, on an early bail-out and in `reset()`. The archive-mode transform and transition exception is now stated in the plan on purpose. NRT-5 is resolved: the interactive-lesson iframe branch now has `data-note-reader`, `classroom-motion-local` and block markers, and keeps its sandbox, srcDoc, sizing and Back control. Sidebar selections carry the archive origin through `notesArchiveOrigin` in `openRow`. One small gap against the plan's 'no stale anchor' rule remains (NRT-6, low). It does not block approval. The required final rerun and natural-playback proof are still outstanding on the host side.",
  "findings": [
    {
      "id": "NRT-6",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "`archiveReturnId = archiveOrigin?.id ?? itemId` (line 203). A reader with no explicit origin still sends `notesArchiveReturn: itemId` from both Back buttons (lines 299, 363). TeachingNotesArchive.tsx:79-81 accepts any return id that matches the stored `anchor.id`. Scenario: the student opens note X from the default archive, which stores the anchor {id:X, ids:[...]}. They leave through the primary nav, so the anchor is never consumed. Later they reach X from Home or a notification link with no state and press 'Back to notes'. The archive then restores the old session's anchor: it scrolls to X and focuses it, and the restore intent cuts short the list entrance. The plan says an unrelated reader with no explicit origin must not restore a stale archive anchor. ClassroomNotesJourney.test.tsx:59 only covers an anchor id that differs from the reader, so this same-id case is untested.",
      "fix": "If there is no validated `archiveOrigin`, navigate to `notesReturnTo` without `notesArchiveReturn` (or with an explicit null). Add a journey test where the stale anchor id equals the reader id opened without an origin."
    }
  ],
  "coverage": [
    "src/hooks/useNoteReaderTransition.ts (current version, complete): checked the expectedId guard, the active-attribute lifecycle, synchronizeGeometry/observeGeometry, the late-rail path, onResize ordering, focus/Tab/reduced-motion finish and dispose",
    "src/styles/note-reader-transition.css (current version, complete)",
    "src/components/classroom/ClassroomRouteViews.tsx ClassroomItemView, including the interactive-lesson branch and read-state reconciliation",
    "src/lib/myWorkNotesNavigation.ts (complete): checked validateNotesReturnTo and notesArchiveOrigin",
    "src/components/my-work/TeachingNotesArchive.tsx: anchor storage, the POP/return restore gate and the card origin state",
    "src/components/classroom/ClassroomNotesJourney.test.tsx: the stale-anchor and B\u2192A\u2192archive history tests",
    "Context from the earlier pass that this revision still relies on: ClassroomLayout wiring, the activeSection/permissions gating and openRow, useClassroomMotion's exclusion of the reader, and the classroom.css stage/rail geometry and z-index"
  ],
  "limitations": [
    "I could not run the tests, typecheck, build or browser playback, so I do not claim that any of them pass. The host says the final expanded rerun and build are still needed.",
    "I did not inspect the natural-playback recordings, stage-position samples or phone/desktop screenshots the host mentions, so proof items 3\u20134 are unverified from my side.",
    "The unit tests for the hook mock GSAP, so real timeline semantics (immediateRender, clearProps, onComplete after `finish()`) are checked only by reading the source.",
    "I did not re-read the new hook regressions the host cites (flagged-to-review creating zero timelines, rapid archive reopen). I re-checked the guard they depend on in the source instead.",
    "The broader earlier remediation (my-work-scroll-filters-gemini-review.md) and the other modified files in the branch, including supabase/functions/mcp/index.ts, were not re-reviewed in this pass."
  ]
}

Result: claudex-hwanxrbj
{
  "verdict": "REVISE",
  "summary": "I read the source of the new reader-transition owner (`useNoteReaderTransition` and its CSS), the reader markers in ClassroomRouteViews, the shell wiring and origin carry-through in ClassroomLayout, the `notesArchiveOrigin` helper, archive restoration in TeachingNotesArchive, `useNotesArchiveScroll` and the shared list-motion changes in `useClassroomMotion`. I found no high or medium defects. The main paths look correct from the source: archive-to-reader stage inversion, rapid-cancel rebasing, rail arriving late under the same key, ending in an untransformed state, no replay of already visible content on refetch, reduced motion and archive-mode transform suppression. The NRT-6 fix holds: with no validated origin the reader sends `state: null`, and the archive's `returningId == null` guard then skips restoration. Three low findings remain. One is in the pure page-scroll key correction, which had not been inspected before. The other two are scope leaks: the stage/rail entrance applies to non-note items, and unused reader markers were added to views that have no reader owner.",
  "findings": [
    {
      "id": "FIN-1",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "In `useList`, `rowTravel` treats ArrowUp/Down/Left/Right, Home, End, PageUp and PageDown as list travel whenever the target is inside `[data-motion-list] [data-motion-item]`, and it then sets the sticky `keyboardInteraction = true`. The archive cards (`TeachingNotesArchive.tsx`) and assigned-work row links have no roving or arrow-key handler, so these keys on a focused card just scroll the page. Failure scenario: a pointer user returns from a reader. The archive restore focuses the original card (`target.focus` in the layout effect). The user presses PageDown or ArrowDown to scroll. That makes `keyboardInteraction` sticky, so the user's later pointer 'Load more notes' (`paginate`) can no longer reset `listInteraction`, and the new rows never reveal. This contradicts the stated rule that pure page-scroll keys do not suppress scroll reveals. The test row `['ArrowDown','a']` / `['PageDown','a']` in `useClassroomMotion.test.tsx` locks in this behavior.",
      "fix": "Count arrow/Home/End/Page keys as row travel only when the list really handles them (for example an explicit `data-motion-list-keyboard` opt-in or a roving-tabindex container). Otherwise treat them like the pointer-focused-button case, or require `event.target.matches(':focus-visible')` before making the interaction sticky. Update the test matrix to match."
    },
    {
      "id": "FIN-2",
      "severity": "low",
      "path": "src/components/classroom/shell/ClassroomLayout.tsx",
      "evidence": "`data-note-transition-mode` is set to 'reader' for every `/classroom/item/` path. In `useNoteReaderTransition.ts`, `readerId()` gives an `expectedId` for any item route, so `play()` runs the stage x-inversion and rail paper/row stagger (`newShell`, `enteringRail`) even when there is no `[data-note-reader]`. Example: a homework or TA item opened from a route with no rail (or a different stage edge) gets a 320px stage tween and a rail stagger. At the same time, ClassroomMotionContent still runs its generic blur entrance on that item's content. The plan says non-note items keep their existing behavior and that the reader must have no competing tween owner. The test 'does not scroll a non-note item with no owned reader marker' checks scrolling only, not stage or rail travel.",
      "fix": "Own the shell tween only for note readers. Either defer stage/rail work until a matching `[data-note-reader]` exists or loading is resolved, or set mode/`expectedId` only when the item is a note (for example a `data-note-transition-owned` attribute on the reader wrapper that `play()` requires before animating the stage). Add a test showing that a non-note item route gets no stage/rail tween."
    },
    {
      "id": "FIN-3",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "`data-note-reader-block` was added to `ClassroomRecapsView` (h1), `ClassroomUploadsView` (h1), `ClassroomAssignmentView` (actions) and `ClassroomTAAssignmentView` (article, actions). None of these views renders a `[data-note-reader]` wrapper, so the reader owner never targets them; `play()` only queries blocks inside `reader`. The markers are dead and suggest these views are reader-owned when they are not, which risks future mis-scoping (for example the reduced-motion selector in `note-reader-transition.css` matches them).",
      "fix": "Remove `data-note-reader-block` from non-note views, or deliberately bring those views under the reader owner and test it."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useNoteReaderTransition.ts, src/styles/note-reader-transition.css, src/hooks/useNotesArchiveScroll.ts",
    "Read ClassroomItemView in src/components/classroom/ClassroomRouteViews.tsx (lines 195-370 plus the diff), including the interactive branch, which is limited to note types",
    "Reviewed every diff hunk in the provided TRACKED DIFF: ClassroomLayout wiring and openRow origin carry, TeachingNotesArchive restoration/POP/origin logic, the notesArchiveOrigin helper and tests, useClassroomMotion list ownership, intents and the page-scroll key logic, MyWorkPage filters/focus, StudentDestination list-only policy, CSS edits, the preview fixture and its launcher script",
    "Grepped classroom.css transitions to check how the stage/column padding and max-width transitions interact with data-note-transition-active and archive-mode suppression",
    "Grepped ClassroomLayout notes rail routes to confirm returnTo/origin propagation for rail selections",
    "Listed the test names in src/hooks/useNoteReaderTransition.test.tsx (did not read the bodies)",
    "Traced the NRT-6 regression: a reader with no origin sends state null, and the archive returns without restoring or consuming the anchor"
  ],
  "limitations": [
    "I could not run tests, typecheck, builds or a browser. Every behavioral conclusion comes from reading source, and no claim here says tests passed.",
    "I did not read in full: useNoteReaderTransition.test.tsx bodies, ClassroomNotesJourney.test.tsx, ClassroomLayout.test.tsx, useNotesArchiveScroll.test.ts, MyWorkPage.refetch.test.tsx, WorkFilterSelect.tsx, useNotesSelectMotion.ts, teachingNoteDates.ts/test, myWorkNotesRefinement.css. These are in scope and in the manifest but their contents were not shown in the diff, so their correctness is not confirmed.",
    "I did not read docs/plans/my-work-scroll-filters-gemini-review.md. Earlier-remediation fidelity was checked only through the code in the diff.",
    "I did not inspect the host evidence outside the repo (local-desktop-final-trace.json, PNGs). GSAP runtime behavior, such as re-enabling a completed timeline when blocks are appended for delayed content, is inferred from GSAP semantics, not observed.",
    "The fixture uses the real secondary rail and stage geometry but not the full authenticated ClassroomLayout (permissions, profile readiness, mobile flyout), so integrated production behavior is unverified.",
    "Out-of-scope areas are unreviewed: supabase/functions/mcp/index.ts (excluded as unrelated), the rest of classroom.css beyond its transition rules, and all other repository files. This is not whole-repository approval."
  ]
}

Host: NRT6 same-id stale origin corrected with25focusedtests. Expanded239tests and typecheck/build passed before the new inspection findings. Accept FIN1 pure scroll on focused links, FIN2 note-only shell ownership, FIN3 remove unused nonnote markers. Currentsourcecorrections inprogress, nofinalapproval, no commit/push/publish.


## Continued plan review3 and expanded inspection2

Result: claudex-d9q3vm1x
{
  "verdict": "APPROVED",
  "summary": "I re-checked this revision against the earlier findings and the host's FIN-1, FIN-2, FIN-3 and NRT-6 dispositions. All of them are resolved in source. FIN-2: `play()` in `useNoteReaderTransition.ts` now only coordinates the stage and rail when it finds a matching reader marker or a matching `data-note-target-id` row in the real notes rail. An item it cannot confirm records its current geometry as the baseline and marks the shell as settled, so later confirmation reveals only the reader. A rail that mounts late because of permissions still starts from the last settled edge. The MutationObserver also watches `data-note-target-id`. The rail lists every note, so a note opened from deep in the archive is still confirmed. FIN-3: the shared heading, standfirst and article block markers are now conditional on note types. NRT-6: both Back buttons send `state: null` when there is no validated origin. FIN-1: plain arrow, Page, Home and End keys on ordinary links no longer lock list reveals off. The new files `WorkFilterSelect`, `useNotesSelectMotion` and `teachingNoteDates` are sound apart from one minor replay. I found two low-severity residuals and nothing material. This approval covers the source and plan only. Browser acceptance and the final build and test rerun remain host-side evidence that I did not verify.",
  "findings": [
    {
      "id": "FIN-4",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "Line 273 treats `' '`/`'Spacebar'` on any `a[href]` (and on any `[data-motion-list] [data-motion-item]` row) as activation. That sets `keyboardInteraction = true` and permanently settles the lists. Native links activate on Enter, not Space: Space scrolls the page. Scenario: Back restores focus to an archive card `<Link>` (`TeachingNotesArchive.tsx:87`), and the student presses Space to page down. After that, a pointer Load more cannot re-enable reveals, because `handleIntent('paginate')` only clears `listInteraction` when `!keyboardInteraction` (line 263). This works against FIN-1's stated goal that pure scrolling on a restored card keeps pointer pagination eligible. The test at `useClassroomMotion.test.tsx:245` (`[' ', 'a']`) asserts this behaviour.",
      "fix": "Treat Space as activation only for button-like targets (`button, [role=button], [role=menuitem]`, plus rows that are not native links). Treat Space or Shift+Space on `a[href]` as scrolling. Update the test matrix to match."
    },
    {
      "id": "FIN-5",
      "severity": "low",
      "path": "src/components/my-work/WorkFilterSelect.tsx",
      "evidence": "`setContentRef` depends on `motionRef`, which `useNotesSelectMotion` rebuilds whenever `open` or `modality` changes. Scenario: the student opens a filter with the keyboard, so modality is 'keyboard' and the menu opens without motion, then clicks an option with the mouse. `onPointerDownCapture` records 'pointer', the callback ref is re-invoked on the already-open node, and `fromTo` restarts the menu from opacity 0.6, scale 0.98 just as the selection is made. The menu visibly flickers as it closes. Replay on a modality change is not covered.",
      "fix": "Animate only on the transition from closed to open, for example by keeping the open-time modality in a ref and tracking whether this open has already animated. Do not re-run the entrance when only the modality changes while the menu is open."
    }
  ],
  "coverage": [
    "docs/plans/my-work-note-reader-transition.md (current text, as provided)",
    "docs/plans/my-work-scroll-filters-gemini-review.md (read in full)",
    "src/hooks/useNoteReaderTransition.ts (current version, complete): the confirmation gate, unconfirmed baseline, late-rail synchronization, active-attribute lifecycle, observers, finish/reset/dispose",
    "src/hooks/useNoteReaderTransition.test.tsx (complete): cases for confirmed and unknown items, delayed rail, rail opened in place, non-item toggles, archive reopen, reduced motion, completion and reset",
    "src/hooks/useNotesSelectMotion.ts (complete)",
    "src/components/my-work/WorkFilterSelect.tsx (complete)",
    "src/components/my-work/teachingNoteDates.ts (complete)",
    "src/styles/note-reader-transition.css (current, from the previous round; the host reported no change)",
    "src/hooks/useClassroomMotion.ts keyboard classification in useList, plus the FIN-1 test matrix in useClassroomMotion.test.tsx",
    "src/components/classroom/ClassroomRouteViews.tsx: block-marker conditionals, interactive reader and archiveReturnState",
    "src/components/classroom/shell/ClassroomLayout.tsx: noteRows (all notes), data-note-target-id rows and the openRow origin chain",
    "Searched for every data-note-reader/data-note-target-id producer and test"
  ],
  "limitations": [
    "I could not run tests, typecheck, build or a browser, so nothing here claims that they pass. The hook tests mock GSAP, so real timeline timing, clearProps and immediateRender behaviour is checked only by reading the source.",
    "I did not open the host's design-directory evidence (natural stage trace, the desktop and phone screenshots including local-reader-phone-calibrated.png), so proof items 3\u20134 are unverified from my side.",
    "This round I did not re-read in full teachingNoteDates.test.ts, TeachingNotesArchive.tsx beyond the restore and card paths, useNotesArchiveScroll.ts, MyWorkPage.tsx, assignedWorkOrganization.ts, the My Work CSS files, select.tsx or scripts/verification/*. Earlier rounds covered them, or they are outside the changes the host lists.",
    "The broader dirty checkout, including the unrelated supabase/functions/mcp/index.ts edit, was not reviewed.",
    "The plan's own step 6 asks for a final source inspection in a fresh session, which this round does not replace."
  ]
}

Result: claudex-ds66687h
{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the final scope. That covers the note reader transition (`useNoteReaderTransition`, the shell markers in ClassroomLayout, the reader blocks in ClassroomRouteViews and `note-reader-transition.css`), the carrying of archive origin, the NRT-6 fix, and the earlier scroll/filter remediation, including the page-scroll key correction in `useClassroomMotion`.\n\nWhat I checked holds up:\n- **Archive to reader:** the stage starts from the last settled edge and finishes at its new position. Geometry transitions are switched off before the new edge is measured. Archive mode keeps its forced `transform: none` and no-transition rules, so the child's anchor restore never measures a stage that is still moving.\n- **Rapid changes:** a route change part-way through an entrance restarts from the stage's current visual position, and `scope.revert` clears any hidden rail or reader styles.\n- **Confirmation guard:** stage and rail motion only run once a matching rail row or reader marker exists. Non-note items, which have neither, get no shell motion. Delayed content reveals only the reader, and refetches under the same route don't replay it.\n- **Generic entrance:** the reader is marked `classroom-motion-local`, so the shared entrance skips it.\n- **NRT-6 is fixed:** `ClassroomItemView` sends `notesArchiveReturn` only when `notesArchiveOrigin` validates both the origin and the URL `returnTo`. `TeachingNotesArchive` returns early when there is no returning id. `ClassroomNotesJourney.test.tsx` tests both the unrelated-note and same-note stale-anchor cases.\n- **Sidebar note selection:** `openRow` passes along only an origin that validates against the current `returnTo`.\n\nThree low-severity items remain, listed below. These are source-inspection results only: I ran no tests or builds and played no motion recordings.",
  "findings": [
    {
      "id": "FIN-1",
      "severity": "low",
      "path": "src/hooks/useClassroomMotion.ts",
      "evidence": "In `useList`, Space counts as activation whenever the target is inside a list row or matches `a[href]`. Browsers don't activate links on Space: they scroll the page. Example: Back restores focus to an archive card link, the user presses Space or Shift+Space to page down, and `keyboardInteraction` becomes true and stays true. All list rows are settled at once, and a later pointer Load more no longer reveals its rows for the rest of the visit. That conflicts with the intent of the final page-scroll correction, which `useClassroomMotion.test.tsx` checks for PageDown/arrows/Home/End on a restored card link but not for Space. The test `keeps meaningful ' ' interaction on a` actually requires the sticky behaviour.",
      "fix": "Treat Space as activation only for buttons and button-role elements, not for `a[href]` or list rows. Add Space to the 'preserves pointer pagination after %s on an archive-restored ordinary card link' cases, and drop `[' ', 'a']` from the sticky-activation table."
    },
    {
      "id": "FIN-2",
      "severity": "low",
      "path": "src/hooks/useNoteReaderTransition.ts",
      "evidence": "The navigation layout effect (line 170) has no dependency list, so it runs on every ClassroomLayout render. When the key is unchanged it still calls `synchronizeGeometry`, `observeGeometry` and `play`. Each call reads `getBoundingClientRect` on the stage and rail, which forces a synchronous layout on every shell re-render (profile, permissions, theme, menu state and so on), not just on navigation. Correctness isn't affected, but it adds layout work to unrelated updates.",
      "fix": "Re-run the same-key path only when pathname, navigationKey or navigationType change, or when the existing MutationObserver/ResizeObserver report a relevant change. Those observers already cover late rails and late readers."
    },
    {
      "id": "FIN-3",
      "severity": "low",
      "path": "src/components/classroom/ClassroomRouteViews.tsx",
      "evidence": "Line 1 adds `import { notesArchiveOrigin } from '@/lib/myWorkNotesNavigation';` above `import * as React`, and line 6 still imports `validateNotesReturnTo` from the same module. That is a duplicate module import placed out of the file's existing order, unlike the surrounding code.",
      "fix": "Merge them into one `import { notesArchiveOrigin, validateNotesReturnTo } from \"@/lib/myWorkNotesNavigation\";` in the existing import position."
    }
  ],
  "coverage": [
    "Read in full: src/hooks/useNoteReaderTransition.ts, src/styles/note-reader-transition.css, src/hooks/useNotesArchiveScroll.ts, src/hooks/useNotesSelectMotion.ts, src/components/my-work/WorkFilterSelect.tsx, src/pages/myWorkNotesRefinement.css.",
    "Read from the supplied tracked diff: useClassroomMotion.ts (list ownership, intents, rAF batching, page-scroll key handling, prune/resize/print), TeachingNotesArchive.tsx (restore/POP/origin/focus recovery), ClassroomRouteViews.tsx, ClassroomLayout.tsx, myWorkNotesNavigation.ts, MyWorkPage.tsx, StudentDestination.tsx, the CSS changes, the preview fixture/script, the docs addendum and the changed tests.",
    "Read in the repo: the ClassroomLayout source around openRow/SectionList, activeSection, rootClass and StageFallback; the ClassroomItemView source, including the interactive and detail-action branches; classroom.css stage, column, rail and sidebar geometry and transitions; the notes palette variables in myWorkNotes.css.",
    "Traced related callers: App.tsx imports ClassroomItemView eagerly (no Suspense-delayed reader); the full archive \u2192 reader \u2192 rail \u2192 Back/POP chain in ClassroomNotesJourney.test.tsx; the test titles in useNoteReaderTransition.test.tsx.",
    "Rechecked NRT-6: same-id and unrelated stale anchors are not restored when the reader has no validated origin."
  ],
  "limitations": [
    "I could not run tests, typecheck, builds or a browser, so I make no claim that any tests passed or that the motion behaves as described at runtime. The mocked-GSAP unit tests don't prove browser motion either.",
    "I did not open the host evidence outside the worktree (C:/Users/Joshu/dev/ai-os/design/reviews/.../note-reader-transition/: local-desktop-final-trace.json, local-reader-phone-final.png, local-reader-desktop.png). Desktop/phone visual proof and the sampled stage positions are unverified by me.",
    "I read only the titles of useNoteReaderTransition.test.tsx, not the test bodies, and did not open TeachingNotesArchive.test.tsx or teachingNoteDates.ts/test beyond the diff. MyWorkPage.refetch.test.tsx and ClassroomLayout.test.tsx are listed in the scope but not in the manifest, and I did not inspect them.",
    "As the host notes, the fixture is synthetic: it uses the real secondary rail and stage geometry but not the full authenticated ClassroomLayout, permissions timing or production data.",
    "Out of scope and not reviewed: supabase/functions/mcp/index.ts (an unrelated backend edit), the untracked docs/plans and verification artefacts other than the plan text supplied, and the rest of the repository. This review does not approve the whole repository.",
    "I did not independently re-review docs/plans/my-work-scroll-filters-gemini-review.md beyond comparing the implemented behaviour with the docs addendum in platform-motion-20261022.md."
  ]
}

Host accepts all3 lowfindings: Space-link scroll classification, navigation dependency gating with late-root initialization, duplicate import merge. Test-only plugin teardown added after confirmed ScrollTrigger _sync after-jsdom error. 249assertionspassed butprocesspreviouslyexit1, notcleanproof. No productglobaldisable. Correctionsinprogress; nextfreshinspectionrequired. No commit/push/publish.


## Expanded inspection3: one scrollbar reveal low
{
  "verdict": "APPROVED",
  "summary": "I found no material defects in the final expanded scope, checked against both plans. The reader transition has one root-scoped owner in the persistent shell: useNoteReaderTransition, mounted in ClassroomLayout. Rail paper and rows are animated only when a matching data-note-target-id row or data-note-reader marker confirms the note. Stage movement uses an inverted x transform rebased from the last settled edge, and column/stage CSS transitions are suppressed only while data-note-transition-active is set or in archive mode. Rapid navigation, resize, focus, Tab, reduced-motion change and unmount all finish or revert the GSAP context. Note-to-note selection animates only reader blocks. playedKey/shellKey prevent replay on refetch. Reader PUSH scrolls instantly to the top; POP and archive Back do not. Interactive lessons get the reader marker and block markers while keeping the iframe's sandbox and srcDoc unchanged. Non-note items get no markers and no shell tween. The reader is a classroom-motion-local boundary, so the generic owner skips it. NRT-6 is fixed: ClassroomItemView and the rail's openRow only pass notesArchiveReturn or notesArchiveOrigin when notesArchiveOrigin() validates an explicit origin, so a reader opened without an origin returns with null state and the archive never restores from it. The pure page-scroll key correction is also confirmed: Space/Spacebar counts as activation only on button, [role=button] or [role=menuitem], never on links; arrows, Home, End and Page keys on ordinary links or buttons are ignored; modifier keys and Escape are excluded. The test-only afterAll(ScrollTrigger.disable()) in the ClassroomLayout and refetch suites uses real, unmocked gsap/ScrollTrigger, so the call is valid, and no production code disables ScrollTrigger. One low finding remains: a width-only ResizeObserver change, such as a classic scrollbar appearing, cuts short a delayed reader entrance.",
  "findings": [
    {
      "id": "NRT-F1",
      "severity": "low",
      "path": "src/hooks/useNoteReaderTransition.ts",
      "evidence": "onResize (lines 149-154) calls finish(); reset(); whenever the stage width changes by 1px or more, even when window.innerWidth is unchanged. With classic, non-overlay scrollbars (the user's Windows desktop), the reader can be on a short DetailLoading page when it opens an uncached note (e.g. from a notification link), and the delayed-content path then reveals only the reader blocks (newShell false, newReader true). When the long article arrives, the page grows, the vertical scrollbar appears and the stage narrows by about 15px. On the next frame the ResizeObserver sees the width change and calls finish(), so the planned delayed-content stagger jumps straight to its end state. The same applies if the scrollbar appears during a confirmed shell tween. Content still ends visible and untransformed, so this loses the reveal rather than hiding anything. The local trace (archive and reader both long, scrollbar present throughout) would not exercise this.",
      "fix": "When window.innerWidth is unchanged and stage()'s left edge has not moved (the rail is unchanged), treat a width-only stage change as idle geometry. Update lastWidth (and measure() when not animating) instead of calling finish()/reset(). Keep finish()/reset() for real viewport changes and rail/edge changes. Add a hook test where the stage width shrinks at the same innerWidth after a delayed reader starts its block timeline, and assert the timeline is not progressed to 1."
    }
  ],
  "coverage": [
    "Read the full diff in the prompt for every tracked file in the manifest",
    "src/hooks/useNoteReaderTransition.ts (full): ownership, confirmation gating, rebasing, late-rail sync, observers, cleanup, StrictMode remount path",
    "src/styles/note-reader-transition.css (full) against the classroom.css stage/column transitions (lines 806-862), section-list breakpoints (3536-3559, 1023px stacking) and section-list sticky/z-index rules",
    "src/components/classroom/shell/ClassroomLayout.tsx lines 930-1259 (root, rail, stage, mobile overlay SectionList, activeSection permission gating) plus the openRow/data-note-target-id diff",
    "src/components/classroom/shell/ClassroomMotionContent.tsx (display:contents boundary)",
    "src/components/classroom/ClassroomRouteViews.tsx ClassroomItemView lines 196-300 plus diff (interactive branch, NOTE_TYPES wrappers, archiveReturnState)",
    "src/hooks/useNotesArchiveScroll.ts (full)",
    "src/hooks/useClassroomMotion.ts diff: list ownership, intents, key classification (Space/link fix), restore markers, prune and print paths",
    "src/components/my-work/TeachingNotesArchive.tsx diff: POP/documentId anchor matching, origin/return id validation, focus recovery",
    "src/lib/myWorkNotesNavigation.ts notesArchiveOrigin validation",
    "src/pages/myWorkNotesRefinement.css (full) and myWorkNotes.css scoping lines 1-49 for reader wrapper side effects",
    "src/App.tsx route wiring for ClassroomItemView, /my-work/notes and the recaps redirect",
    "Test names in useNoteReaderTransition.test.tsx and ClassroomNotesJourney.test.tsx; the ScrollTrigger afterAll cleanup in the ClassroomLayout and MyWorkPage.refetch suites (gsap not mocked there)",
    "The fixture script and preview server diffs"
  ],
  "limitations": [
    "I could not run tests, typecheck, builds or a browser. Nothing here claims tests passed or that motion plays correctly; mocked-GSAP unit tests do not prove real browser behavior.",
    "I did not open the host evidence files (local-desktop-final-trace.json, local-reader-phone-final.png and the other files in the external ai-os review directory); their claims are unverified by me.",
    "The synthetic fixture uses the real secondary rail and production stage geometry, not the full authenticated ClassroomLayout with real permissions, profile readiness or Supabase data.",
    "I read the bodies of useNoteReaderTransition.test.tsx, ClassroomNotesJourney.test.tsx, WorkFilterSelect.tsx, useNotesSelectMotion.ts and teachingNoteDates.ts only through the diff or test names, not in full as standalone files.",
    "Files outside the inspection scope are unreviewed. That includes supabase/functions/mcp/index.ts (excluded as unrelated), App.tsx routing beyond the lines cited, classroom-rail-motion.css, the overlay motion hooks and the rest of the repository. This review does not approve the whole repository.",
    "I did not re-read docs/plans/my-work-scroll-filters-gemini-review.md itself; I checked earlier-remediation fidelity against the diff and the host's summary of corrected items."
  ]
}
HostacceptsNRT-F1: preserveactiveentranceonclassic-scrollbarwidth-onlychanges,sameviewport+sameuntransformededge. Implement/testandnewdelayedreaderfixture; thenfreshinspection. Previousclean252tests exit0, no teardownerror; currentlaterhookfixpending. No commit/push/publish.


## FINAL 2026-10-28: zero remaining findings in inspected scope

{
  "verdict": "APPROVED",
  "summary": "I found no material correctness, spec-fidelity, security or edge-case defects in the expanded scope against my-work-note-reader-transition.md. I read the new reader-transition owner, its CSS and its wiring into ClassroomLayout and ClassroomRouteViews. I also read the origin/return-state chain from the archive card through the rail to Back and archive restoration, and the list-motion intents.\n\nThe hook does what the plan requires:\n- One owner for the whole shell, scoped to the root. The stage is inverted with a transform only (no width tween), and the paper/rail/reader-block sequence ends by about 900ms.\n- A rapid route change rebases from the stage's current visual offset and reverts the previous animation.\n- Delayed content joins the sequence once. playedKey and shellKey stop replays on refetch or remount.\n- An unconfirmed item, or a non-note item, gets no shell tween. A late rail under the same key is coordinated without replaying the reader. Reduced motion and focus inside the reader skip the animation.\n- Unmount, resize and Tab finish and clean up the animation.\n\nResize after NRT-F1: a scrollbar that only changes the stage width, with the same window width, the same untransformed edge and the same rail state, keeps the active motion. A change to the viewport or the edge still settles it.\n\nGeometry suppression, NRT-3: `data-note-transition-active` is set before the destination is measured. An earlier measure() can start the column max-width/padding transition, but setting `transition: none` then cancels it to its end value, so the inversion is computed from final geometry. Archive mode keeps the immediate transform and transition suppression for child anchor restoration, which runs in the layout phase before the parent owner.\n\nStage and rail stacking: the rail has z-index 10 (classroom.css:683), so the translated, opaque stage slides under it and does not hide the rail stagger.\n\nStale anchors, NRT-6: the reader sends `notesArchiveReturn` only when a validated origin exists. Without one the archive does not restore anything. A mismatched id removes the stale anchor. A POP restore must match both the history entry key and the document id.\n\nSpace on links is now treated as page scroll, not activation. The ScrollTrigger.disable() in afterAll is test-only and limited to two suites.\n\nI did not run any tests and make no claim that they pass. The mocked-GSAP unit tests do not prove browser behaviour.",
  "findings": [],
  "coverage": [
    "Read in full: src/hooks/useNoteReaderTransition.ts and src/styles/note-reader-transition.css. Traced every state variable through navigate, play, synchronizeGeometry, onResize, the mutation observer, the focus/key/reduce handlers and dispose.",
    "Read the test names in src/hooks/useNoteReaderTransition.test.tsx: archive-to-reader, note-to-note, delayed content, unknown item, delayed rail, reduced motion, root mounted late, narrow width, rapid rebase, resize/focus, non-item, rail opened in place, suppression release, unrelated render, scrollbar-only width change and edge change.",
    "Read the ClassroomLayout source: hook placement, data-note-transition-mode/stage/rail markers, sectionFromPath (item routes map to the notes section), activeSection permission gating, openRow origin propagation, and data-note-target-id (notes rows only).",
    "Read the ClassroomRouteViews diff: interactive iframe reader boundary, the classroom-motion-local wrapper, block markers only for note types, and Back state carrying only a validated origin id.",
    "Read the ClassroomMotionContent and useClassroomMotion diffs: the reader is excluded from the generic owner through classroom-motion-local; list ownership, intents, restore-marker handoff between outgoing and incoming owners, the pure page-scroll key filter and the Space-on-links fix.",
    "Read the TeachingNotesArchive diff: layout-phase anchor restore, POP entry-key/document-id matching, explicit return-id check, modifier-click exclusion, filter/paginate intents, focus recovery.",
    "Read src/lib/myWorkNotesNavigation.ts notesArchiveOrigin validation and its tests.",
    "Read in full: useNotesArchiveScroll.ts, useNotesSelectMotion.ts, WorkFilterSelect.tsx and teachingNoteDates.ts.",
    "Read the MyWorkPage diff and StudentDestination list-only policy diff.",
    "Checked classroom.css stage/column transitions, section-list sticky z-index 10, and window-level scrolling (stage has no overflow container). Searched myWorkNotes.css and myWorkNotesRefinement.css for selectors now reaching the reader wrapper.",
    "Read the fixture and preview-server diffs in scripts/verification, and the afterAll ScrollTrigger.disable() test cleanup in the ClassroomLayout and refetch suites."
  ],
  "limitations": [
    "I could not run tests, typecheck, build or a browser. I make no claim that any suite passes, and mocked-GSAP tests do not show real playback.",
    "I did not open the host evidence outside the worktree (C:/Users/Joshu/dev/ai-os/design/reviews/.../note-reader-transition traces and screenshots). Visual quality of the stagger, the screenshots and the rAF sample trace are not verified by me.",
    "The synthetic fixture uses the real secondary rail and stage classes but not the full authenticated ClassroomLayout (auth, profile, permission timing, overlays). Behaviour in the signed-in production shell is not proven by this review.",
    "I only skimmed the gemini-review remediation doc (my-work-scroll-filters-gemini-review.md) and the earlier-inspection dispositions. I relied on the current source rather than re-deriving every earlier finding. I skimmed rather than read in full the large test files (useClassroomMotion.test.tsx, TeachingNotesArchive.test.tsx, MyWorkPage.organization.test.tsx, ClassroomNotesJourney.test.tsx, useNotesArchiveScroll.test.ts, teachingNoteDates.test.ts).",
    "Not reviewed (out of scope): supabase/functions/mcp/index.ts and every file outside the listed inspection paths, including the ui/select primitives, classroomData groupNotes, the markNoteRead internals and the rest of classroom.css. This is not a whole-repository approval."
  ]
}

Hostfinalproof:254tests/13suites exit0 nounhandlederror; typecheck/fullproductionbuild/fixturebuild/scopeddiffcheck exit0. final-snapshot-proof.json verifies inspectedhashesstillmatch/backendunchanged. Naturalclassic-scrollbar delayedreadertrace showswidth841.194to818.507 samewindow1441 with33intermediateopacityframes; allvisible/untransformedatrest. No sourceeditsafterreview. Fullruntime/visualqualificationin externalREPORT.md. No commit/push/merge/publish.
