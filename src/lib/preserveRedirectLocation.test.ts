import { describe, expect, it } from "vitest";
import { preserveRedirectLocation } from "./preserveRedirectLocation";
describe("legacy redirect context", () => {
  it("retains student, repeated filters and section hash", () => {
    expect(preserveRedirectLocation("/teacher/library", "?student=a&topic=lr&topic=rc", "#notes"))
      .toBe("/teacher/library?student=a&topic=lr&topic=rc#notes");
  });
  it("keeps explicit target values while preserving unrelated context", () => {
    expect(preserveRedirectLocation("/practice/exams?view=all", "?view=old&student=a", "#attempts"))
      .toBe("/practice/exams?view=all&student=a#attempts");
  });
  it("honors an explicit target anchor", () => {
    expect(preserveRedirectLocation("/teacher/library#uploads", "?student=a", "#old"))
      .toBe("/teacher/library?student=a#uploads");
  });
});
