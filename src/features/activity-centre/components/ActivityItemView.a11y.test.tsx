import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityItemView } from "./ActivityItemView";
import { loadDraft, saveDraft } from "../drafts";
import type { ActivityItem } from "../api/types";

// Sixty-two items multiplies every small friction by sixty-two.

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
  const onNext = vi.fn();
  const onRecord = vi.fn().mockResolvedValue(undefined);
  render(
    <ActivityItemView
      coachSource={{ sourceKind: "assignment", sourceId: "12345678-1234-4123-8123-123456789012" }}
      item={item}
      format="free-text"
      isLast={false}
      onResolved={vi.fn()}
      onRecord={onRecord}
      onNext={onNext}
      {...props}
    />,
  );
  return { onNext, onRecord, box: () => screen.getByRole("textbox") as HTMLTextAreaElement };
}

async function submit(text: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /submit/i }));
  await waitFor(() => expect(invoke).toHaveBeenCalled());
}

beforeEach(() => {
  invoke.mockReset();
  window.localStorage.clear();
});

describe("getting through 62 questions without the mouse", () => {
  it("puts the cursor in the answer box on arrival", () => {
    const { box } = renderItem();
    expect(document.activeElement).toBe(box());
  });

  it("announces the verdict instead of only drawing it", async () => {
    invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
    renderItem();
    await submit("If it is not refueled, then the beacon goes dark.");
    const live = await screen.findByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("Correct");
  });

  it("labels the answer without a recurring shortcut helper", () => {
    renderItem();
    expect(screen.getByLabelText("Your answer")).toBe(screen.getByRole("textbox"));
    expect(screen.queryByText(/to submit/i)).not.toBeInTheDocument();
  });

  it.each(["ctrlKey", "metaKey"])("keeps %s+Enter working with visible loading feedback", async (modifier) => {
    invoke.mockReturnValue(new Promise(() => {}));
    const { box } = renderItem();
    fireEvent.change(box(), { target: { value: "my response" } });
    fireEvent.keyDown(box(), { key: "Enter", [modifier]: true });
    expect(await screen.findByRole("button", { name: "Checking answer…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Checking answer…");
    expect(box().parentElement).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(invoke.mock.calls[0][1].body).toMatchObject({ sourceKind: "assignment", sourceId: "12345678-1234-4123-8123-123456789012", studentResponse: "my response", attemptNo: 1 });
  });

  it("continues on Enter once there is nothing left to answer", async () => {
    invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
    const { onNext } = renderItem();
    await submit("If it is not refueled, then the beacon goes dark.");
    await screen.findByRole("status");
    fireEvent.keyDown(screen.getByRole("status"), { key: "Enter" });
    expect(onNext).toHaveBeenCalled();
  });

  it("does not hijack Enter while the student is still writing", () => {
    const { onNext, box } = renderItem();
    fireEvent.change(box(), { target: { value: "still typing" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe("what happens to the words already written", () => {
  it("keeps the answer on Try again rather than emptying the box", async () => {
    invoke.mockResolvedValue({ data: { verdict: "partial", feedback: "Close." }, error: null });
    const { box } = renderItem();
    const nearly = "If the beacon goes dark, then the generator was not refueled by dusk.";
    await submit(nearly);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    // Nineteen words they had right are still there.
    expect(box().value).toBe(nearly);
  });

  it("caches what is typed but never submitted", async () => {
    const key = "ac:draft:assign-1:7";
    const { box } = renderItem({ draftKey: key });
    fireEvent.change(box(), { target: { value: "half a sentence" } });
    await waitFor(() => expect(loadDraft(key)).toBe("half a sentence"), { timeout: 2000 });
  });

  it("drops the cache once the attempt is on record", async () => {
    const key = "ac:draft:assign-1:7";
    saveDraft(key, "half a sentence");
    invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
    renderItem({ draftKey: key });
    await submit("If it is not refueled, then the beacon goes dark.");
    expect(loadDraft(key)).toBe("");
  });
});


describe("Spot hint-first revision", () => {
  it("keeps the hint and response while editing, without selecting all or exposing the answer", async () => {
    invoke.mockResolvedValue({ data: { verdict: "partial", feedback: "Look at what the second clause rules out." }, error: null });
    const spot = { ...item, category: "Rung 2" };
    const { box } = renderItem({ item: spot });
    await submit("my first response");
    await screen.findByText("Look at what the second clause rules out.");
    expect(screen.queryByText("Rung 2")).not.toBeInTheDocument();
    const select = vi.spyOn(box(), "select");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(document.activeElement).toBe(box()));
    expect(select).not.toHaveBeenCalled();
    expect(box()).toHaveValue("my first response");
    fireEvent.change(box(), { target: { value: "my revised response" } });
    expect(screen.getByText("Look at what the second clause rules out.")).toBeVisible();
    expect(screen.queryByText(item.explanation)).not.toBeInTheDocument();
    expect(screen.queryByText(item.credited_answers[0])).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Credited answer");
    expect(invoke.mock.calls[1][1].body).toMatchObject({ studentResponse: "my revised response", attemptNo: 2 });
    expect(screen.getByText(item.explanation)).toBeVisible();
  });
});


describe("resolved answer reading order", () => {
  it.each([{ isLast: false, action: "Next" }, { isLast: true, action: "Finish" }])(
    "places $action after the verdict and explanation", async ({ isLast, action }) => {
      invoke.mockResolvedValue({ data: { verdict: "correct", feedback: "Yes." }, error: null });
      const { onNext } = renderItem({ isLast });
      await submit("my response");
      const button = await screen.findByRole("button", { name: action });
      const feedback = screen.getByRole("status");
      const explanation = screen.getByText(item.explanation);
      expect(feedback.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(explanation.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(feedback).toHaveFocus();
      const response = screen.getByRole("textbox");
      expect(response).toBeDisabled();
      expect(response).toHaveValue("my response");
      expect(response.parentElement).toHaveAttribute("aria-busy", "false");
      expect(response).toHaveClass("text-foreground", "disabled:opacity-100", "focus-visible:ring-2", "focus-visible:ring-ring");
      expect(response).not.toHaveClass("disabled:opacity-50", "focus-visible:ring-0");
      expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
      fireEvent.click(button);
      expect(onNext).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps retry controls before the hint, then puts Next after a revealed answer", async () => {
    invoke.mockResolvedValue({ data: { verdict: "partial", feedback: "Check the direction." }, error: null });
    renderItem({ item: { ...item, category: "Rung 2" } });
    await submit("my response");
    const retry = await screen.findByRole("button", { name: "Try again" });
    const hint = screen.getByText("Check the direction.");
    expect(retry.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
    const answer = screen.getByText(item.credited_answers[0]);
    const next = screen.getByRole("button", { name: "Next" });
    expect(answer.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(item.explanation).compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
