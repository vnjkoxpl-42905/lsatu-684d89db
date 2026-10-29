import { describe, expect, it } from "vitest";
import { preserveRedirectLocation, redirectLegacyHistoryLocation } from "./preserveRedirectLocation";
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
  it("opens an old RC History link with the RC filter selected", () => {
    expect(redirectLegacyHistoryLocation("?area=rc&historyResult=missed", "#row"))
      .toBe("/review/history?historyResult=missed&historyArea=RC#row");
  });
  it("keeps an explicit new History area when both formats occur", () => {
    expect(redirectLegacyHistoryLocation("?area=rc&historyArea=LR", ""))
      .toBe("/review/history?historyArea=LR");
  });
});
