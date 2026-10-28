# Reading Center security acceptance, 2026-10-13

Verified against Lovable project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76`, live backend `atrcqxpmqrynmtvvyjju`, through its free SQL query tool.

The first rollback-only probe found a real integration defect: the deployed `guard_activity_mirror_access()` rejected Reading Center Classroom items because it required an Activity Centre assignment row for every item of type `activity`. The exact error was SQLSTATE `42501`, “Activity mirror must name an available source for this student.” The failed transaction left zero Reading Center assignments and zero private test passages.

Migration `20261013222000_reading_center_activity_mirror_guard.sql` preserves the existing guard and adds an exception for the exact immutable `activity` / `reading_center` / `library` source. Only administrators create that grant. Student updates may advance progress on the existing grant while preserving the student, creator, visibility and unlock time; the Reading Center update guard separately protects status and immutable fields.

After the repair was applied, `security-probes.sql` executed successfully and returned:

```json
{
  "result": "30 live SQL assertions passed; all test writes rolled back",
  "remaining_assignments": 0,
  "remaining_private_fixtures": 0
}
```

Assertions cover anonymous API/RPC denial, unassigned reader/writer denial, administrator-only assignment, repeat assignment reusing one launcher, assigned access and saved own preferences, foreign preference rejection, private imported passage isolation, wrong-student launcher denial, revocation, refusal to restore archived access, scheduled unlock denial, refusal to change the unlock time, and refusal to derive entitlement from editable metadata or forged source fields.

The probe used configured admin/tester identities with local transaction claims, never credentials in SQL. Every fixture, access grant and data write was inside `BEGIN` / `ROLLBACK`. No notifications were invoked. This receipt verifies database access and assignment behavior; signed-in browser acceptance is separate.
