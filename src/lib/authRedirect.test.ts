import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authUrlWithReturnTo,
  clearStashedReturnTo,
  consumeStashedReturnTo,
  DEFAULT_POST_AUTH_TARGET,
  parseSafeReturnTo,
  readReturnToFromUrl,
  redirectAfterAuth,
  resolvePostAuthTarget,
  stashReturnTo,
  STASH_MAX_AGE_MS,
} from "./authRedirect";

const ORIGIN = "https://lsatprep.study";

function setUrl(href: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(href),
  });
}

describe("authRedirect", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    setUrl(`${ORIGIN}/auth`);
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.useRealTimers();
  });

  describe("parseSafeReturnTo", () => {
    it("keeps a same-origin path with its query and hash", () => {
      expect(parseSafeReturnTo("/rc/drill?passage=1188#q3")).toBe("/rc/drill?passage=1188#q3");
    });

    it("rejects the backslash network-path form the old string checks allowed", () => {
      // `startsWith("/") && !startsWith("//")` passed this; the WHATWG parser
      // treats a backslash as a slash for http(s), so it resolves off-origin.
      expect(parseSafeReturnTo("/\\evil.com")).toBeNull();
      expect(parseSafeReturnTo("/\\\\evil.com/path")).toBeNull();
    });

    it("rejects protocol-relative, cross-origin, and non-http targets", () => {
      expect(parseSafeReturnTo("//evil.com")).toBeNull();
      expect(parseSafeReturnTo("https://evil.com/steal")).toBeNull();
      expect(parseSafeReturnTo("javascript:alert(1)")).toBeNull();
    });

    it("rejects /auth so a bounce cannot loop onto the page doing the bouncing", () => {
      expect(parseSafeReturnTo("/auth")).toBeNull();
      expect(parseSafeReturnTo("/auth?returnTo=%2Fauth")).toBeNull();
      expect(parseSafeReturnTo("/auth/callback")).toBeNull();
    });

    it("rejects empty and malformed input", () => {
      expect(parseSafeReturnTo(null)).toBeNull();
      expect(parseSafeReturnTo("")).toBeNull();
    });
  });

  describe("readReturnToFromUrl", () => {
    it("reads returnTo and the OAuth consent flow's next", () => {
      setUrl(`${ORIGIN}/auth?returnTo=%2Frc%2Fsearch`);
      expect(readReturnToFromUrl()).toBe("/rc/search");

      setUrl(`${ORIGIN}/auth?next=%2Fjournal`);
      expect(readReturnToFromUrl()).toBe("/journal");
    });

    it("drops an unsafe target rather than following it", () => {
      setUrl(`${ORIGIN}/auth?returnTo=https%3A%2F%2Fevil.com`);
      expect(readReturnToFromUrl()).toBeNull();
    });
  });

  describe("the OAuth round trip", () => {
    it("survives a full-page redirect that loses the query", () => {
      setUrl(`${ORIGIN}/auth?returnTo=%2Frc%2Fdrill%3Fpassage%3D1188`);
      stashReturnTo(readReturnToFromUrl());

      // Google sends the user back to a bare /auth — a ref would be gone.
      setUrl(`${ORIGIN}/auth`);
      expect(resolvePostAuthTarget()).toBe("/rc/drill?passage=1188");
    });

    it("is consumed exactly once", () => {
      stashReturnTo("/journal");
      expect(consumeStashedReturnTo()).toBe("/journal");
      expect(consumeStashedReturnTo()).toBeNull();
    });

    it("discards a target older than the max age", () => {
      vi.useFakeTimers();
      stashReturnTo("/journal");
      vi.advanceTimersByTime(STASH_MAX_AGE_MS + 1);
      expect(consumeStashedReturnTo()).toBeNull();
    });

    it("clears rather than stores an unsafe or empty target", () => {
      stashReturnTo("/journal");
      stashReturnTo("https://evil.com");
      expect(consumeStashedReturnTo()).toBeNull();
    });

    it("lets an explicit clear cancel a departure that never happened", () => {
      stashReturnTo("/journal");
      clearStashedReturnTo();
      expect(resolvePostAuthTarget()).toBe(DEFAULT_POST_AUTH_TARGET);
    });
  });

  describe("resolvePostAuthTarget", () => {
    it("prefers the URL over a stashed target and drops the stash with it", () => {
      stashReturnTo("/journal");
      setUrl(`${ORIGIN}/auth?returnTo=%2Frc%2Fsearch`);

      expect(resolvePostAuthTarget()).toBe("/rc/search");
      expect(consumeStashedReturnTo()).toBeNull();
    });

    it("falls back to the classroom when nothing valid is on offer", () => {
      expect(resolvePostAuthTarget()).toBe(DEFAULT_POST_AUTH_TARGET);
    });
  });

  describe("redirectAfterAuth", () => {
    it("replaces rather than pushes, so Back cannot land on /auth", async () => {
      const navigate = vi.fn();
      setUrl(`${ORIGIN}/auth?returnTo=%2Frc%2Fsearch`);

      await redirectAfterAuth("user-1", navigate as never);

      expect(navigate).toHaveBeenCalledWith("/rc/search", { replace: true });
    });

    it("does not clobber the destination when called a second time", () => {
      // The original defect: call one honoured ?returnTo and navigated; call two
      // read a window.location that no longer carried it and pushed /classroom
      // over the top. The state machine in Auth.tsx admits one caller, and the
      // second observation below is what it is protecting against.
      setUrl(`${ORIGIN}/auth?returnTo=%2Frc%2Fsearch`);
      expect(resolvePostAuthTarget()).toBe("/rc/search");

      setUrl(`${ORIGIN}/rc/search`);
      expect(resolvePostAuthTarget()).toBe(DEFAULT_POST_AUTH_TARGET);
    });
  });

  describe("authUrlWithReturnTo", () => {
    it("encodes a safe target and omits an unsafe one", () => {
      expect(authUrlWithReturnTo("/rc/drill?passage=1188")).toBe(
        "/auth?returnTo=%2Frc%2Fdrill%3Fpassage%3D1188",
      );
      expect(authUrlWithReturnTo("https://evil.com")).toBe("/auth");
      expect(authUrlWithReturnTo("/auth")).toBe("/auth");
    });
  });
});
