import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyTypes } from "@/lib/strengthsWeaknesses";
import type { StrengthsResult } from "@/hooks/useStrengthsWeaknesses";

const hook = vi.hoisted(() => ({ value: null as unknown as StrengthsResult }));
vi.mock("@/hooks/useStrengthsWeaknesses", () => ({ useStrengthsWeaknesses: () => hook.value }));

import { HomeProgressCard } from "./HomeProgressCard";

const row = (topic: string, correct: number, denominator: number) => ({
  topic, correct, denominator, percent: null, evidenceAttemptIds: [],
});
const ready = (rows: ReturnType<typeof row>[], withheld = false): StrengthsResult => {
  const summary = classifyTypes(rows, withheld);
  const denominator = rows.reduce((n, r) => n + r.denominator, 0);
  const correct = rows.reduce((n, r) => n + r.correct, 0);
  return {
    status: "ready", summary, asOf: "2026-11-06T00:00:00.000Z", refresh: vi.fn(),
    overall: { correct, denominator, percent: denominator >= 3 ? Math.round((100 * correct) / denominator) : null },
  };
};

describe("HomeProgressCard", () => {
  beforeEach(() => { hook.value = ready([]); });

  it("explains an empty record without drawing a graph", () => {
    render(<HomeProgressCard onOpen={vi.fn()} />);
    expect(screen.getByText(/Finish a drill and your graph appears here/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /accuracy by question type/i })).toBeNull();
  });

  it("opens the questions behind a bar", () => {
    hook.value = ready([row("Flaw", 2, 10), row("Main Conclusion", 9, 10)]);
    const onOpen = vi.fn();
    render(<HomeProgressCard onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /^Flaw: 20 percent/ }));
    expect(onOpen).toHaveBeenCalledWith("/review/progress?mode=types&progressType=Flaw");
  });

  it("puts the weakest type first and offers it as the next practice", () => {
    hook.value = ready([row("Main Conclusion", 9, 10), row("Flaw", 2, 10)]);
    const onOpen = vi.fn();
    render(<HomeProgressCard onOpen={onOpen} />);
    const bars = screen.getAllByRole("button", { name: /first answers right/ });
    expect(bars[0]).toHaveAccessibleName(/^Flaw/);
    fireEvent.click(screen.getByRole("button", { name: /Flaw · 6 questions/ }));
    const route = onOpen.mock.calls.at(-1)![0] as string;
    expect(route.startsWith("/drill?")).toBe(true);
    expect(route).toContain("Flaw");
  });

  it("shows no bar for a type with too few answers", () => {
    hook.value = ready([row("Flaw", 1, 1)]);
    render(<HomeProgressCard onOpen={vi.fn()} />);
    expect(screen.getByText(/needs 3 first answers before it gets a bar/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Flaw: / })).toBeNull();
  });

  it("shows no graph when a source could not be checked", () => {
    hook.value = ready([row("Flaw", 2, 10)], true);
    render(<HomeProgressCard onOpen={vi.fn()} />);
    expect(screen.getByText(/could not be checked/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /accuracy by question type/i })).toBeNull();
  });

  it("says plainly when the read failed", () => {
    hook.value = { ...ready([]), status: "error" };
    render(<HomeProgressCard onOpen={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
