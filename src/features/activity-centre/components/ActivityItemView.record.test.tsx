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
  supabase: { auth: { getUser: async () => ({ data: { user: { id: "actor" } }, error: null }) }, functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "actor" } }) }));
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
      coachSource={{ sourceKind: "assignment", sourceId: "12345678-1234-4123-8123-123456789012" }}
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

  it("retains an uncertain answer without recording or revealing, then retries the exact request", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "reply lost" } }).mockResolvedValueOnce({ data: { verdict: "correct", feedback: "Verified." }, error: null });
    const { onRecord, onResolved } = renderItem();
    await submit("my exact response");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveClass("bg-card", "text-card-foreground");
    expect(screen.getByRole("textbox")).toHaveValue("my exact response");
    expect(screen.queryByText("Credited answer")).not.toBeInTheDocument();
    expect(onRecord).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();
    const first = invoke.mock.calls[0][1].body;
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(onResolved).toHaveBeenCalledWith(7, "correct"));
    expect(invoke.mock.calls[1][1].body).toEqual(first);
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ verdict: "correct", attemptNo: 1 }));
  });
  it("records one neutral unjudged response only after deliberate continuation", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "down" } });
    const { onRecord, onResolved } = renderItem();
    await submit("my response");
    await screen.findByRole("alert");
    expect(onRecord).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Continue unjudged/ }));
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord).toHaveBeenCalledWith(expect.objectContaining({ verdict: null, attemptNo: 1, judgeSource: "fallback", responseText: "my response" }));
    expect(onResolved).toHaveBeenCalledWith(7, null);
    expect(screen.getByText("Not checked")).toBeInTheDocument();
    expect(screen.getByText("Credited answer")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
