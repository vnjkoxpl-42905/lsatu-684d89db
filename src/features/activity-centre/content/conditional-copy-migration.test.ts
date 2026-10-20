import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260916010000_conditional_rephrase_copy_cleanup.sql",
  "utf8",
);

describe("Conditional Rephrase stored copy", () => {
  it("uses the same student-facing language as the authored activity", () => {
    expect(migration).toContain("Diagram it on paper, then choose the matching answer");
    expect(migration).toContain("Then choose the diagram that matches what you wrote");
    expect(migration).not.toMatch(/record the route|choose the route/i);
  });

  it("refreshes assignments that students can still open", () => {
    expect(migration).toContain("assignment.status in ('assigned', 'in_progress')");
    expect(migration).toContain("instructions = activity.instructions");
  });
});
