const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const BOOKING_SLUG_CODE_LENGTH = 26;
export const MIN_BOOKING_SLUG_LENGTH = 28;

function randomCode(chars = BOOKING_SLUG_CODE_LENGTH): string {
  const bytes = new Uint8Array(chars);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < chars; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function sanitizeBookingSlugName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const cleanedName = (name?.trim().split(/\s+/)[0] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanedEmail = (email?.split("@")[0] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return (cleanedName || cleanedEmail || "student").slice(0, 20);
}

export function generateBookingSlug(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  return `${sanitizeBookingSlugName(name, email)}-${randomCode()}`;
}

export type NewPassInput = {
  totalCredits: unknown;
  sessionLengthMinutes: unknown;
  expiresAt: unknown;
};

export type ValidatedNewPassInput = {
  totalCredits: number;
  sessionLengthMinutes: number;
  expiresAt: string | null;
};

export function validateNewPassInput(input: NewPassInput):
  | { ok: true; value: ValidatedNewPassInput }
  | { ok: false; error: "invalid_credits" | "invalid_session_length" | "invalid_expiry" } {
  const totalCredits = Number(input.totalCredits);
  if (!Number.isInteger(totalCredits) || totalCredits < 1 || totalCredits > 50) {
    return { ok: false, error: "invalid_credits" };
  }

  const sessionLengthMinutes = Number(input.sessionLengthMinutes);
  if (!Number.isInteger(sessionLengthMinutes) || sessionLengthMinutes < 15 || sessionLengthMinutes > 480) {
    return { ok: false, error: "invalid_session_length" };
  }

  if (input.expiresAt === null || input.expiresAt === undefined || input.expiresAt === "") {
    return { ok: true, value: { totalCredits, sessionLengthMinutes, expiresAt: null } };
  }

  if (typeof input.expiresAt !== "string") return { ok: false, error: "invalid_expiry" };
  const expiryMs = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return { ok: false, error: "invalid_expiry" };

  return {
    ok: true,
    value: { totalCredits, sessionLengthMinutes, expiresAt: new Date(expiryMs).toISOString() },
  };
}
