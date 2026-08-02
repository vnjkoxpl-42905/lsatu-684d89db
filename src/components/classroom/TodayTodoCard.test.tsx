import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodayTodoCardView, type TodoRowModel } from "./TodayTodoCard";

function rows(overrides: Partial<TodoRowModel>[] = []): TodoRowModel[] {
  const base: TodoRowModel[] = [
    {
      key: "plan:a",
      title: "Read: Time Management",
      meta: "30 min",
      done: false,
      route: "/drill",
      onToggle: vi.fn(),
    },
    {
      key: "plan:b",
      title: "Redo the four Flaw questions you missed",
      meta: "20 min",
      done: true,
      route: null,
      onToggle: vi.fn(),
    },
  ];
  return base.map((row, i) => ({ ...row, ...(overrides[i] ?? {}) }));
}

describe("TodayTodoCardView", () => {
  it("counts what is done", () => {
    render(<TodayTodoCardView rows={rows()} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByText("1 of 2 done")).toBeTruthy();
  });

  it("ticks the row whose bubble is clicked", () => {
    const onToggle = vi.fn();
    render(
      <TodayTodoCardView rows={rows([{ onToggle }])} loading={false} onOpen={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText('Mark "Read: Time Management" done'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("opens the linked surface from Start, and hides Start once done", () => {
    const onOpen = vi.fn();
    render(<TodayTodoCardView rows={rows()} loading={false} onOpen={onOpen} />);
    const starts = screen.getAllByRole("button", { name: /start/i });
    expect(starts).toHaveLength(1);
    fireEvent.click(starts[0]);
    expect(onOpen).toHaveBeenCalledWith("/drill");
  });

  it("shows a status bubble, not a control, for a row that cannot be ticked here", () => {
    render(
      <TodayTodoCardView
        rows={[
          {
            key: "assigned:1",
            title: "Intro to LR",
            meta: "Homework · 12 questions",
            done: false,
            route: "/classroom/1",
          },
        ]}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/^Mark /)).toBeNull();
    expect(screen.getByLabelText("Not started")).toBeTruthy();
  });

  it("offers planning when nothing is due", () => {
    const onOpen = vi.fn();
    render(<TodayTodoCardView rows={[]} loading={false} onOpen={onOpen} />);
    expect(screen.getByText("Nothing due today.")).toBeTruthy();
    expect(screen.queryByText(/done$/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Plan your day" }));
    expect(onOpen).toHaveBeenCalledWith("/schedule");
  });
});
