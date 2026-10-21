import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityItemView } from "./ActivityItemView";
import { loadDraft, saveDraft } from "../drafts";
import type { ActivityItem } from "../api/types";

// Sixty-two items multiplies every small friction by sixty-two.

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
  const onNext = vi.fn();
  const onRecord = vi.fn().mockResolvedValue(undefined);
  render(
    <ActivityItemView
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

  it("tells the student about the shortcut that has always worked", () => {
    renderItem();
    expect(screen.getByText(/to submit/i)).toBeInTheDocument();
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
