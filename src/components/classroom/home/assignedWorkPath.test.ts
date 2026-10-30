import { describe, expect, it } from "vitest";
import { assignedWorkPath } from "./homeModel";

describe("Home's full assignment destination", () => {
  it("opens the assigned tab for Classroom and verified Reading Center access", () => {
    expect(assignedWorkPath({ loading: false, is_admin: false, has_classroom_access: true })).toBe("/my-work/to-do");
    expect(assignedWorkPath({ loading: false, is_admin: false, readingCenterAssigned: true })).toBe("/my-work/to-do");
  });
  it("does not expose a locked or unresolved assigned tab", () => {
    expect(assignedWorkPath({ loading: false, is_admin: false })).toBeNull();
    expect(assignedWorkPath({ loading: false, is_admin: false, readingCenterChecking: true })).toBeNull();
    expect(assignedWorkPath({ loading: true, is_admin: false, has_classroom_access: true })).toBeNull();
  });
});
