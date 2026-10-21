import { beforeEach, expect, it } from "vitest";
import { replaceRevisionCoachRequest, retainCoachRequest } from "./activityCoachRequest";
const source = { sourceKind: "assignment" as const, sourceId: "12345678-1234-4123-8123-123456789012" };
beforeEach(() => localStorage.clear());
it("retains exact identity across reload and retry, separated by actor and response", () => {
  const first = retainCoachRequest("a", source, 1, "exact response", 1);
  expect(retainCoachRequest("a", source, 1, "exact response", 1)).toEqual(first);
  expect(retainCoachRequest("b", source, 1, "exact response", 1).requestId).not.toBe(first.requestId);
  expect(retainCoachRequest("a", source, 1, "edited response", 1).requestId).not.toBe(first.requestId);
  expect(retainCoachRequest("a", source, 1, "exact response", 2).requestId).not.toBe(first.requestId);
});
it("fails closed if storage cannot retain a request", () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error("quota"); } } as unknown as Storage;
  expect(() => retainCoachRequest("a", source, 1, "response", 1, storage)).toThrow();
});
it("does not accept malformed source or numbering", () => {
  expect(() => retainCoachRequest("a", { ...source, sourceId: "preview:not-a-uuid" }, 1, "response", 1)).toThrow();
  expect(() => retainCoachRequest("a", source, 1, "response", 3)).toThrow();
});
it("durably replaces only the old identity and reuses an already replaced request", () => {
  const old = retainCoachRequest("a", source, 1, "response", 2);
  const updated = replaceRevisionCoachRequest("a", old);
  expect(updated.requestId).not.toBe(old.requestId);
  expect(updated).toMatchObject({ studentResponse: "response", attemptNo: 2 });
  expect(retainCoachRequest("a", source, 1, "response", 2)).toEqual(updated);
  expect(replaceRevisionCoachRequest("a", old)).toEqual(updated);
});
