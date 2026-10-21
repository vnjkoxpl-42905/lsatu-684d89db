import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityItemView } from "./ActivityItemView";
import type { ActivityItem } from "../api/types";

// A world can decide a verdict without the Coach either by matching an authored
// answer or by supplying an authoritative formal parser. Activities without a
// local judge continue to reach the Coach exactly as before.

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "actor" } }) }));

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

const fastPath = (i: ActivityItem, response: string) =>
  i.credited_answers.some((c) => c.trim().toLowerCase() === response.trim().toLowerCase());

const localJudge = (_i: ActivityItem, response: string) => ({
  verdict: response.includes("greenhouse") ? ("correct" as const) : ("incorrect" as const),
  feedback: "Checked locally.",
});

function renderItem(props: Partial<React.ComponentProps<typeof ActivityItemView>> = {}) {
  const onRecord = vi.fn().mockResolvedValue(undefined);
  const onResolved = vi.fn();
  render(
    <ActivityItemView
      coachSource={{ sourceKind: "assignment", sourceId: "12345678-1234-4123-8123-123456789012" }}
      item={item}
      format="free-text"
      isLast={false}
      fastPath={fastPath}
      shadowFault={() => "reversal:both"}
      onResolved={onResolved}
      onRecord={onRecord}
      onNext={vi.fn()}
      {...props}
    />,
  );
  return { onRecord, onResolved };
}

function type(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /submit/i }));
}

describe("the local fast path", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ data: { verdict: "partial", feedback: "Close." }, error: null });
  });

  it("resolves a credited answer correct without calling the Coach", async () => {
    const { onResolved } = renderItem();
    type(item.credited_answers[0]);
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(3, "correct"));
    expect(invoke).not.toHaveBeenCalled();
  });

  // The case that killed the first design: the Coach is judged partial-reversal
  // on this exact string by diagnose(), and the task asks for it.
  it("resolves the authored contrapositive correct, without the Coach", async () => {
    const { onResolved } = renderItem();
    type(item.credited_answers[1]);
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(3, "correct"));
    expect(invoke).not.toHaveBeenCalled();
  });

  it("marks the attempt as fast-path judged and records the shadow reading", async () => {
    const { onRecord } = renderItem();
    type(item.credited_answers[0]);
    await waitFor(() => expect(onRecord).toHaveBeenCalled());
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        itemOrder: 3,
        verdict: "correct",
        attemptNo: 1,
        judgeSource: "fast-path",
        shadowFault: "reversal:both",
      }),
    );
    expect(onRecord.mock.calls[0][0].latencyMs).toBeTypeOf("number");
  });

  it("shows the correct chip without waiting on a network round trip", async () => {
    renderItem();
    type(item.credited_answers[0]);
    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
  });

  it("still asks the Coach for anything the author did not write", async () => {
    const { onResolved } = renderItem();
    type("If the orchids bloom by morning, then the fans run overnight.");
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(onResolved).not.toHaveBeenCalled(); // first-attempt partial keeps the retry
  });

  it("uses an authoritative local judge for a paraphrase without calling the Coach", async () => {
    const { onResolved, onRecord } = renderItem({ localJudge });
    type("If the greenhouse fans run overnight, then the orchids bloom by morning.");
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(3, "correct"));
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({ verdict: "correct", judgeSource: "fast-path" }),
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("continues the attempt numbering it inherited from an earlier sitting", async () => {
    const { onRecord } = renderItem({ initialAttempts: 1 });
    type(item.credited_answers[0]);
    await waitFor(() => expect(onRecord).toHaveBeenCalled());
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ attemptNo: 2 }));
  });

  it("judges exactly as before for an Activity whose world offers no fast path", async () => {
    const { onResolved } = renderItem({ fastPath: undefined, shadowFault: undefined });
    type(item.credited_answers[0]);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(onResolved).not.toHaveBeenCalled();
  });
});
