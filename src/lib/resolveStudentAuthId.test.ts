import { describe, it, expect } from "vitest";
import {
  isWellFormedUuid,
  resolveStudentAuthIdFromRoster,
  type RosterMember,
} from "./resolveStudentAuthId";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";

const student: RosterMember = {
  class_id: STUDENT_ID,
  role: "student",
  email: "lydia@example.com",
  has_classroom_access: true,
};

const roster: RosterMember[] = [
  student,
  {
    class_id: "22222222-2222-4222-8222-222222222222",
    role: "admin",
    email: "contact@aspiringattorneys.com",
    has_classroom_access: true,
  },
  {
    // orphan: profile whose class_id has no auth.users row
    class_id: "33333333-3333-4333-8333-333333333333",
    role: "student",
    email: "unknown",
    has_classroom_access: true,
  },
  {
    class_id: "44444444-4444-4444-8444-444444444444",
    role: "student",
    email: "noclassroom@example.com",
    has_classroom_access: false,
  },
];

describe("isWellFormedUuid", () => {
  it("accepts a canonical v4 UUID", () => {
    expect(isWellFormedUuid(STUDENT_ID)).toBe(true);
  });
  it("trims surrounding whitespace", () => {
    expect(isWellFormedUuid(`  ${STUDENT_ID}  `)).toBe(true);
  });
  it("rejects non-UUID strings and non-strings", () => {
    expect(isWellFormedUuid("not-a-uuid")).toBe(false);
    expect(isWellFormedUuid("")).toBe(false);
    expect(isWellFormedUuid(null)).toBe(false);
    expect(isWellFormedUuid(undefined)).toBe(false);
    expect(isWellFormedUuid(12345)).toBe(false);
  });
});

describe("resolveStudentAuthIdFromRoster", () => {
  it("resolves a matchable student to the same UUID (auth.users.id)", () => {
    expect(resolveStudentAuthIdFromRoster(STUDENT_ID, roster)).toEqual({
      ok: true,
      authId: STUDENT_ID,
    });
  });

  it("tolerates surrounding whitespace on input", () => {
    expect(resolveStudentAuthIdFromRoster(`  ${STUDENT_ID} `, roster)).toEqual({
      ok: true,
      authId: STUDENT_ID,
    });
  });

  it("fails closed on empty / missing class_id", () => {
    expect(resolveStudentAuthIdFromRoster("", roster)).toEqual({
      ok: false,
      reason: "missing_class_id",
    });
    expect(resolveStudentAuthIdFromRoster(null, roster)).toEqual({
      ok: false,
      reason: "missing_class_id",
    });
  });

  it("fails closed on a malformed UUID", () => {
    expect(resolveStudentAuthIdFromRoster("abc-123", roster)).toEqual({
      ok: false,
      reason: "malformed_uuid",
    });
  });

  it("fails closed when the id is not on the roster", () => {
    expect(
      resolveStudentAuthIdFromRoster("99999999-9999-4999-8999-999999999999", roster),
    ).toEqual({ ok: false, reason: "not_in_roster" });
  });

  it("fails closed on an orphan auth id (email === 'unknown')", () => {
    expect(
      resolveStudentAuthIdFromRoster("33333333-3333-4333-8333-333333333333", roster),
    ).toEqual({ ok: false, reason: "orphan_auth_id" });
  });

  it("fails closed when the matched row is an admin, not a student", () => {
    expect(
      resolveStudentAuthIdFromRoster("22222222-2222-4222-8222-222222222222", roster),
    ).toEqual({ ok: false, reason: "not_a_student" });
  });

  it("fails closed when the student lacks classroom access (delivery gate)", () => {
    expect(
      resolveStudentAuthIdFromRoster("44444444-4444-4444-8444-444444444444", roster),
    ).toEqual({ ok: false, reason: "no_classroom_access" });
  });
});
