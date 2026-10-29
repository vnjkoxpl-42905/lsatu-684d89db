import { describe, it, expect, beforeEach } from "vitest";
import {
  prepareManualCreate,
  readPendingManualCreate,
  confirmManualCreate,
  manualCreateStorageKey,
  manualCreateWasRejected,
} from "./manualCreatePending";
beforeEach(() => sessionStorage.clear());
describe("Manual create request identity", () => {
  it("holds the original payload and key until verified, including across reload and edited drafts", () => {
    const pending = prepareManualCreate("actor", {
      action: "create",
      title: "First task",
    });
    expect(readPendingManualCreate("actor")).toEqual(pending);
    expect(() =>
      prepareManualCreate("actor", { action: "create", title: "Edited task" }),
    ).toThrow(/original request/);
    expect(readPendingManualCreate("actor")).toEqual(pending);
    expect(
      prepareManualCreate("actor", { action: "create", title: "First task" })
        .key,
    ).toBe(pending.key);
    confirmManualCreate(pending);
    expect(
      prepareManualCreate("actor", { action: "create", title: "Edited task" })
        .key,
    ).not.toBe(pending.key);
  });
  it("never reads another actor request or clears a later request after an old response", () => {
    const first = prepareManualCreate("first", {
      action: "create",
      title: "Private first task",
    });
    expect(readPendingManualCreate("second")).toBeNull();
    const second = prepareManualCreate("second", {
      action: "create",
      title: "Private second task",
    });
    confirmManualCreate(first);
    expect(readPendingManualCreate("second")).toEqual(second);
    confirmManualCreate(second);
    const next = prepareManualCreate("second", {
      action: "create",
      title: "Next task",
    });
    confirmManualCreate(second);
    expect(readPendingManualCreate("second")).toEqual(next);
  });
  it("preserves unreadable pending metadata and blocks new keys", () => {
    sessionStorage.setItem(manualCreateStorageKey("actor"), "{invalid");
    expect(() =>
      prepareManualCreate("actor", { action: "create", title: "New task" }),
    ).toThrow(/could not be read/);
    expect(sessionStorage.getItem(manualCreateStorageKey("actor"))).toBe(
      "{invalid",
    );
  });
  it("accepts only explicit known database validation rejections as not applied", () => {
    expect(
      manualCreateWasRejected({ code: "P0001", message: "invalid_student" }),
    ).toBe(true);
    expect(manualCreateWasRejected(new Error("invalid_student"))).toBe(false);
    expect(
      manualCreateWasRejected({
        code: "P0001",
        message: "operation_key_conflict",
      }),
    ).toBe(false);
    expect(manualCreateWasRejected({ message: "Failed to fetch" })).toBe(false);
  });
});
