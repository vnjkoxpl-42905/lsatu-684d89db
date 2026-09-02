import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ActivityAssignmentSummary } from "../api/types";
import { SectionLibrary } from "./SectionLibrary";

// The section list. Two of these rules are ones the regular section picker
// breaks on purpose, so they are asserted rather than assumed: it hides a
// section once sat, and it never shows past runs. Here both are wrong.

const choices = [
  { id: "a1", title: "RRC · PT102 Section 3", source_section: "PT102.S3", stimulus_count: 22, goal_minutes: { standard: 25 } },
  { id: "a2", title: "RRC · PT105 Section 2", source_section: "PT105.S2", stimulus_count: 23, goal_minutes: { standard: 25 } },
];

const attempt = (over: Partial<ActivityAssignmentSummary>): ActivityAssignmentSummary =>
  ({
    id: "x", activity_id: "a1", student_id: "s", title: "t", status: "completed",
    created_at: "2026-09-01T10:00:00Z", completed_at: "2026-09-01T10:30:00Z",
    mode: "section", source_section: "PT102.S3", instructions: {}, item_count: 22,
    ...over,
  }) as ActivityAssignmentSummary;

const load = () => Promise.resolve(choices);

describe("choosing a section", () => {
  it("lists every section, including ones already done", async () => {
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1" })]}
        onStart={vi.fn()}
        loadChoices={load}
      />,
    );
    // Nothing is hidden once done. Three sections exist, so hide-on-use would
    // empty the list after three nights of a drill that asks for three a day.
    await vi.waitFor(() => expect(screen.getByText("PT102.S3")).toBeInTheDocument());
    expect(screen.getByText("PT105.S2")).toBeInTheDocument();
  });

  it("shows every Attempt, not a count", async () => {
    render(
      <SectionLibrary
        attempts={[
          attempt({ id: "r1", created_at: "2026-08-30T10:00:00Z" }),
          attempt({ id: "r2", created_at: "2026-08-31T10:00:00Z" }),
          attempt({ id: "r3", created_at: "2026-09-01T10:00:00Z" }),
        ]}
        onStart={vi.fn()}
        loadChoices={load}
      />,
    );
    await vi.waitFor(() => expect(screen.getByText(/Attempt 3/)).toBeInTheDocument());
    expect(screen.getByText(/Attempt 2/)).toBeInTheDocument();
    expect(screen.getByText(/Attempt 1/)).toBeInTheDocument();
  });

  it("marks an unfinished Attempt as unfinished rather than done", async () => {
    render(
      <SectionLibrary
        attempts={[attempt({ id: "r1", status: "in_progress", completed_at: null })]}
        onStart={vi.fn()}
        loadChoices={load}
      />,
    );
    await vi.waitFor(() => expect(screen.getByText(/not finished/)).toBeInTheDocument());
  });

  it("starts an Attempt server-side and hands back the id to run", async () => {
    const onStart = vi.fn();
    const beginAttempt = vi.fn(() => Promise.resolve("new-assignment-id"));
    render(
      <SectionLibrary attempts={[]} onStart={onStart} loadChoices={load} beginAttempt={beginAttempt} />,
    );
    await vi.waitFor(() => expect(screen.getByText("PT102.S3")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Start" })[0]);
    // She names the section. She never supplies what is in it: the snapshot
    // carries the Details her Coverage is scored against.
    await vi.waitFor(() => expect(beginAttempt).toHaveBeenCalledWith("a1"));
    expect(onStart).toHaveBeenCalledWith("new-assignment-id");
  });

  it("says a failed read failed, instead of showing an empty list", async () => {
    render(
      <SectionLibrary
        attempts={[]}
        onStart={vi.fn()}
        loadChoices={() => Promise.reject(new Error("offline"))}
      />,
    );
    // An empty list means "nothing to do tonight", which is a different fact.
    await vi.waitFor(() => expect(screen.getByText(/Could not load the sections/)).toBeInTheDocument());
  });
});
