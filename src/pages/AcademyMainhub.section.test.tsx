import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RcDrillSession } from "@/features/rc/lib/rcTypes";
import AcademyMainhub from "./AcademyMainhub";

const finderActor = vi.hoisted(() => ({id: "student-1"}));
const finderLrQuestion = vi.hoisted(() => ({qid: "PT151-S2-Q8", pt: 151, section: 2, qnum: 8, qtype: "main_conclusion", difficulty: 3, stimulus: "Sample stimulus", questionStem: "Sample question stem", answerChoices: {A: "Alpha", B: "Beta", C: "Gamma", D: "Delta", E: "Epsilon"}, correctAnswer: "A"}));
const finderPermissions = vi.hoisted(() => ({ loading: false, has_drill_access: true }));

vi.mock("@/features/rc/lib/rcBank", () => ({ loadAllIndexPassages: vi.fn(async () => []) }));
vi.mock("@/lib/drillRunLedger", () => ({ listStandaloneDrillRuns: vi.fn(async () => []) }));
vi.mock("@/lib/drillResumeSession", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/drillResumeSession")>(), loadDrillResumeSession: vi.fn(async () => null) }));
vi.mock("@/features/rc/api/rcProgress", () => ({
  listSessions: vi.fn(async () => []), getSessionAttempts: vi.fn(async () => []), abandonSession: vi.fn(async () => undefined),
}));
vi.mock("@/lib/standaloneDrillHistory", async () => ({ ...await vi.importActual<typeof import('@/lib/standaloneDrillHistory')>('@/lib/standaloneDrillHistory'), buildStandaloneDrillHistory: () => [
  { key: "rc:active", section: "rc", title: "RC active sitting", detail: "2 answers saved", date: "2026-10-15", status: "in_progress", continueTo: "/rc/drill?sessionId=active", discardId: "active", rcTiming: 'timed', rcTake: 'repeat' },
  { key: "rc:done", section: "rc", title: "RC finished sitting", detail: "7 answers saved", date: "2026-10-14", status: "completed", resultsTo: "/rc/results/done", reviewTo: "/rc/drill?sessionId=done&review=1" },
  { key: "lr:active", section: "lr", title: "LR active sitting", detail: "1 answer saved", date: "2026-10-15", status: "in_progress", continueTo: "/drill?run=active" },
] }));

vi.mock("@/components/questionfinder/useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => ({ lr: [finderLrQuestion], rcPassages: [], rcQuestions: [], loading: false, error: null, lrFailed: false, rcFailed: false }),
}));
vi.mock("@/components/questionfinder/useFinderAddressIndex", () => ({
  useFinderAddressIndex: () => ({ tests: [{ pt: 140, sections: [{ section: 4, lr: [], rc: [{ id: 16, position: 3, title: "Origins", questions: [{ id: 1604, number: 17 }] }] }] }], loading: false, failed: false, retry: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: finderActor.id, email: "student@example.com" },
    authReady: true,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(async () => undefined),
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: finderActor.id } }, error: null })) },
    rpc: vi.fn(async () => ({ data: [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { display_name: "Joshua" } })),
    })),
  },
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({
    loading: false,
    is_admin: false,
    has_classroom_access: true,
    has_bootcamp_access: true,
    has_chat_access: true,
    has_practice_access: true,
    ...finderPermissions,
    has_activity_access: true,
    has_schedule_access: true,
    has_analytics_access: true,
    has_waj_access: true,
  }),
}));

vi.mock("@/hooks/useLayoutPrefs", () => ({
  useLayoutPrefs: () => ({
    prefs: {
      sidebar: ["/classroom", "/bootcamps", "/inbox", "/activities", "/schedule"],
    },
  }),
}));

vi.mock("@/hooks/useClassroomItems", () => ({
  useClassroomItems: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useLastActivity", () => ({
  useLastActivity: () => ({ data: null }),
}));

vi.mock("@/contexts/OrbitalActiveContext", () => ({
  useOrbitalActive: () => ({ setActive: vi.fn() }),
}));

vi.mock("@/contexts/QuestionBankContext", () => ({
  useQuestionBank: () => ({ manifest: {}, isLoading: false, error: null }),
}));

vi.mock("@/components/drill/QuestionPicker", () => ({
  QuestionPicker: ({ onCancel }: { onCancel: () => void }) => <div role="region" aria-label="Unified LR drill builder"><button onClick={onCancel}>Back to practice options</button></div>,
}));

vi.mock("@/lib/questionLoader", () => ({
  questionBank: {
    getQuestion: (qid: string) => qid === finderLrQuestion.qid ? finderLrQuestion : undefined,
    getAllQuestions: () => [
      {
        qid: "PT151-S2-Q8",
        pt: 151,
        section: 2,
        qnum: 8,
        qtype: "main_conclusion",
        difficulty: 3,
        stimulus: "Sample stimulus",
        questionStem: "Sample question stem",
      },
    ],
  },
}));

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({ conversations: [], loading: false, unreadCount: 0, refresh: vi.fn() }),
  useConversationMessages: () => ({ messages: [], loading: false, refresh: vi.fn() }),
}));

vi.mock("@/hooks/useInstructorMessages", () => ({
  useInstructorMessages: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    refresh: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

vi.mock("@/hooks/useStudentAssignments", () => ({
  useStudentAssignments: () => ({ assignments: [], loading: false, error: null, refresh: vi.fn() }),
  useStudentTAAssignments: () => ({ assignments: [], loading: false, error: null, refresh: vi.fn() }),
}));

vi.mock("@/lib/guidedDrills", () => ({
  listAssignmentsForStudent: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/lib/joshuaThread", () => ({
  startJoshuaConversation: vi.fn(),
}));


vi.mock("@/components/mainhub/MainhubDock", () => ({
  default: () => <div>Mainhub dock</div>,
}));

vi.mock("@/components/mainhub/MainhubAccountButton", () => ({
  default: ({ displayName }: { displayName?: string | null }) => (
    <div>Account menu {displayName ?? "loading"}</div>
  ),
}));

vi.mock("@/components/ui/radial-orbital-timeline", () => ({
  default: () => <div>Orbital workspace</div>,
}));

vi.mock("@/components/ui/splite", () => ({
  SplineScene: () => <div aria-hidden="true">Robot scene</div>,
}));


// RC's two data-backed pieces are stubbed: this file is about the section
// switch, and both of them talk to Supabase or fetch the passage index.
vi.mock("@/features/rc/components/RcHubSurface", () => ({
  RcHubSurface: ({ openPickerOnEntry }: { openPickerOnEntry?: boolean }) => <div role="region" aria-label="RC drill builder" data-picker-entry={String(Boolean(openPickerOnEntry))}><button type="button">Reset filters</button></div>,
}));

vi.mock("@/features/rc/components/RcSavedSetsPanel", () => ({
  RcSavedSetsPanel: () => <div role="region" aria-label="Saved RC sets and recipes">Saved RC work</div>,
}));

vi.mock("@/features/rc/components/RcSessionHistory", () => ({
  RcSessionHistory: () => <div>No reading drills yet.</div>,
}));

/** Shows the live query string so a test can assert what the switch wrote. */
function UrlProbe() {
  const { pathname, search } = useLocation();
  return <><div data-testid="url">{search}</div><div data-testid="pathname">{pathname}</div></>;
}

/** Drives the router's own history — MemoryRouter does not use window.history. */
function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <><button onClick={() => navigate(`${location.pathname}${location.search}`, {replace: true})}>refresh route</button><button type="button" onClick={() => navigate(-1)}>
      go back
    </button></>
  );
}

function renderHub(entry: string, previous?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={previous ? [previous, entry] : [entry]}
        initialIndex={previous ? 1 : 0}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <AcademyMainhub />
        <UrlProbe />
        <BackButton />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const rcSitting = (id: string, patch: Partial<RcDrillSession> = {}): RcDrillSession => ({
  id, userId: 'student-1', startedAt: '2026-10-20T10:00:00Z', status: 'in_progress', passageIds: [1188],
  config: { source: 'manual', reveal: 'per_passage', timing: { mode: 'unlimited' } }, ...patch,
} as RcDrillSession);

const url = () => new URLSearchParams(screen.getByTestId("url").textContent ?? "");
const lrSwitch = () => screen.getByRole("button", { name: "Logical Reasoning" });
const rcSwitch = () => screen.getByRole("button", { name: "Reading Comprehension" });

describe("AcademyMainhub — the LR/RC section switch", () => {
  beforeEach(async () => {
    const progress = await import('@/features/rc/api/rcProgress');
    vi.mocked(progress.listSessions).mockReset().mockResolvedValue([]);
    vi.mocked(progress.getSessionAttempts).mockReset().mockResolvedValue([]);
    const ledger = await import('@/lib/drillRunLedger');
    vi.mocked(ledger.listStandaloneDrillRuns).mockReset().mockResolvedValue([]);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
    finderActor.id = "student-1";
    finderPermissions.loading = false;
    finderPermissions.has_drill_access = true;
  });

  it("returns a question preview to its Practice route instead of the scored drill destination", () => {
    renderHub("/practice/drills?section=rc");
    fireEvent.click(screen.getByRole("button", { name: "Find a question" }));
    const dialog = screen.getByRole("dialog", { name: "Find a question" });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "PT140 S4 Q17" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open preview" }));
    expect(url().get("returnTo")).toBe("/practice/drills?section=rc");
    expect(url().get("q")).toBe("1604");
  });

  it("retains the sidebar origin after removing the finder launch parameters", () => {
    renderHub("/practice/drills?section=rc&finder=open&finderReturnTo=%2Fprogress%2Fhistory%3Fview%3Dcompleted");
    const dialog = screen.getByRole("dialog", { name: "Find a question" });
    expect(url().get("finder")).toBeNull();
    expect(url().get("finderReturnTo")).toBeNull();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "PT140 S4 Q17" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open preview" }));
    expect(url().get("returnTo")).toBe("/progress/history?view=completed");
  });

  it("opens on LR when nothing says otherwise", () => {
    renderHub("/classroom/drill");
    expect(screen.getByRole("button", { name: "Smart Drill" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
    expect(lrSwitch()).toHaveAttribute("aria-pressed", "true");
    expect(rcSwitch()).toHaveAttribute("aria-pressed", "false");
  });

  it("opens on RC when the link says so", () => {
    renderHub("/classroom/drill?section=rc");
    expect(screen.queryByText("DRILL / READING COMPREHENSION")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Smart Drill" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create RC drill" })).not.toBeInTheDocument();
    expect(rcSwitch()).toHaveAttribute("aria-pressed", "true");
  });

  it("opens RC choices and actual practice history at the Create URL", () => {
    renderHub("/practice/drills?section=rc&view=create");
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
    expect(screen.queryByText("Build a Set")).not.toBeInTheDocument();
    // Sitting a real section lives in the Testing Centre, in RC as in LR.
    expect(screen.queryByText("Full Section")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Search passages/ })).not.toBeInTheDocument();
    // The bay is shared, but the panel under the tools is not: the carousel is
    // built from LR attempts, so RC shows its own drill history instead.
    expect(screen.queryByText("Your reading drills")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View completed RC drills" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Insights" })).not.toBeInTheDocument();
  });

  it.each([['Build a drill', 'automatic'], ['Pick specific passages', 'manual']])('opens the explicit RC builder from %s', (label, mode) => {
    renderHub('/practice/drills?section=rc&view=create');
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(url().get('builder')).toBe(mode);
    expect(screen.getByRole('region', { name: 'RC drill builder' })).toHaveAttribute('data-picker-entry', String(mode === 'manual'));
    expect(screen.getByRole('region', { name: 'RC drill builder' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to RC practice' }));
    expect(url().get('builder')).toBeNull();
    expect(screen.getByRole('region', { name: 'Create an RC drill' })).toBeInTheDocument();
  });

  it.each(['stage=type-drill', 'saved=exact-set', 'passages=1188', 'count=3&timing=standard', 'assignmentId=homework'])('preserves direct RC setup links: %s', query => {
    renderHub(`/practice/drills?section=rc&view=create&${query}`);
    expect(screen.getByRole('region', { name: 'RC drill builder' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Create an RC drill' })).not.toBeInTheDocument();
  });

  it('does not carry the RC builder mode into LR', () => {
    renderHub('/practice/drills?section=rc&view=create&builder=manual');
    fireEvent.click(lrSwitch());
    expect(url().get('builder')).toBeNull();
    expect(url().get('section')).toBe('lr');
  });

  it('shows an identifiable RC resume action and keeps history accessible', async () => {
    const progress = await import('@/features/rc/api/rcProgress');
    vi.mocked(progress.listSessions).mockResolvedValue([rcSitting('active')]);
    renderHub('/practice/drills?section=rc&view=create');
    expect(await screen.findByText('RC active sitting')).toBeInTheDocument();
    expect(screen.getByText('2 answers saved')).toBeInTheDocument();
    expect(screen.queryByText('LR active sitting')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View completed RC drills' }));
    expect(url().get('view')).toBe('completed');
  });

  it('returns through RC landing to the original LR page after closing setup', () => {
    renderHub('/practice/drills?section=lr');
    fireEvent.click(rcSwitch());
    fireEvent.click(screen.getByRole('button', { name: 'Pick specific passages' }));
    expect(url().get('builder')).toBe('manual');
    fireEvent.click(screen.getByRole('button', { name: 'Back to RC practice' }));
    expect(screen.getByRole('region', { name: 'Create an RC drill' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'go back' }));
    expect(url().get('section')).toBe('lr');
    expect(screen.getByRole('button', { name: 'Smart Drill' })).toBeInTheDocument();
  });

  it('returns a direct setup deep link to RC practice without relying on prior history', () => {
    renderHub('/practice/drills?section=rc&passages=1188&timing=standard');
    fireEvent.click(screen.getByRole('button', { name: 'Back to RC practice' }));
    expect(url().get('passages')).toBeNull();
    expect(url().get('timing')).toBeNull();
    expect(screen.getByRole('region', { name: 'Create an RC drill' })).toBeInTheDocument();
  });

  it('loads only the newest eligible RC resume independently of LR history failures', async () => {
    const progress = await import('@/features/rc/api/rcProgress');
    const ledger = await import('@/lib/drillRunLedger');
    vi.mocked(ledger.listStandaloneDrillRuns).mockRejectedValue(new Error('LR unavailable'));
    vi.mocked(progress.listSessions).mockResolvedValue([
      rcSitting('older', { startedAt: '2026-10-19T10:00:00Z' }), rcSitting('newest'),
      rcSitting('other-owner', { userId: 'other' }),
      rcSitting('assignment', { config: { source: 'assignment', reveal: 'end_of_set', timing: { mode: 'unlimited' } } }),
      rcSitting('protected', { config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, timedSectionSittingId: 'protected-parent' } }),
      rcSitting('completed', { status: 'completed' }),
    ]);
    renderHub('/practice/drills?section=rc&view=create');
    expect(await screen.findByRole('button', { name: 'Resume RC drill: RC active sitting' })).toBeInTheDocument();
    expect(ledger.listStandaloneDrillRuns).not.toHaveBeenCalled();
    expect(progress.getSessionAttempts).toHaveBeenCalledTimes(1);
    expect(progress.getSessionAttempts).toHaveBeenCalledWith('newest');
  });

  it("treats an unrecognised section as LR rather than as an error", () => {
    renderHub("/classroom/drill?section=sideways");
    expect(screen.queryByText("DRILL / LOGICAL REASONING")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Smart Drill" })).toBeInTheDocument();
  });

  it("writes the section to the URL when the switch is thrown", () => {
    renderHub("/classroom/drill");
    fireEvent.click(rcSwitch());
    expect(url().get("section")).toBe("rc");
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
    fireEvent.click(lrSwitch());
    expect(url().get("section")).toBe("lr");
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("remembers the last section for the next silent visit, and a link still wins", () => {
    const first = renderHub("/classroom/drill");
    fireEvent.click(rcSwitch());
    first.unmount();

    renderHub("/classroom/drill");
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
  });

  it("lets an explicit ?section=lr outrank the remembered RC", () => {
    const first = renderHub("/classroom/drill");
    fireEvent.click(rcSwitch());
    first.unmount();

    renderHub("/classroom/drill?section=lr");
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("returns to the hub before switching from an LR builder to RC", () => {
    renderHub("/classroom/drill?stage=type-drill");
    expect(screen.getByRole("region", { name: "Unified LR drill builder" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reading Comprehension" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to practice options" }));
    fireEvent.click(rcSwitch());
    expect(url().get("stage")).toBeNull();
    expect(screen.queryByRole("region", { name: "Unified LR drill builder" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
  });

  it("leaves the builder and switches sections without a confirmation prompt", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHub("/classroom/drill?stage=type-drill");
    fireEvent.click(screen.getByRole("button", { name: "Back to practice options" }));
    fireEvent.click(rcSwitch());
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("Back after a toggle returns to the section you came from", () => {
    // The bare entry resolves from memory. If it is left bare, memory has
    // MOVED by the time Back returns to it, so Back re-resolves to the section
    // the student just switched TO and the switch looks stuck.
    renderHub("/classroom/drill");
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();

    fireEvent.click(rcSwitch());
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "go back" }));
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("shows RC-scoped assigned work alongside RC practice", () => {
    renderHub("/classroom/drill");
    fireEvent.click(rcSwitch());
    expect(screen.getByRole("region", { name: "Assigned RC work" })).toBeInTheDocument();
  });

  it("switches LR and RC in place without remounting or animating the surfaces", () => {
    renderHub("/classroom/drill?section=lr");
    const hero = screen.getByText("Build the drill you need.").closest(".drill-observatory-hero");
    const practiceBay = screen.getByRole("region", { name: "Practice and insight workspace" });

    expect(hero).not.toHaveClass("drill-observatory-section-flip-face");
    expect(practiceBay).not.toHaveClass("drill-observatory-section-flip-face");

    fireEvent.click(rcSwitch());

    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
  });

  it("keeps legacy builder links working, shows Reset filters on Create, and keeps In progress reachable through its tab", async () => {
    renderHub("/classroom/drill?section=rc&stage=type-drill&passages=10%2C11&timing=untimed");
    expect(screen.getByRole("region", { name: "RC drill builder" })).toBeInTheDocument();
    expect(url().get("stage")).toBeNull();
    expect(url().get("view")).toBe("create");
    expect(url().get("passages")).toBe("10,11");
    expect(url().get("timing")).toBe("untimed");
    expect(screen.queryByRole("region", { name: "Assigned work" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel RC" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "In progress" }));
    expect(url().get("stage")).toBeNull();
    expect(url().get("section")).toBe("rc");
    expect(url().get("view")).toBe("in-progress");
    expect(await screen.findByRole("region", { name: "Drills in progress" })).toBeInTheDocument();
  });

  it("keeps unrelated assigned work outside the LR builder", () => {
    renderHub("/classroom/drill?section=lr&stage=type-drill");
    expect(screen.getByRole("region", { name: "Unified LR drill builder" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Assigned work" })).not.toBeInTheDocument();
  });

  it("RC creation opens the builder without automatically starting a drill", () => {
    renderHub("/classroom/drill?section=rc");
    const q = url();
    expect(q.get("section")).toBe("rc");
    expect(q.get("stage")).toBeNull();
    expect(q.get("start")).toBeNull();
  });

  it("moves between the two options on the arrow keys", () => {
    renderHub("/classroom/drill");
    fireEvent.keyDown(lrSwitch(), { key: "ArrowRight" });
    expect(url().get("section")).toBe("rc");
    fireEvent.keyDown(rcSwitch(), { key: "ArrowLeft" });
    expect(url().get("section")).toBe("lr");
  });

  it("discards an RC drill in progress only after a confirmation, and keeps LR cards without the button", async () => {
    const progress = await import("@/features/rc/api/rcProgress");
    vi.mocked(progress.abandonSession).mockClear();
    renderHub("/practice/drills?section=rc&view=in-progress");
    await screen.findByText("RC active sitting");
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(progress.abandonSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm discard" }));
    await vi.waitFor(() => expect(progress.abandonSession).toHaveBeenCalledWith("active"));
    expect(progress.abandonSession).toHaveBeenCalledTimes(1);
    fireEvent.click(lrSwitch());
    await screen.findByText("LR active sitting");
    expect(screen.queryByRole("button", { name: "Discard" })).not.toBeInTheDocument();
  });

  it('filters RC history by configured timing and recorded exposure without exposing scores', async () => {
    renderHub('/practice/drills?section=rc&view=in-progress');
    await screen.findByText('RC active sitting');
    expect(screen.getByText('Timed · Repeated passages')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter RC history by timing' }), { target: { value: 'untimed' } });
    expect(screen.queryByText('RC active sitting')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter RC history by timing' }), { target: { value: 'timed' } });
    expect(screen.getByText('RC active sitting')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter RC history by exposure' }), { target: { value: 'unknown' } });
    expect(screen.queryByText('RC active sitting')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter RC history by exposure' }), { target: { value: 'repeat' } });
    expect(screen.getByText('RC active sitting')).toBeInTheDocument();
    expect(screen.queryByText(/% correct/)).not.toBeInTheDocument();
  });

  it("isolates RC history by status and keeps that view when switching to LR", async () => {
    renderHub("/practice/drills?section=rc&view=in-progress");
    expect(await screen.findByText("RC active sitting")).toBeInTheDocument();
    expect(screen.queryByText("LR active sitting")).not.toBeInTheDocument();
    expect(screen.queryByText("RC finished sitting")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "RC drill builder" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    expect(await screen.findByText("RC finished sitting")).toBeInTheDocument();
    expect(screen.queryByText("RC active sitting")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "In progress" }));
    fireEvent.click(lrSwitch());
    expect(url().get("view")).toBe("in-progress");
    expect(await screen.findByText("LR active sitting")).toBeInTheDocument();
    expect(screen.queryByText("RC active sitting")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "go back" }));
    expect(url().get("section")).toBe("rc");
    expect(await screen.findByText("RC active sitting")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
    expect(screen.queryByText("RC active sitting")).not.toBeInTheDocument();
  });

  it("keeps saved RC passages and settings accessible in RC navigation", () => {
    renderHub("/practice/drills?section=rc&view=saved");
    expect(screen.getByRole("heading", { name: "Saved RC drills" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Saved RC sets and recipes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open saved LR sets" })).not.toBeInTheDocument();
  });

  it("keeps the existing saved LR destination", () => {
    renderHub("/practice/drills?section=lr&view=saved");
    expect(screen.getByRole("heading", { name: "Saved LR sets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open saved LR sets" })).toBeInTheDocument();
  });

  it("keeps section choice in the LR/RC switch instead of repeating it as a practice tile", () => {
    renderHub("/classroom/drill");
    expect(
      screen.queryByRole("button", {
        name: "Reading Comprehension Drill full passages the way they appear on the test.",
      }),
    ).toBeNull();

    fireEvent.click(rcSwitch());
    expect(url().get("section")).toBe("rc");
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
  });
});

describe("AcademyMainhub — Escape leaves a stage", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
    finderActor.id = "student-1";
    finderPermissions.loading = false;
    finderPermissions.has_drill_access = true;
  });

  it("closes an open stage and returns the hub", () => {
    renderHub("/classroom/drill?stage=type-drill");
    expect(screen.getByRole("region", { name: "Unified LR drill builder" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(url().get("stage")).toBeNull();
    expect(screen.queryByRole("region", { name: "Unified LR drill builder" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("does nothing on the plain hub, where there is no room to leave", () => {
    renderHub("/classroom/drill?section=rc");
    fireEvent.keyDown(window, { key: "Escape" });

    expect(url().get("stage")).toBeNull();
    expect(url().get("section")).toBe("rc");
    expect(screen.getByRole("region", { name: "Create an RC drill" })).toBeInTheDocument();
  });

  it("leaves the stage alone while something modal is open", () => {
    // A dialog closes itself on Escape. Closing the stage underneath it would
    // take two rooms away for one keypress.
    renderHub("/classroom/drill?stage=type-drill");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(url().get("stage")).toBe("type-drill");
    expect(screen.getByRole("region", { name: "Unified LR drill builder" })).toBeInTheDocument();
    dialog.remove();
  });
});


describe("Question finder URL ownership", () => {
  beforeEach(() => {
    localStorage.clear();
    finderActor.id = "student-1";
    finderPermissions.loading = false;
    finderPermissions.has_drill_access = true;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  const launch = (query = "section=rc", origin = "/my-work?tab=assigned") =>
    `/practice/drills?${query}&finder=open&finderReturnTo=${encodeURIComponent(origin)}`;
  const openRc = () => {
    const dialog = screen.getByRole("dialog", {name: "Find a question"});
    fireEvent.change(within(dialog).getByRole("textbox"), {target: {value: "PT140 S4 Q17"}});
    fireEvent.click(within(dialog).getByRole("button", {name: "Open preview"}));
  };
  it.each(["view=create", "view=in-progress", "view=completed", "view=saved", "stage=analytics", "stage=launcher"])("opens exactly one finder across %s", state => {
    renderHub(launch(`section=rc&${state}`));
    expect(screen.getAllByRole("dialog", {name: "Find a question"})).toHaveLength(1);
    expect(url().get("finder")).toBeNull();
    expect(url().get("finderReturnTo")).toBeNull();
  });
  it.each([["lr", "rc", "LR"], ["rc", "lr", "RC"], ["invalid", "rc", "LR"]])("seeds explicit %s against remembered %s", (stated, remembered, expected) => {
    localStorage.setItem("lsatu.drill.section", remembered);
    renderHub(launch(`section=${stated}`));
    const dialog = screen.getByRole("dialog", {name: "Find a question"});
    expect(within(dialog).getByRole("button", {name: expected})).toHaveAttribute("aria-pressed", "true");
  });
  it("falls back to the remembered bank when no section is stated", () => {
    localStorage.setItem("lsatu.drill.section", "rc");
    renderHub(launch("view=saved"));
    const dialog = screen.getByRole("dialog", {name: "Find a question"});
    expect(within(dialog).getByRole("button", {name: "RC"})).toHaveAttribute("aria-pressed", "true");
  });
  it("cancels to the retained origin with replace and strips recursive launch parameters", () => {
    renderHub(launch("section=rc", "/my-work?tab=assigned&finder=open&finderReturnTo=%2Fclassroom"), "/classroom");
    fireEvent.click(screen.getByRole("button", {name: "Close the question finder"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/my-work");
    expect(url().get("finder")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "go back"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/classroom");
  });
  it("replaces the temporary Practice stop when opening RC preview", () => {
    renderHub(launch(), "/my-work?tab=assigned");
    openRc();
    expect(screen.getByTestId("pathname")).toHaveTextContent("/rc/preview");
    expect(url().get("returnTo")).toBe("/my-work?tab=assigned");
    fireEvent.click(screen.getByRole("button", {name: "go back"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/my-work");
    expect(url().get("finder")).toBeNull();
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
  });
  it("pushes RC preview from a direct Practice trigger so browser Back returns to Practice", () => {
    renderHub("/practice/drills?section=rc", "/classroom");
    fireEvent.click(screen.getByRole("button", {name: "Find a question"}));
    openRc();
    fireEvent.click(screen.getByRole("button", {name: "go back"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/practice/drills");
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
  });
  it("returns a URL-launched LR preview to its origin by replacing the temporary entry", () => {
    renderHub(launch("section=lr"), "/classroom");
    const dialog = screen.getByRole("dialog", {name: "Find a question"});
    fireEvent.change(within(dialog).getByRole("textbox"), {target: {value: "PT151 S2 Q8"}});
    fireEvent.click(within(dialog).getByRole("button", {name: "Open preview"}));
    expect(screen.getByText("Read-only preview. This does not start or score a drill.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "Back"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/my-work");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "go back"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/classroom");
  });
  it("keeps one open dialog across repeated route effects, then closes it on actor change", () => {
    renderHub(launch("section=rc"));
    fireEvent.click(screen.getByRole("button", {name: "refresh route"}));
    expect(screen.getAllByRole("dialog", {name: "Find a question"})).toHaveLength(1);
    finderActor.id = "student-2";
    fireEvent.click(screen.getByRole("button", {name: "refresh route"}));
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
    expect(url().get("finder")).toBeNull();
  });
  it("forgets a revoked URL origin before a newly granted direct launch", () => {
    renderHub(launch("section=rc"));
    finderPermissions.has_drill_access = false;
    fireEvent.click(screen.getByRole("button", {name: "refresh route"}));
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
    finderPermissions.has_drill_access = true;
    fireEvent.click(screen.getByRole("button", {name: "refresh route"}));
    fireEvent.click(screen.getByRole("button", {name: "Find a question"}));
    fireEvent.click(screen.getByRole("button", {name: "Close the question finder"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/practice/drills");
  });
  it("keeps a launcher controller mounted with its visible trigger hidden", () => {
    renderHub("/practice/drills?section=lr&stage=type-drill");
    expect(screen.queryByRole("button", {name: "Find a question"})).not.toBeInTheDocument();
    fireEvent.keyDown(window, {key: "k", ctrlKey: true});
    expect(screen.getByRole("dialog", {name: "Find a question"})).toBeInTheDocument();
  });
  it("preserves the RC builder shortcut layout wrapper", () => {
    renderHub("/practice/drills?section=rc&builder=manual");
    expect(screen.getByRole("button", {name: "Find a question"}).closest(".drill-observatory-tools")).toHaveClass("rc-builder-question-shortcut");
  });
  it("waits for permissions without consuming the launch", () => {
    finderPermissions.loading = true;
    renderHub(launch());
    expect(url().get("finder")).toBe("open");
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
  });
  it("explains a denied URL launch without consuming or opening it", () => {
    finderPermissions.has_drill_access = false;
    renderHub(launch());
    expect(url().get("finder")).toBe("open");
    expect(screen.getByRole("alert")).toHaveTextContent("requires access to Drills");
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
    fireEvent.keyDown(window, {key: "k", ctrlKey: true});
    expect(screen.queryByRole("dialog", {name: "Find a question"})).not.toBeInTheDocument();
  });
  it("falls back to cleaned Practice when the origin is external", () => {
    renderHub(launch("section=rc", "https://example.com"));
    fireEvent.click(screen.getByRole("button", {name: "Close the question finder"}));
    expect(screen.getByTestId("pathname")).toHaveTextContent("/practice/drills");
    expect(url().get("finder")).toBeNull();
  });
});
