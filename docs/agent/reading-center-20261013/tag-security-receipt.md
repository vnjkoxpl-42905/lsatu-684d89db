# Reading Center tag acceptance, 2026-10-13

Verified after `20261013223000_reading_center_tag_rename_validation.sql` was applied to the same verified Lovable Cloud backend `atrcqxpmqrynmtvvyjju`.

`tag-security-probes.sql` used the configured dedicated tester's current assignment. Every tag and passage-metadata fixture write was inside `BEGIN` / `ROLLBACK`. Existing assignments were preserved, and no notification path was invoked.

The live SQL tool returned:

```json
{
  "result": "16 live tag assertions passed; all tag and metadata fixture writes rolled back",
  "remaining_tag_fixtures": 0,
  "tester_assignment_readback": [
    {
      "id": "689b3dfb-e18b-43fe-9b28-b2f42c10f541",
      "source_id": "library",
      "source_table": "reading_center",
      "status": "assigned",
      "unlock_at": null,
      "visible_to_student": true
    }
  ]
}
```

Assertions verify current tester entitlement, clean fixture setup, valid same-name color updates at both bounds (`0` and `24`), duplicate-name rejection with SQLSTATE `23505`, preservation of both names/colors and their passage metadata after rejection, unknown source rejection, blank and overlength names, negative/overmaximum/null colors, trimmed successful rename, removal of the old name, and atomic propagation to passage metadata while retaining the unrelated tag.

The returned assignment ID matches the persisted dedicated tester launcher. This is database readback of the teacher-created test assignment; browser rendering and student acceptance remain separate evidence.
