import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptRow, RecapRow } from "../rc-recall/lib/attempts";

// The attempts API is the one explicit mocked boundary; history, status and totals are the real code.
const data = vi.hoisted(() => ({ all: [] as unknown[], recaps: [] as unknown[], fail: null as null | Error, failOffset: null as number | null, calls: [] as number[], user: { id: "s1" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: data.user }) }));
vi.mock("../rc-recall/lib/attempts", async (orig) => ({
  ...(await orig<typeof import("../rc-recall/lib/attempts")>()),
  listAttempts: async (_s: string, offset = 0, size = 25) => {
    data.calls.push(offset);
    if (offset === data.failOffset) throw new Error("offline while loading more");
    if (data.fail) throw data.fail;
    const slice = data.all.slice(offset, offset + size + 1) as AttemptRow[];
    const attempts = slice.slice(0, size);
    return { attempts, recaps: data.recaps.filter((r) => attempts.some((a) => a.id === (r as RecapRow).attempt_id)), hasMore: slice.length > size, nextOffset: offset + attempts.length };
  },
}));

import { RcTrainingProgress } from "./RcTrainingProgress";

const attempt = (n: number, over: Partial<AttemptRow> = {}): AttemptRow => ({
  id: `a${n}`, student_id: "s1", mode: "rc_recall", preptest: 140, section: 4, passage_ids: [1, 2, 3, 4], confirmation_scope: "all_read",
  started_at: "2026-10-01T10:00:00Z", finished_at: "2026-10-01T10:30:00Z", elapsed_seconds: 600, completed: true, ...over,
});
const renderIt = (compact = false) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><RcTrainingProgress compact={compact} /></MemoryRouter></QueryClientProvider>,
);

beforeEach(() => { data.all = []; data.recaps = []; data.fail = null; data.failOffset = null; data.calls = []; data.user = { id: "s1" }; window.localStorage.clear(); });

describe("RC Training in Reading Progress and the Dashboard", () => {
  it("retains loaded attempts after a later page fails without repeatedly fetching it", async () => {
    data.all = Array.from({ length: 30 }, (_, i) => attempt(i));
    data.failOffset = 25;
    renderIt();
    await screen.findByRole("alert");
    expect(screen.getByText("Attempts completed").nextElementSibling).toHaveTextContent("25");
    expect(screen.getByText(/Based on your 25 most recent attempts/)).toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(data.calls).toEqual([0, 25]);
  });
  it("summarises completion and time from saved attempts and invents no score", async () => {
    data.all = [attempt(1), attempt(2, { completed: false, elapsed_seconds: 120 }), attempt(3, { finished_at: null, completed: false, elapsed_seconds: null })];
    renderIt();
    const stats = await screen.findByText("Attempts completed");
    expect(stats.nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Ended early").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Practice time").nextElementSibling).toHaveTextContent("12:00");
    expect(screen.getByText(/not graded, so there is no score here/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d+\s?%|score:/i);
    expect(screen.getByText(/Based on all your attempts/)).toBeInTheDocument();
  });

  it("lists recent attempts with their state and links into the same records in RC Training", async () => {
    data.all = [attempt(1), attempt(2, { finished_at: null, completed: false, elapsed_seconds: null })];
    renderIt();
    expect(await screen.findByText("Completed · 10:00")).toBeInTheDocument();
    expect(screen.getByText("Not resumable here")).toBeInTheDocument();
    expect(screen.getByText("Need attention").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByRole("link", { name: /open your attempts in rc training/i })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-history");
  });

  it("the Dashboard version is compact: totals and a link, no list", async () => {
    data.all = [attempt(1)];
    renderIt(true);
    await screen.findByText("Attempts completed");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open rc training/i })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-history");
  });

  it("reads further pages for the totals, up to a cap, and says when it is partial", async () => {
    data.all = Array.from({ length: 300 }, (_, i) => attempt(i));
    renderIt();
    await waitFor(() => expect(data.calls.length).toBe(8));
    expect(await screen.findByText(/Based on your 200 most recent attempts/)).toBeInTheDocument();
  });

  it("is honest when nothing has been done yet", async () => {
    renderIt();
    expect(await screen.findByText(/no rc training attempts yet/i)).toBeInTheDocument();
  });

  it("does not show a failure as a zero, and offers a retry", async () => {
    data.fail = new Error("offline");
    renderIt();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText("Attempts completed")).not.toBeInTheDocument();
  });

  it("explains a missing backend calmly instead of showing an error", async () => {
    data.fail = Object.assign(new Error("Could not find the table"), { code: "PGRST205" });
    renderIt();
    expect(await screen.findByRole("alert")).toHaveTextContent(/once saving is available/i);
    expect(document.body.textContent).not.toMatch(/PGRST205/);
  });

  it("asks a signed-out visitor to sign in", () => {
    data.user = null;
    renderIt();
    expect(screen.getByRole("status")).toHaveTextContent(/sign in/i);
  });
});
