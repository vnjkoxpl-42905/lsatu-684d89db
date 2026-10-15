import { describe, expect, it } from "vitest";
import {
  BOOKING_SLUG_CODE_LENGTH,
  generateBookingSlug,
  sanitizeBookingSlugName,
  validateNewPassInput,
} from "../../supabase/functions/_shared/bookingPassLinks";

describe("booking pass public links", () => {
  it.each([
    ["C", "c"],
    ["Al", "al"],
    ["Lexi Alexander", "lexi"],
  ])("creates a strong slug for %s", (name, prefix) => {
    const slug = generateBookingSlug(name, null);
    const [actualPrefix, code] = slug.split("-");
    expect(actualPrefix).toBe(prefix);
    expect(code).toHaveLength(BOOKING_SLUG_CODE_LENGTH);
    expect(code).toMatch(/^[a-z2-9]+$/);
  });

  it("gives students with the same first name different bearer credentials", () => {
    expect(generateBookingSlug("Alex", null)).not.toBe(generateBookingSlug("Alex", null));
  });

  it("uses an email or safe fallback when the name has no slug characters", () => {
    expect(sanitizeBookingSlugName("É", "casey@example.com")).toBe("casey");
    expect(sanitizeBookingSlugName("É", null)).toBe("student");
  });
});

describe("new pass validation", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();

  it("accepts explicit valid values without coercing them", () => {
    expect(validateNewPassInput({ totalCredits: 5, sessionLengthMinutes: 70, expiresAt: future })).toEqual({
      ok: true,
      value: { totalCredits: 5, sessionLengthMinutes: 70, expiresAt: future },
    });
  });

  it.each([0, -1, 1.5, 51, "not-a-number"])("rejects invalid credits: %s", (totalCredits) => {
    expect(validateNewPassInput({ totalCredits, sessionLengthMinutes: 70, expiresAt: null })).toEqual({
      ok: false,
      error: "invalid_credits",
    });
  });

  it.each([0, 14, 70.5, 481, "bad"])("rejects invalid session lengths: %s", (sessionLengthMinutes) => {
    expect(validateNewPassInput({ totalCredits: 5, sessionLengthMinutes, expiresAt: null })).toEqual({
      ok: false,
      error: "invalid_session_length",
    });
  });

  it.each(["not-a-date", "2020-01-01T00:00:00.000Z"])("rejects invalid expiry: %s", (expiresAt) => {
    expect(validateNewPassInput({ totalCredits: 5, sessionLengthMinutes: 70, expiresAt })).toEqual({
      ok: false,
      error: "invalid_expiry",
    });
  });
});
