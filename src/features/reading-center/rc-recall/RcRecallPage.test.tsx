import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptRow, RecapRow } from "./lib/attempts";
import { saveCheckpoint, listCheckpoints, contentKeyFor, type Checkpoint } from "./lib/checkpoint";

// Explicit mocks of the data boundaries (passage bank, attempts API, device
// backup). Nothing here is a real backend. Checkpoints use the real store.
const data = vi.hoisted(() => ({
  index: [] as unknown[], all: [] as unknown[], recaps: [] as unknown[],
  backend: { state: "available" } as { state: string; reason?: string },
  loadPassages: vi.fn(), listCalls: [] as number[], pageSize: 25,
  listFails: false as boolean | "missing_table",
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "s1" } }) }));
vi.mock("@/features/rc/lib/rcBank", () => ({
  loadAllIndexPassages: async () => data.index,
  loadPassages: (ids: number[]) => data.loadPassages(ids),
}));
vi.mock("./lib/attempts", async (orig) => ({
  ...(await orig<typeof import("./lib/attempts")>()),
  probeAttemptsBackend: async () => data.backend,
  listAttempts: async (_student: string, offset = 0, size = 25) => {
    data.listCalls.push(offset);
    if (data.listFails === "missing_table") throw Object.assign(new Error("Could not find the table"), { code: "PGRST205" });
    if (data.listFails) throw new Error("offline");
    const slice = data.all.slice(offset, offset + size + 1) as AttemptRow[];
    const attempts = slice.slice(0, size);
    return { attempts, recaps: data.recaps.filter((r) => attempts.some((a) => a.id === (r as RecapRow).attempt_id)), hasMore: slice.length > size, nextOffset: offset + attempts.length };
  },
  createAttempt: vi.fn(),
  readAttemptProgress: vi.fn(async () => { throw new Error("offline"); }),
  uploadRecording: vi.fn(),
}));
vi.mock("./useRecordingRecovery", () => ({
  useRecordingRecovery: () => ({ running: false, result: null, error: null, attention: 0, retry: vi.fn(), download: vi.fn() }),
}));
vi.mock("./RcRecallRunner", () => ({
  default: (props: { resume: Checkpoint | null; attempt: AttemptRow }) => <div data-testid="runner">{props.resume ? `resumed at ${props.resume.stepId}` : "new"} {props.attempt.id}</div>,
  formatClock: (s: number) => String(s),
}));

import { AttemptOutcomeUnknownError, createAttempt } from "./lib/attempts";
import RcRecallPage from "./RcRecallPage";

const idx = (setNumber: number) => ({
  passageId: 140040 + setNumber, preptest: 140, section: 4, setNumber, title: null, topic: null, format: null,
  frameworks: [], difficulty: null, questionCount: 0, explainedCount: 0, questionIds: [], firstWords: "Opening words",
});
const attemptRow = (n: number, over: Partial<AttemptRow> = {}): AttemptRow => ({
  id: `a${n}`, student_id: "s1", mode: "rc_recall", preptest: 140, section: 4, passage_ids: [140041, 140042, 140043, 140044], confirmation_scope: "all_read",
  started_at: `2026-10-${String(30 - (n % 28)).padStart(2, "0")}T10:00:00Z`, finished_at: "2026-10-01T10:30:00Z", elapsed_seconds: 1800, completed: true, ...over,
});
const loaded = [1, 2, 3, 4].map((n) => ({ passageId: 140040 + n, setNumber: n, text: `Para one of ${n}.\n\nPara two of ${n}.` }));

function Where() { const l = useLocation(); return <output data-testid="where">{l.pathname}{l.hash}</output>; }
const renderPage = (path = "/reading-center/rc-recall") => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><RcRecallPage /><Where /></MemoryRouter>
  </QueryClientProvider>,
);
const startButton = async () => (await screen.findAllByRole("button", { name: /^Start PT140/i }))[0];

beforeEach(() => {
  data.index = [1, 2, 3, 4].map(idx);
  data.all = []; data.recaps = []; data.listCalls = []; data.listFails = false;
  data.backend = { state: "available" };
  data.loadPassages.mockReset().mockImplementation(async (ids: number[]) => ids.map((id) => loaded.find((p) => p.passageId === id)).filter(Boolean));
  vi.mocked(createAttempt).mockReset();
  window.localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => vi.unstubAllEnvs());

describe("RC Training page: entry", () => {
  it("returns to the passage list every time the start link is clicked", async () => {
    renderPage("/reading-center/rc-recall#rc-recall-start");
    const heading = screen.getByRole("heading", { name: "Choose your practice" });
    await waitFor(() => expect(heading).toHaveFocus());
    screen.getByRole("searchbox").focus();
    fireEvent.click(screen.getByRole("link", { name: /let.s start/i }));
    await waitFor(() => expect(heading).toHaveFocus());
    screen.getByRole("searchbox").focus();
    fireEvent.click(screen.getByRole("link", { name: /let.s start/i }));
    await waitFor(() => expect(heading).toHaveFocus());
  });
  it("explains the goal first, with an example and a dedicated instruction page", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "RC Training" })).toBeInTheDocument();
    expect(screen.getByText(/Your goal is to retell each paragraph/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /let.s start/i })).toHaveAttribute("href", "/reading-center/rc-recall#rc-recall-start");
    expect(screen.getByRole("link", { name: "See the instructions" })).toHaveAttribute("href", "/reading-center/rc-recall/instructions");
    expect(document.body.textContent).not.toMatch(/Cappuccino|Decaf/);
    expect(screen.getByRole("radio", { name: /^one passage$/i })).toBeChecked();
  });
  it("lists one-click passage launches with no setup dropdown", async () => {
    renderPage();
    await waitFor(async () => expect(await startButton()).toBeEnabled());
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Available passages" })).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("checkbox", { name: "Show elapsed time" })).toBeChecked();
  });
  it("finds a passage by title or PrepTest and keeps full sections available", async () => {
    renderPage();
    await startButton();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "PT999" } });
    expect(screen.getByText(/No passages match/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "PT140" } });
    fireEvent.click(screen.getByRole("radio", { name: /Full section/ }));
    expect(within(screen.getByRole("list", { name: "Available full sections" })).getAllByRole("button")).toHaveLength(1);
  });
  it("hides optional video media when no media base is set", async () => {
    renderPage();
    await startButton();
    expect(document.querySelector("video")).toBeNull();
  });
});

describe("persistence availability", () => {
  it("keeps launch off with an actionable, non-technical message when the attempts backend is missing", async () => {
    data.backend = { state: "unavailable", reason: "missing_table" };
    renderPage();
    const alert = await screen.findByText(/saving is not available yet/i);
    expect(alert).toHaveTextContent(/starting practice is turned off/i);
    expect(alert.textContent).not.toMatch(/PGRST|rc_recall_attempts|schema|table/i);
    expect(screen.getAllByRole("button", { name: /^Start PT140/i })[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: /check again/i })).toBeInTheDocument();
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("does not substitute anything or fake a start; retry re-checks and then enables launch", async () => {
    data.backend = { state: "unavailable", reason: "missing_table" };
    renderPage();
    await screen.findByText(/saving is not available yet/i);
    data.backend = { state: "available" };
    fireEvent.click(screen.getByRole("button", { name: /check again/i }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Start PT140/i })[0]).toBeEnabled());
    expect(screen.queryByText(/saving is not available yet/i)).not.toBeInTheDocument();
  });

  it("keeps launch off, without blaming the backend, when the check itself cannot connect", async () => {
    data.backend = { state: "unknown" };
    renderPage();
    expect(await screen.findByText(/could not check whether saving is available/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Start PT140/i })[0]).toBeDisabled();
  });

  it("history shows a calm message, not a raw error, when the table is missing", async () => {
    data.backend = { state: "unavailable", reason: "missing_table" };
    data.listFails = "missing_table";
    renderPage();
    expect(await screen.findByText(/will appear here once saving is available/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/PGRST205/);
  });
});

describe("starting a section", () => {
  it("launches the default single passage with its actual identity", async () => {
    vi.mocked(createAttempt).mockResolvedValue(attemptRow(1, { passage_ids: [140041], finished_at: null }));
    renderPage();
    const button = await startButton();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByTestId("runner")).toBeInTheDocument();
    expect(createAttempt).toHaveBeenCalledWith(expect.objectContaining({ passageIds: [140041], confirmationScope: "all_read" }));
    expect(data.loadPassages).toHaveBeenCalledWith([140041]);
  });

  it("starts passage three without renumbering the bank record", async () => {
    vi.mocked(createAttempt).mockResolvedValue(attemptRow(1, { passage_ids: [140043], finished_at: null }));
    renderPage();
    const button = await screen.findByRole("button", { name: "Start PT140 · Section 4 · Passage 3" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByTestId("runner")).toBeInTheDocument();
    expect(createAttempt).toHaveBeenCalledWith(expect.objectContaining({ passageIds: [140043] }));
  });

  it("starts nothing and saves nothing when the loaded section does not match", async () => {
    data.loadPassages.mockResolvedValue([]);
    renderPage();
    const button = await startButton();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be started.*nothing was saved/i);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("after a lost response, retries with the same attempt id and says the outcome is unknown, not 'nothing saved'", async () => {
    vi.mocked(createAttempt)
      .mockRejectedValueOnce(new AttemptOutcomeUnknownError("fixed", new TypeError("Failed to fetch")))
      .mockResolvedValueOnce(attemptRow(1, { id: "fixed", finished_at: null }));
    renderPage();
    const button = await startButton();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not confirm whether this practice was saved/i);
    expect(alert).not.toHaveTextContent(/nothing was saved/i);
    fireEvent.click(button);
    expect(await screen.findByTestId("runner")).toHaveTextContent("new fixed");
    const ids = vi.mocked(createAttempt).mock.calls.map(([input]) => input.id);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
  });

  it("keeps the same id for the same section across retries, and gives a different choice its own id", async () => {
    vi.mocked(createAttempt).mockRejectedValue(new Error("denied"));
    renderPage();
    const button = await startButton();
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await screen.findByRole("alert");
    fireEvent.click(button);
    await waitFor(() => expect(createAttempt).toHaveBeenCalledTimes(2));
    const ids = () => vi.mocked(createAttempt).mock.calls.map(([input]) => input.id);
    expect(ids()[1]).toBe(ids()[0]);
    fireEvent.click(screen.getByRole("radio", { name: /full section/i }));
    fireEvent.click(await startButton());
    await waitFor(() => expect(createAttempt).toHaveBeenCalledTimes(3));
    expect(ids()[2]).not.toBe(ids()[0]);
  });

  it("does not reuse an unknown attempt id when a different single passage is chosen", async () => {
    vi.mocked(createAttempt).mockRejectedValue(new AttemptOutcomeUnknownError("unknown", new Error("offline")));
    renderPage();
    const first = await startButton();
    await waitFor(() => expect(first).toBeEnabled());
    fireEvent.click(first);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Start PT140 · Section 4 · Passage 2" }));
    await waitFor(() => expect(createAttempt).toHaveBeenCalledTimes(2));
    const [one, two] = vi.mocked(createAttempt).mock.calls.map(([input]) => input);
    expect(two.id).not.toBe(one.id);
    expect(two.passageIds).toEqual([140042]);
  });
});

describe("attempt history", () => {
  const recap = (over: Partial<RecapRow>): RecapRow => ({
    id: "r1", attempt_id: "a1", student_id: "s1", recap_key: "p1-passage-recap", passage_position: 1, kind: "passage_recap", voice: "spoken",
    recording_state: "saved", object_path: "s1/a1/p1-passage-recap-x.webm", mime_type: "audio/webm", duration_ms: 65_000, ...over,
  });

  it("lists prior attempts without overstating saved recordings", async () => {
    data.all = [attemptRow(1)];
    data.recaps = [recap({ id: "r1" }), recap({ id: "r2", recording_state: "failed", object_path: null, recap_key: "p2-passage-recap", passage_position: 2 })];
    renderPage();
    await waitFor(() => expect(screen.getByText(/1 of 2 spoken recalls saved/)).toBeInTheDocument());
    expect(screen.getByText(/30:00/)).toBeInTheDocument();
    expect(screen.getByText("Recording needs attention")).toBeInTheDocument();
  });

  it("offers playback and download only for a verified saved recording", async () => {
    data.all = [attemptRow(1)];
    data.recaps = [recap({ id: "r1" }), recap({ id: "r2", recording_state: "failed", object_path: null, recap_key: "p2-passage-recap", passage_position: 2 })];
    renderPage();
    const details = (await screen.findByText(/recalls in this attempt/i)).closest("details")!;
    fireEvent.click(within(details).getByText(/recalls in this attempt/i));
    expect(within(details).getAllByRole("button", { name: "Play" })).toHaveLength(1);
    expect(within(details).getAllByRole("button", { name: "Download" })).toHaveLength(1);
    expect(within(details).getByText(/Passage 2, whole-passage recall/)).toBeInTheDocument();
    expect(within(details).getByText(/Recording not saved/)).toBeInTheDocument();
  });

  it("pages deterministically beyond 50 without skipping or repeating an attempt", async () => {
    data.all = Array.from({ length: 60 }, (_, i) => attemptRow(i));
    renderPage();
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3, name: /PT140/ })).toHaveLength(25));
    fireEvent.click(screen.getByRole("button", { name: /show earlier attempts/i }));
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3, name: /PT140/ })).toHaveLength(50));
    fireEvent.click(screen.getByRole("button", { name: /show earlier attempts/i }));
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3, name: /PT140/ })).toHaveLength(60));
    expect(screen.queryByRole("button", { name: /show earlier attempts/i })).not.toBeInTheDocument();
    expect(data.listCalls).toEqual([0, 25, 50]);
  });

  it("an unfinished attempt with no place on this device says so and offers no false Resume", async () => {
    data.all = [attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null })];
    renderPage();
    expect(await screen.findByText("Not resumable here")).toBeInTheDocument();
    expect(screen.getByText(/can't be resumed here/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument();
  });

  it("deduplicates attempts returned on overlapping history pages", async () => {
    data.all = [...Array.from({ length: 25 }, (_, i) => attemptRow(i)), attemptRow(24)];
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /show earlier attempts/i }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /show earlier attempts/i })).not.toBeInTheDocument());
    expect(screen.getAllByRole("heading", { level: 3, name: /PT140/ })).toHaveLength(25);
  });

  it("does not resurrect local attempts outside a successful server list and clears a confirmed finish", async () => {
    const attempt = attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null });
    const local: Checkpoint = {
      version: 1, studentId: "s1", attemptId: "a1", attempt, contentKey: "k", scope: "all_read", stepIndex: 0, stepId: "p1-para1-read",
      recaps: [], sectionMs: 5000, passageMs: 5000, showElapsedTimer: true, savedAt: 1, pending: null,
    };
    saveCheckpoint(local);
    const view = renderPage();
    await screen.findByText("Your first practice starts here.");
    expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument();
    view.unmount();
    data.all = [attemptRow(1)];
    renderPage();
    await screen.findByText("Completed");
    await waitFor(() => expect(listCheckpoints("s1")).toEqual([]));
  });

  it("an unfinished attempt with a place on this device resumes at the saved step", async () => {
    data.all = [attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null })];
    const section = { preptest: 140, section: 4, passageIds: [140041, 140042, 140043, 140044] };
    saveCheckpoint({
      version: 1, studentId: "s1", attemptId: "a1", contentKey: contentKeyFor(section), scope: "all_read", stepIndex: 1, stepId: "p1-para1-recall",
      recaps: [], sectionMs: 5000, passageMs: 5000, showElapsedTimer: true, savedAt: 1, pending: null,
    });
    renderPage();
    const resume = (await screen.findAllByRole("button", { name: /resume/i }))[0];
    fireEvent.click(resume);
    expect(await screen.findByTestId("runner")).toHaveTextContent("resumed at p1-para1-recall a1");
  });

  it("resumes a single original third passage from its own checkpoint", async () => {
    const attempt = attemptRow(1, { passage_ids: [140043], finished_at: null, completed: false, elapsed_seconds: null });
    data.all = [attempt];
    saveCheckpoint({
      version: 1, studentId: "s1", attemptId: "a1", attempt,
      contentKey: contentKeyFor({ preptest: 140, section: 4, passageIds: [140043] }), scope: "all_read", stepIndex: 1, stepId: "p1-para1-recall",
      recaps: [], sectionMs: 5000, passageMs: 5000, showElapsedTimer: true, savedAt: 1, pending: null,
    });
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /resume/i }))[0]);
    expect(await screen.findByTestId("runner")).toHaveTextContent("resumed at p1-para1-recall a1");
    expect(data.loadPassages).toHaveBeenCalledWith([140043]);
  });

  it("refuses to resume from a place saved for different passages, and says why", async () => {
    data.all = [attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null })];
    saveCheckpoint({
      version: 1, studentId: "s1", attemptId: "a1", contentKey: "pt1-s1:9,9,9,9", scope: "all_read", stepIndex: 1, stepId: "p1-para1-recall",
      recaps: [], sectionMs: 5000, passageMs: 5000, showElapsedTimer: true, savedAt: 1, pending: null,
    });
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: /resume/i }))[0]);
    expect(await screen.findByText(/passages in this section have changed/i)).toBeInTheDocument();
    expect(screen.queryByTestId("runner")).not.toBeInTheDocument();
  });

  it("keeps same-device work visible and resumable when server history is unavailable", async () => {
    data.listFails = true;
    const attempt = attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null });
    saveCheckpoint({
      version: 1, studentId: "s1", attemptId: "a1", attempt,
      contentKey: contentKeyFor({ preptest: 140, section: 4, passageIds: attempt.passage_ids }),
      scope: "all_read", stepIndex: 1, stepId: "p1-para1-recall",
      recaps: [], sectionMs: 5000, passageMs: 5000, showElapsedTimer: true, savedAt: 1, pending: null,
    });
    renderPage();
    expect(await screen.findByText(/showing work kept on this device/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /resume this practice/i }));
    expect(await screen.findByTestId("runner")).toHaveTextContent("resumed at p1-para1-recall a1");
  });

  it("never offers another account's saved place", async () => {
    data.all = [attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null })];
    saveCheckpoint({
      version: 1, studentId: "someone-else", attemptId: "a1", contentKey: "k", scope: "all_read", stepIndex: 0, stepId: "p1-para1-read",
      recaps: [], sectionMs: 1, passageMs: 1, showElapsedTimer: true, savedAt: 1, pending: null,
    });
    renderPage();
    expect(await screen.findByText("Not resumable here")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume/i })).not.toBeInTheDocument();
  });

  it("shows a result that did not reach the server as pending, with a retry", async () => {
    data.all = [attemptRow(1, { finished_at: null, completed: false, elapsed_seconds: null })];
    saveCheckpoint({
      version: 1, studentId: "s1", attemptId: "a1", contentKey: "k", scope: "all_read", stepIndex: 0, stepId: "p1-para1-read",
      recaps: [], sectionMs: 1, passageMs: 1, showElapsedTimer: true, savedAt: 1, pending: { completed: true, seconds: 754, savedAt: 2 },
    });
    renderPage();
    expect(await screen.findByText("Result not saved yet")).toBeInTheDocument();
    expect(screen.getByText(/12:34/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try saving the result again/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^resume/i })).not.toBeInTheDocument();
  });
});
