import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { homeAssignmentKeys, useHomeFreshness } from "./useHomeFreshness";

function setup(actorId: string | undefined) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useHomeFreshness(actorId), { wrapper });
  return { client, invalidate, hook };
}

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey);

afterEach(() => {
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

describe("useHomeFreshness", () => {
  it("re-reads the actor's own assignment keys when the tab regains focus", async () => {
    const { invalidate } = setup("ada");
    focusManager.setFocused(false);
    invalidate.mockClear();
    await act(async () => focusManager.setFocused(true));
    expect(invalidatedKeys(invalidate)).toEqual(homeAssignmentKeys("ada"));
    // Every key is scoped to Ada; nothing global or another student's.
    for (const key of invalidatedKeys(invalidate)) expect(key).toContain("ada");
  });

  it("re-reads when the connection comes back", async () => {
    const { invalidate } = setup("ada");
    await act(async () => onlineManager.setOnline(false));
    invalidate.mockClear();
    await act(async () => onlineManager.setOnline(true));
    expect(invalidatedKeys(invalidate)).toEqual(homeAssignmentKeys("ada"));
  });

  it("covers the keys completion, removal and reassignment change", () => {
    const keys = homeAssignmentKeys("ada").map((key) => JSON.stringify(key));
    expect(keys).toEqual([
      JSON.stringify(["student-assignments", "ada"]),
      JSON.stringify(["student-ta-assignments", "ada"]),
      JSON.stringify(["weekly-plan", "assigned-status", "ada"]),
      JSON.stringify(["todo-feed:guided", "ada"]),
      JSON.stringify(["todo-feed:activity", "ada"]),
      JSON.stringify(["todo-feed:assignment-evidence", "ada"]),
      JSON.stringify(["todo-feed:activity-evidence", "ada"]),
      JSON.stringify(["classroom-items", "ada"]),
    ]);
  });

  it("offers a manual refresh and stops listening once Home unmounts", async () => {
    const { invalidate, hook } = setup("ada");
    await act(async () => hook.result.current.refresh());
    expect(invalidatedKeys(invalidate)).toEqual(homeAssignmentKeys("ada"));
    hook.unmount();
    invalidate.mockClear();
    focusManager.setFocused(false);
    await act(async () => focusManager.setFocused(true));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("does nothing without a signed-in actor", async () => {
    const { invalidate } = setup(undefined);
    focusManager.setFocused(false);
    await act(async () => focusManager.setFocused(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
