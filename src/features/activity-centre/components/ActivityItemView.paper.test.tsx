import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityItem } from "../api/types";
import { buildPaperDiagramChoices } from "../worlds/switchyard/diagramChoices";
import { ActivityItemView } from "./ActivityItemView";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const item: ActivityItem = {
  order: 3,
  prompt: "Whenever the greenhouse fans run overnight, the orchids bloom by morning.",
  credited_answers: [
    "If the fans run overnight, then the orchids bloom by morning.",
    "If the orchids did not bloom by morning, then the fans did not run overnight.",
  ],
  explanation: '"Whenever" (sufficient).',
};

describe("the paper-first conditional response", () => {
  beforeEach(() => invoke.mockReset());

  it("requires paper work before revealing exactly five diagrams", () => {
    render(
      <ActivityItemView
        item={item}
        format="mcq"
        isLast={false}
        paperChoices={buildPaperDiagramChoices(item.credited_answers, item.order)}
        onResolved={vi.fn()}
        onRecord={vi.fn().mockResolvedValue(undefined)}
        onNext={vi.fn()}
      />,
    );

    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "I’ve diagrammed it" }));
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /^Not:/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("NOT")).not.toBeInTheDocument();
  });

  it("records the selected diagram and never calls the Coach", async () => {
    const choices = buildPaperDiagramChoices(item.credited_answers, item.order);
    const correctIndex = choices.findIndex((choice) => choice.verdict === "correct");
    const onResolved = vi.fn();
    const onRecord = vi.fn().mockResolvedValue(undefined);
    render(
      <ActivityItemView
        item={item}
        format="mcq"
        isLast={false}
        paperChoices={choices}
        onResolved={onResolved}
        onRecord={onRecord}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "I’ve diagrammed it" }));
    fireEvent.click(screen.getAllByRole("radio")[correctIndex]);
    fireEvent.click(screen.getByRole("button", { name: "Check my diagram" }));

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(3, "correct"));
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        responseText: choices[correctIndex].responseText,
        verdict: "correct",
        judgeSource: "fast-path",
      }),
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("gives rule-specific retry feedback for a wrong route without calling the Coach", async () => {
    const choices = buildPaperDiagramChoices(item.credited_answers, item.order);
    const wrongIndex = choices.findIndex((choice) => choice.id === "reversal");
    const onResolved = vi.fn();
    render(
      <ActivityItemView
        item={item}
        format="mcq"
        isLast={false}
        paperChoices={choices}
        onResolved={onResolved}
        onRecord={vi.fn().mockResolvedValue(undefined)}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "I’ve diagrammed it" }));
    fireEvent.click(screen.getAllByRole("radio")[wrongIndex]);
    fireEvent.click(screen.getByRole("button", { name: "Check my diagram" }));

    expect(await screen.findByText(/runs the arrow backwards/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(onResolved).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not treat a draft from the former free-text version as a selected diagram", () => {
    render(
      <ActivityItemView
        item={item}
        format="mcq"
        isLast={false}
        initialValue="If the fans run, then the orchids bloom."
        paperChoices={buildPaperDiagramChoices(item.credited_answers, item.order)}
        onResolved={vi.fn()}
        onRecord={vi.fn().mockResolvedValue(undefined)}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "I’ve diagrammed it" }));
    expect(screen.getByRole("button", { name: "Check my diagram" })).toBeDisabled();
    expect(screen.getAllByRole("radio").every((choice) => choice.getAttribute("aria-checked") === "false")).toBe(true);
  });
});
