import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityItemView } from "./ActivityItemView";
import { MAX_ATTEMPTS } from "../api/types";
import type { ActivityItem } from "../api/types";

// What reaches the append-only log, and when. The log is the only record of a
// student's run, so an item that ends without a row is an item the replay will
// serve them again on their next sitting as though they had never reached it.

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const item: ActivityItem = {
  order: 7,
  prompt: "Unless the generator is refueled by dusk, the beacon goes dark.",
  credited_answers: ["If the generator is not refueled by dusk, then the beacon goes dark."],
  explanation: '"Unless" (= if not).',
};

function renderItem(props: Partial<React.ComponentProps<typeof ActivityItemView>> = {}) {
  const onRecord = vi.fn().mockResolvedValue(undefined);
  const onResolved = vi.fn();
  render(
    <ActivityItemView
      item={item}
      format="free-text"
      isLast={false}
      onResolved={onResolved}
      onRecord={onRecord}
      onNext={vi.fn()}
      {...props}
    />,
  );
  return { onRecord, onResolved };
}

async function submit(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /submit/i }));
  await waitFor(() => expect(invoke).toHaveBeenCalled());
}

describe("what the item writes to the attempt log", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("records the attempt number and the verdict on a submit", async () => {
    invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
    const { onRecord } = renderItem();
    await submit("If it is not refueled, the beacon goes dark.");
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        itemOrder: 7,
        responseText: "If it is not refueled, the beacon goes dark.",
        verdict: "correct",
        attemptNo: 1,
        judgeSource: "coach",
      }),
    );
  });

  it("records a resolving row when the student bails out to the credited answer", async () => {
    // Show answer used to write nothing at all. The log then held one sub-cap
    // attempt, which the replay reads as "mid-retry", so the item came back on
    // the next sitting with the answer already spoiled.
    invoke.mockResolvedValue({ data: { verdict: "partial", feedback: "Close." }, error: null });
    const { onRecord, onResolved } = renderItem();
    await submit("If the beacon goes dark, it was not refueled.");
    onRecord.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /show answer/i }));

    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({ itemOrder: 7, verdict: "partial", attemptNo: MAX_ATTEMPTS }),
    );
    expect(onResolved).toHaveBeenCalledWith(7, "partial");
  });

  it("continues the attempt numbering when the item is picked back up mid-try", async () => {
    invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
    const { onRecord } = renderItem({ initialAttempts: 1, initialValue: "an earlier try" });
    expect(screen.getByRole("textbox")).toHaveValue("an earlier try");
    await submit("a second, better try");
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ attemptNo: 2 }));
  });

  // A Coach outage used to render as a red "Not yet" over an answer nobody had
  // read, and then score it as a zero for the rest of time.
  it("shows a neutral not-checked state rather than a verdict when the Coach fails", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "down" } });
    renderItem();
    await submit("If it is not refueled, the beacon goes dark.");
    expect(await screen.findByText("Not checked")).toBeInTheDocument();
    expect(screen.queryByText("Not yet")).not.toBeInTheDocument();
  });

  it("ends the item on an outage rather than offering a retry it cannot judge", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "down" } });
    const { onRecord } = renderItem();
    await submit("anything");
    // Resolved and revealed: the student is never stuck waiting on a Coach that
    // is not answering, and there is nothing left to submit.
    expect(screen.queryByRole("button", { name: /show answer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByText("Credited answer")).toBeInTheDocument();
    for (const call of onRecord.mock.calls) {
      expect(call[0].verdict).toBeNull();
    }
  });

  it("records the failed attempt with no verdict when the Coach is unreachable", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "down" } });
    const { onRecord, onResolved } = renderItem();
    await submit("anything");
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({ verdict: null, attemptNo: 1, judgeSource: "fallback" }),
    );
    expect(onResolved).toHaveBeenCalledWith(7, null);
  });
});
