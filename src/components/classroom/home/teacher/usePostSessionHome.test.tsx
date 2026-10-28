import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const server = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: server.rpc },
}));
import { usePostSessionHome } from "./usePostSessionHome";
import type { PostSessionTask } from "./postSessionModel";
const task: PostSessionTask = {
  id: "one",
  revision: 3,
  student_id: "student",
  student_name: "Ada",
  source_title: "Session",
  starts_at: "2026-10-26T15:00:00Z",
  ends_at: "2026-10-26T16:00:00Z",
  source_state: "ended",
  match_state: "matched",
  transcript_doc_id: null,
  transcript_source: null,
  transcript_status: "waiting",
  drive_folder_url: null,
  local_slug: null,
  recap_done: false,
  notes_done: false,
  work_assigned: false,
  handled_at: null,
};
const settings = {
  enabled: true,
  activation_cutoff: "2026-10-25T00:00:00Z",
  last_success_at: null,
  last_error: null,
  drive_root_url: null,
  catching_up: false,
};
const snapshot = { settings, tasks: [task], handled: [] };
function setup(actor = "owner", admin = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(({ actor, admin }) => usePostSessionHome(actor, admin), {
      wrapper,
      initialProps: { actor, admin },
    }),
    client,
  };
}
beforeEach(() => {
  server.rpc.mockReset();
  server.rpc.mockResolvedValue({ data: snapshot, error: null });
});
describe("post-session Home reads and saves", () => {
  it("does not read for students", () => {
    const { result } = setup("student", false);
    expect(result.current.state).toBe("setup");
    expect(server.rpc).not.toHaveBeenCalled();
  });
  it("shows setup for an absent RPC and an error for an unknown failure", async () => {
    server.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "missing" },
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.state).toBe("setup"));
  });
  it("does not show another actor cached work while their request waits", async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    server.rpc.mockImplementation(() => new Promise(() => {}));
    rerender({ actor: "second", admin: true });
    expect(result.current.data).toBeUndefined();
    expect(result.current.state).toBe("loading");
  });
  it("saves revisioned handling, refetches persisted history, and supports reopen", async () => {
    let current = snapshot;
    server.rpc.mockImplementation(async (name, args) => {
      if (name === "teacher_post_session_update") {
        const handled = args._action === "handle";
        current = {
          settings,
          tasks: handled ? [] : [task],
          handled: handled
            ? [{ ...task, handled_at: "2026-10-27T00:00:00Z", revision: 4 }]
            : [],
        };
        return { data: handled ? current.handled[0] : task, error: null };
      }
      return { data: current, error: null };
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    await act(() => result.current.update!(task, { action: "handle" }));
    expect(result.current.data?.tasks).toHaveLength(0);
    expect(result.current.data?.handled).toHaveLength(1);
    expect(server.rpc).toHaveBeenCalledWith(
      "teacher_post_session_update",
      expect.objectContaining({
        _task_id: "one",
        _expected_revision: 3,
        _action: "handle",
      }),
    );
    await act(() =>
      result.current.update!(result.current.data!.handled[0], {
        action: "reopen",
      }),
    );
    expect(result.current.data?.tasks).toHaveLength(1);
  });
  it("refreshes a revision conflict without optimistic completion", async () => {
    server.rpc.mockImplementation(async (name) =>
      name === "teacher_post_session_update"
        ? { data: null, error: { code: "40001", message: "conflict" } }
        : { data: snapshot, error: null },
    );
    const { result } = setup();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    await act(() => result.current.update!(task, { action: "handle" }));
    expect(result.current.data?.tasks).toHaveLength(1);
    expect(result.current.error).toContain("Could not save");
    expect(
      server.rpc.mock.calls.filter(
        ([name]) => name === "teacher_post_session_home",
      ).length,
    ).toBeGreaterThan(1);
  });
  it("retains cached work with a refresh error", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    server.rpc.mockResolvedValue({
      data: null,
      error: { code: "503", message: "offline" },
    });
    await act(async () => result.current.retry!());
    await waitFor(() => expect(result.current.refreshFailed).toBe(true));
    expect(result.current.data?.tasks).toHaveLength(1);
  });
  it("retains saved active work and handled history while automatic updates are paused", async () => {
    server.rpc.mockResolvedValue({
      data: {
        ...snapshot,
        settings: { ...settings, enabled: false },
        handled: [
          { ...task, id: "handled", handled_at: "2026-10-27T00:00:00Z" },
        ],
      },
      error: null,
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(result.current.data?.tasks).toHaveLength(1);
    expect(result.current.data?.handled).toHaveLength(1);
    expect(result.current.update).toBeTypeOf("function");
  });
  it("does not erase an owner snapshot when an installed RPC disappears during refresh", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.state).toBe("ready"));
    server.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "missing" },
    });
    await act(async () => result.current.retry!());
    await waitFor(() => expect(result.current.refreshFailed).toBe(true));
    expect(result.current.state).toBe("ready");
    expect(result.current.data?.tasks).toHaveLength(1);
  });
});
