# Foreign INSERT verification is prepared, not executed

Date: 2026-09-30

The adjacent metadata query was executed read-only against the managed database. Its JSON records current columns, constraints, unique indexes, policies and trigger definitions after timed protection and Activity revocation deployment. The adjacent rollback SQL is a proposal for independent review. The child executed no INSERT or permission change. Root subsequently reviewed and executed the always-rollback proposal: ten foreign-owner families returned explicit RLS denial, homework remained Unverified for lack of a fixture, and mixed-attribution attempts were permitted then rolled back. All existing positive controls were valid. Root records the exact result separately.

The named ordinary tester is `d763bfe6-d710-4c4b-90ff-4b3a20929211`; the existing teacher fixture owner is `5ff160ef-016e-4ab5-aab1-55c7a2ad888f`. A separate read-only existence check confirmed eligible teacher fixtures without exporting their records. Each execution must select the exact still-existing fixture again. Missing fixtures are Unverified, never Pass.

| Source | Eligible existing fixture | Candidate collision handling |
| --- | --- | --- |
| LR attempts | Teacher-owned unprotected row | Fresh UUID; frozen timed attribution excluded |
| RC sessions | Teacher-owned standalone row | Fresh UUID; parent/leg attribution absent |
| RC attempts | Teacher-owned row bound to the same owner's standalone session | Fresh UUID; `is_first_attempt=false` avoids the existing first-attempt unique index |
| Bootcamp KV | Teacher-owned `module_progress` row | Fresh record ID; exact foreign owner and namespace retained |
| Guided assignments | Teacher-owned issued assignment | Fresh UUID; real guided content FK retained |
| Activity assignments | Unrevoked teacher-owned terminal row or null catalog identity | Fresh UUID; avoids active catalog uniqueness; revocation fields remain absent |
| Activity responses | Existing teacher response bound to an unrevoked assignment of that owner | Fresh UUID and next unused attempt number for its existing item |
| Homework assignments | Requires completed teacher-owned row | No eligible fixture found; remains Unverified |
| PrepTest runs | Teacher-owned legacy row with null v1 control version | Fresh text identity; legacy full blueprint retained |
| Classroom items | Teacher-owned non-Activity, non-day-zero-welcome row | Fresh UUID; excludes orphan Activity and welcome uniqueness |
| Section history | Teacher-owned unprotected row | Fresh UUID; protected parent/leg attribution excluded |

These rows prove only their stated source shapes. The KV check does not prove every bootcamp namespace or an assigned-guided fixture, which was absent. RC repeat-attempt denial does not establish first-attempt insertion semantics. Protected timed source keys require their separate guarded-writer tests.

The proposed transaction prepares each complete row under the reviewed migration session. A positive schema/trigger control inserts that exact candidate inside a subtransaction and immediately raises a dedicated exception to roll it back. This is a constraint-validity control, not an authenticated actor permission proof. Only after that succeeds does another subtransaction set the local role to ordinary `authenticated`, set explicit tester claims, verify the actor is non-admin and attempt the same insert. It verifies authenticated is neither superuser nor BYPASSRLS and has no executor membership. No grants, policies, roles, source records or backend functions are created, updated or deleted.

An unexpectedly allowed insert immediately raises its own dedicated exception, rolling back the row before it is classified as Fail. A `42501` error counts as RLS denial only when its message explicitly names row-level security. Trigger/access or missing-table grants are reported separately; foreign-key, uniqueness, CHECK and other errors remain Unverified. Output contains table, variant, fixture existence, positive-control validity and error class only. It never exposes row contents, credentials or tokens.

The final deliberate `ZQ999` exception returns the bounded result array and aborts the outer transaction, even if the managed caller stops before the following explicit ROLLBACK. Do not remove either rollback mechanism or treat the expected error response as a failed audit invocation. Review current trigger definitions before execution; the captured target triggers perform database checks/updates and show no HTTP/dblink/network action. No sequence-backed identity is used by the candidate sources. Root executed this proposal and received the expected ZQ999 result; no candidate rows were retained.

One additional probe targets a real policy asymmetry: the current attempts INSERT policy checks `class_id = auth.uid()::text` without checking `user_id`. Its mixed-attribution candidate sets class_id to the ordinary tester while retaining the teacher user_id. Root's ordinary-role mixed-attribution candidate was accepted and rolled back, so this variant is a confirmed SQL policy failure. It is not an actual HTTP/JWT claim.

SQL role/claim execution exercises PostgreSQL policy evaluation through the managed route. It does not establish token validation, authenticator JWT switching, HTTP API permissions, teacher actor attribution or all application mutations. Actual ordinary-JWT acceptance remains separate evidence. Existing READ/unchanged-identity UPDATE probes are not upgraded to INSERT proof by this proposal.
