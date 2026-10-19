import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RcTrainingFeedback from "./RcTrainingFeedback";
import { getRcGrades, gradeRcRecap, type RcGradeItem } from "./lib/grading";
vi.mock("./lib/grading", () => ({ getRcGrades: vi.fn(), gradeRcRecap: vi.fn() }));
const pending = (id: string): RcGradeItem => ({ recapId: id, label: `Paragraph ${id}`, status: "ungraded", retryable: true });
const ready = (id: string): RcGradeItem => ({ ...pending(id), status: "ready", retryable: false, grade: {
  version: 2, transcript: "Some patients improved.", sourceText: "Some patients improved.", sourceHash: "source", audioHash: "audio", model: "test", asrEngine: "test",
  assessment: { summary: `Kept the meaning in ${id}.`, details: [{ sourceId: "s1", status: "kept", sourceQuote: "Some patients improved.", recallQuote: "Some patients improved.", explanation: "The group and improvement both survive." }], relationships: [], nextStep: "Keep the limits on the next claim.", coverage: { earned: 2, possible: 2, percent: 100, label: "Meaning points" } },
} });
beforeEach(() => vi.resetAllMocks());
describe("RC recall feedback", () => {
  it("does not let a delayed initial status overwrite an explicit review", async () => {
    let resolveInitial!: (value: Awaited<ReturnType<typeof getRcGrades>>) => void;
    vi.mocked(getRcGrades).mockReturnValueOnce(new Promise((resolve) => { resolveInitial = resolve; })).mockResolvedValue({ attemptId: "attempt", items: [pending("1")] });
    vi.mocked(gradeRcRecap).mockResolvedValue({ attemptId: "attempt", items: [ready("1")] });
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    fireEvent.click(screen.getByRole("button", { name: "Get feedback on my recall" }));
    expect(await screen.findByText("Recall grade: 100%")).toBeInTheDocument();
    resolveInitial({ attemptId: "attempt", items: [pending("1")] });
    await waitFor(() => expect(screen.getByText("Recall grade: 100%")).toBeInTheDocument());
  });
  it("refreshes processing feedback without making another grading call", async () => {
    vi.mocked(getRcGrades).mockResolvedValueOnce({ attemptId: "attempt", items: [{ ...pending("1"), status: "processing", retryable: false }] }).mockResolvedValue({ attemptId: "attempt", items: [ready("1")] });
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Check feedback status" }));
    expect(await screen.findByText("Recall grade: 100%")).toBeInTheDocument();
    expect(gradeRcRecap).not.toHaveBeenCalled();
  });
  it("keeps mixed-state status refresh separate from starting new feedback", async () => {
    const mixed = [{ ...pending("1"), status: "processing" as const, retryable: false }, pending("2")];
    vi.mocked(getRcGrades).mockResolvedValue({ attemptId: "attempt", items: mixed });
    vi.mocked(gradeRcRecap).mockResolvedValue({ attemptId: "attempt", items: [ready("2")] });
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Check feedback status" }));
    await waitFor(() => expect(getRcGrades).toHaveBeenCalledTimes(2));
    expect(gradeRcRecap).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Get feedback on my recall" }));
    await waitFor(() => expect(gradeRcRecap).toHaveBeenCalledExactlyOnceWith("attempt", "2"));
  });
  it("reviews saved clips while leaving an unsaved clip ungradable", async () => {
    vi.mocked(getRcGrades).mockResolvedValue({ attemptId: "attempt", items: [ready("1"), pending("2"), { ...pending("3"), status: "ungradable", retryable: false, reason: "The recording has not saved yet." }] });
    vi.mocked(gradeRcRecap).mockResolvedValue({ attemptId: "attempt", items: [ready("2")] });
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    expect(await screen.findByText("Kept the meaning in 1.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Get feedback on my recall" }));
    await waitFor(() => expect(gradeRcRecap).toHaveBeenCalledExactlyOnceWith("attempt", "2"));
    expect(screen.getByText("The recording has not saved yet.")).toBeInTheDocument();
  });
  it("ignores an old attempt's delayed response after switching attempts", async () => {
    let resolveOld!: (value: Awaited<ReturnType<typeof getRcGrades>>) => void;
    vi.mocked(getRcGrades).mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValue({ attemptId: "second", items: [] });
    const view = render(<RcTrainingFeedback attemptId="first" enabled />);
    view.rerender(<RcTrainingFeedback attemptId="second" enabled />);
    expect(await screen.findByText("There are no recorded recalls in this attempt.")).toBeInTheDocument();
    resolveOld({ attemptId: "first", items: [ready("old")] });
    await waitFor(() => expect(screen.queryByText("Kept the meaning in old.")).not.toBeInTheDocument());
  });
  it("shows source and transcript evidence without requesting another grade", async () => {
    vi.mocked(getRcGrades).mockResolvedValue({ attemptId: "attempt", items: [{ ...pending("1"), status: "ready", retryable: false, grade: {
      version: 1, transcript: "Every patient improved.", sourceText: "Some patients improved.", sourceHash: "source", audioHash: "audio", model: "test", asrEngine: "test",
      assessment: { summary: "Your recall changed the size of the group.", details: [{ sourceId: "s1", status: "changed", sourceQuote: "Some patients", recallQuote: "Every patient", explanation: "Some does not establish that every patient improved." }], relationships: [], nextStep: "Keep the word some when you recall the claim.", coverage: { earned: 0, possible: 2, percent: 0, label: "Meaning points" } },
    } }] });
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    expect(await screen.findByText("Meaning changed")).toBeInTheDocument();
    expect(screen.getByText("Some does not establish that every patient improved.")).toBeInTheDocument();
    expect(screen.getByText("Your transcript and the source")).toBeInTheDocument();
    expect(screen.getByText("Recall grade: 0%")).toBeInTheDocument();
    expect(screen.getByText("0 / 2 meaning points")).toBeInTheDocument();
    expect(gradeRcRecap).not.toHaveBeenCalled();
  });
  it("does not request feedback before the result and recordings are saved", () => {
    render(<RcTrainingFeedback attemptId="attempt" enabled={false} />);
    expect(getRcGrades).not.toHaveBeenCalled();
    expect(gradeRcRecap).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Finish the attempt");
  });
  it("keeps all recordings visible when grading replies contain just one item", async () => {
    vi.mocked(getRcGrades).mockResolvedValue({ attemptId: "attempt", items: [pending("1"), pending("2")] });
    vi.mocked(gradeRcRecap).mockImplementation(async (_id, recapId) => ({ attemptId: "attempt", items: [{ ...pending(recapId), status: "ungradable", reason: `No clear speech in ${recapId}.`, retryable: false }] }));
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    const request = await screen.findByRole("button", { name: "Get feedback on my recall" });
    expect(gradeRcRecap).not.toHaveBeenCalled();
    fireEvent.click(request);
    await waitFor(() => expect(gradeRcRecap).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No clear speech in 1.")).toBeInTheDocument();
    expect(screen.getByText("No clear speech in 2.")).toBeInTheDocument();
  });
  it("retains saved feedback and offers a retry when a provider request fails", async () => {
    vi.mocked(getRcGrades).mockResolvedValue({ attemptId: "attempt", items: [pending("1")] });
    vi.mocked(gradeRcRecap).mockRejectedValue(new Error("offline"));
    render(<RcTrainingFeedback attemptId="attempt" enabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Get feedback on my recall" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your recordings and any completed feedback are saved");
    expect(screen.getByRole("heading", { name: "Paragraph 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get feedback on my recall" })).toBeEnabled();
  });
});
