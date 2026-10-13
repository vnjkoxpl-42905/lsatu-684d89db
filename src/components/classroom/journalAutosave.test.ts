import { afterEach, describe, expect, it, vi } from "vitest";
import type { JournalDraft } from "@/components/journal/entry/ReviewForm";
import {
  createJournalAutosaveQueue,
  mergeJournalDraft,
  type JournalSavePayload,
} from "@/components/classroom/journalAutosave";

const EMPTY_DRAFT: JournalDraft = {
  self_rating: null,
  date_taken: "",
  question_summary: "",
  wrong_answer: "",
  wrong_reasoning: "",
  correct_reasoning: "",
  lesson: "",
  other_notes: "",
};

function payload(
  qid: string,
  draft: JournalDraft = EMPTY_DRAFT,
): JournalSavePayload {
  return {
    classId: "class-1",
    qid,
    draft,
    annotations: [],
  };
}

describe("journal autosave queue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes the captured entry when navigation happens inside the debounce", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = createJournalAutosaveQueue(save, 800);
    const draftA = { ...EMPTY_DRAFT, question_summary: "Entry A summary" };

    queue.schedule(payload("PT80-S2-Q14", draftA));
    await queue.flush();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        qid: "PT80-S2-Q14",
        draft: expect.objectContaining({
          question_summary: "Entry A summary",
        }),
      }),
    );
  });

  it("does not save again when navigation follows a completed timer", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = createJournalAutosaveQueue(save, 800);

    queue.schedule(payload("PT80-S2-Q14"));
    await vi.advanceTimersByTimeAsync(800);
    await queue.flush();

    expect(save).toHaveBeenCalledTimes(1);
  });

  it("merges two same-tick field edits into the latest draft", () => {
    const first = mergeJournalDraft(EMPTY_DRAFT, {
      question_summary: "Summary",
    });
    const second = mergeJournalDraft(first, {
      wrong_reasoning: "Reasoning",
    });

    expect(second).toEqual(
      expect.objectContaining({
        question_summary: "Summary",
        wrong_reasoning: "Reasoning",
      }),
    );
  });
});
