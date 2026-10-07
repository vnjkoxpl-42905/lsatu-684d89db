import { describe, expect, it } from "vitest";
import {
  GENERIC_EDGE_ERROR,
  bookingErrorMessage,
  extractEdgeFunctionError,
} from "@/lib/edgeFunctionError";

describe("extractEdgeFunctionError", () => {
  it("reads the backend error off a FunctionsHttpError's Response", async () => {
    const error = { context: new Response(JSON.stringify({ error: "redeem_failed" }), { status: 409 }) };
    await expect(extractEdgeFunctionError(error)).resolves.toBe("redeem_failed");
  });

  it("returns null when the body is not JSON", async () => {
    const error = { context: new Response("gateway timeout", { status: 504 }) };
    await expect(extractEdgeFunctionError(error)).resolves.toBeNull();
  });

  it("returns null when there is no Response to read", async () => {
    await expect(extractEdgeFunctionError(new Error("boom"))).resolves.toBeNull();
  });
});

describe("bookingErrorMessage", () => {
  it("never shows the raw supabase-js wrapper the student was seeing", () => {
    const out = bookingErrorMessage(GENERIC_EDGE_ERROR);
    expect(out).not.toContain("2xx");
    expect(out).not.toContain("Edge Function");
    expect(out).toBe(
      "Something went wrong booking that time. Try again, and message Joshua if it keeps happening.",
    );
  });

  it("maps the codes a student can actually do something about", () => {
    expect(bookingErrorMessage("slot_conflict")).toBe("That time was just taken. Pick another.");
    expect(bookingErrorMessage("pass_exhausted")).toContain("out of sessions");
    expect(bookingErrorMessage("no_active_pass")).toContain("booking package");
    expect(bookingErrorMessage("rate_limited")).toContain("Wait a minute");
    expect(bookingErrorMessage("availability_check_failed")).toContain("calendar isn't responding");
  });

  it("hides internal fault codes behind the fallback", () => {
    for (const code of ["redeem_failed", "server_error", "info_failed", "request_failed_500"]) {
      expect(bookingErrorMessage(code)).not.toContain(code);
      expect(bookingErrorMessage(code)).toContain("Something went wrong");
    }
  });

  it("falls back on empty and nullish input", () => {
    expect(bookingErrorMessage("")).toContain("Something went wrong");
    expect(bookingErrorMessage(null)).toContain("Something went wrong");
    expect(bookingErrorMessage(undefined)).toContain("Something went wrong");
  });
});
