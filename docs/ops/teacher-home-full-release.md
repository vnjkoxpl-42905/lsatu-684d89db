# Full teacher Home release, 2026-10-28

Joshua authorized building and releasing the full approved dashboard to main on 2026-10-28. This supersedes the earlier preview-only boundary. The separate Lovable credit confirmation still applies to backend deployment.

The approved contract is the 2026-10-28 section of `brainstorms/2026-09-27-teacher-command-center.md` in the AI OS vault. Its reviewed SHA256 is `2cc1f4f713b3918fbb426e4f38b6e498254bf91d4717e471b1f10223bebc3740`. Full-dashboard build baseline is `d42e0ddfdd33fb0159af36ac6c6332eaef3e3491`; complete pending Home release begins after `e4035d9c8ec97a3aaec01b0b3464533872328bc8`.

## Deploy the reviewed backend through Lovable

Apply these migrations in order, only if not already applied:

1. `20261027190000_teacher_post_session.sql`
2. `20261028100000_teacher_home_desk.sql`
3. `20261028101000_teacher_home_access_booking.sql`

Deploy `teacher-post-session-sync`, `admin-manage-users`, and `booking-pass-admin` from this exact reviewed repository snapshot. The worker's no-JWT route remains protected by single-use scheduler tickets; owner requests authenticate the pinned administrator. Do not generate a substitute implementation, widen permissions, post recaps, assign work, alter access, grant credits, or send mail as part of deployment.

Follow `teacher-post-session-setup.md` for secret names, owner verification, exact folder import, and scheduler activation. Import creates disabled owner settings before Home reads. Verify the Drive mapping by exact readback before enabling the existing activation script. Preserve the original activation cutoff on retries. The root and sample folders are private; never make student folders public.

## Preserve current access rules

The current app and database tier rules are authoritative. Tier 2 customizes the five current doors; Tier 3 enables Messages and Schedule. Review derives from Drill or Practice. Retired flags remain off. Older notes describing broader tier access are historical and must not silently widen a student's permissions.

## Acceptance before claiming automatic operation

Check signed-in teacher and student Home, desktop and phone. Confirm independent provider failures do not blank Home; enquiry-label absence shows setup. Do not report missing data as zero. Verify manual tasks, paging and stale revisions with dedicated reversible test data; access and credit actions require deliberate operator intent and cannot be exercised on an arbitrary student.

Verify the imported folder map, one ended future session's stable follow-up ID, a later scheduled server run with the laptop stopped, and source/manual-state preservation. A Calendar end is a follow-up cue, not attendance evidence. Native attached Docs or a manual link can supply transcript context; continuous Drive sync, arbitrary transcript discovery and automatic drafting remain deferred.

After main is updated, wait for Lovable's latest commit to equal that main SHA, run the free frontend publish, then verify a changed live bundle and the new teacher Home marker in the signed-in browser. Record any acceptance that cannot be completed rather than treating a preview as production proof.
