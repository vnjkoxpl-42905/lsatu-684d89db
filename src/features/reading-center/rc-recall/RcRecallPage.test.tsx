import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  index: [] as unknown[], attempts: { attempts: [] as unknown[], recaps: [] as unknown[] },
  loadPassages: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "s1" } }) }));
vi.mock("@/features/rc/lib/rcBank", () => ({
  loadAllIndexPassages: async () => data.index,
  loadPassages: (ids: number[]) => data.loadPassages(ids),
}));
vi.mock("./lib/attempts", async (orig) => ({
  ...(await orig<typeof import("./lib/attempts")>()),
  listAttempts: async () => data.attempts,
  createAttempt: vi.fn(),
  uploadRecording: vi.fn(),
}));
vi.mock("./lib/backup", () => ({ recoverRcRecallBackups: async () => ({ recovered: 0, failed: 0, empty: 0 }), discard: vi.fn() }));

import { createAttempt } from "./lib/attempts";
import RcRecallPage from "./RcRecallPage";

const idx = (setNumber: number) => ({
  passageId: 140040 + setNumber, preptest: 140, section: 4, setNumber, title: null, topic: null, format: null,
  frameworks: [], difficulty: null, questionCount: 0, explainedCount: 0, questionIds: [], firstWords: "Opening words",
});
const renderPage = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RcRecallPage /></QueryClientProvider>,
);

beforeEach(() => {
  data.index = [1, 2, 3, 4].map(idx);
  data.attempts = { attempts: [], recaps: [] };
  data.loadPassages.mockReset();
  vi.mocked(createAttempt).mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("RC Recall page", () => {
  it("lists the section even though its passages have no drillable questions", async () => {
    renderPage();
    expect(await screen.findByRole("option", { name: "PT140 · Section 4" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /start rc recall/i })).toBeEnabled());
  });

  it("shows the full instructions and the source-name mapping for the chosen mode", async () => {
    renderPage();
    expect(await screen.findByText(/source lesson calls Cumulative Recall/i)).toHaveTextContent(/Cappuccino/);
    expect(screen.getByText(/confirm your translation with all the text you have read/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Cumulative Recall/));
    expect(await screen.findByText(/recap the translations of paragraphs 1 \+ 2 back to back/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Only the current sub-passage/)).not.toBeInTheDocument();
  });

  it("hides every video player and Watch Instructions when no media base is set", async () => {
    renderPage();
    await screen.findByRole("option", { name: "PT140 · Section 4" });
    expect(document.querySelector("video")).toBeNull();
    expect(screen.queryByRole("button", { name: /watch instructions/i })).not.toBeInTheDocument();
  });

  it("shows the Cappuccino correction before the RC Recall examples, and no Watch Instructions until verified", async () => {
    vi.stubEnv("VITE_RC_RECALL_MEDIA_BASE", "http://127.0.0.1:8787");
    renderPage();
    const correction = await screen.findByText(/in the real drill, confirmations are silent/i);
    const videos = Array.from(document.querySelectorAll("video"));
    expect(videos.length).toBe(4);
    expect(screen.getAllByRole("link", { name: /download mp3 audio/i })).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: /read transcript/i })).toHaveLength(4);
    expect(correction.compareDocumentPosition(videos[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: /watch instructions/i })).not.toBeInTheDocument();
    expect(document.querySelector("track")?.getAttribute("label")).toMatch(/auto-generated/);
  });

  it("offers Watch Instructions only once verification is declared", async () => {
    vi.stubEnv("VITE_RC_RECALL_MEDIA_BASE", "http://127.0.0.1:8787");
    vi.stubEnv("VITE_RC_RECALL_INSTRUCTIONS_VERIFIED", "true");
    renderPage();
    expect(await screen.findByRole("button", { name: /watch instructions/i })).toBeInTheDocument();
  });

  it("starts nothing and saves nothing when the loaded section does not match", async () => {
    data.loadPassages.mockResolvedValue([]);
    renderPage();
    const startButton = await screen.findByRole("button", { name: /start rc recall/i });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be started.*nothing was saved/i);
    expect(createAttempt).not.toHaveBeenCalled();
  });

  it("lists prior attempts without overstating saved recordings", async () => {
    data.attempts = {
      attempts: [{ id: "a1", mode: "rc_recall", preptest: 140, section: 4, confirmation_scope: "all_read", started_at: "2026-10-01T10:00:00Z", finished_at: "2026-10-01T10:30:00Z", elapsed_seconds: 1800, completed: true }],
      recaps: [{ attempt_id: "a1", recording_state: "saved" }, { attempt_id: "a1", recording_state: "failed" }],
    };
    renderPage();
    await waitFor(() => expect(screen.getByText(/1 of 2 spoken recaps saved, 1 failed/)).toBeInTheDocument());
    expect(screen.getByText(/30:00/)).toBeInTheDocument();
  });
});
