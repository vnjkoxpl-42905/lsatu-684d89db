import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcademyMainhub from "./AcademyMainhub";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "student-1", email: "student@example.com" },
    authReady: true,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
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
  QuestionPicker: () => <div role="region" aria-label="Unified LR drill builder" />,
}));

vi.mock("@/lib/questionLoader", () => ({
  questionBank: {
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
  RcHubSurface: ({ onCancel }: { onCancel?: () => void }) => (
    <div role="region" aria-label="RC drill builder">
      <button type="button" onClick={onCancel}>
        Cancel RC
      </button>
    </div>
  ),
}));

vi.mock("@/features/rc/components/RcSessionHistory", () => ({
  RcSessionHistory: () => <div>No reading drills yet.</div>,
}));

/** Shows the live query string so a test can assert what the switch wrote. */
function UrlProbe() {
  const { search } = useLocation();
  return <div data-testid="url">{search}</div>;
}

/** Drives the router's own history — MemoryRouter does not use window.history. */
function BackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      go back
    </button>
  );
}

function renderHub(entry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[entry]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <AcademyMainhub />
        <UrlProbe />
        <BackButton />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const url = () => new URLSearchParams(screen.getByTestId("url").textContent ?? "");
const lrSwitch = () => screen.getByRole("button", { name: "Logical Reasoning" });
const rcSwitch = () => screen.getByRole("button", { name: "Reading Comprehension" });

describe("AcademyMainhub — the LR/RC section switch", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
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
    expect(screen.getByRole("button", { name: "Smart Drill" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Build the reading set you need." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up an RC drill" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
    expect(rcSwitch()).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the console as the one door to the RC builder, and does not offer a section to sit", () => {
    renderHub("/classroom/drill?section=rc");
    expect(screen.getByRole("button", { name: "Set up an RC drill" })).toBeInTheDocument();
    expect(screen.queryByText("Build a Set")).not.toBeInTheDocument();
    // Sitting a real section lives in the Testing Centre, in RC as in LR.
    expect(screen.queryByText("Full Section")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Search passages/ })).not.toBeInTheDocument();
    // The bay is shared, but the panel under the tools is not: the carousel is
    // built from LR attempts, so RC shows its own drill history instead.
    expect(screen.getByText("Your reading drills")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Insights" })).not.toBeInTheDocument();
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
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
    fireEvent.click(lrSwitch());
    expect(url().get("section")).toBe("lr");
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("remembers the last section for the next silent visit, and a link still wins", () => {
    const first = renderHub("/classroom/drill");
    fireEvent.click(rcSwitch());
    first.unmount();

    renderHub("/classroom/drill");
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("lets an explicit ?section=lr outrank the remembered RC", () => {
    const first = renderHub("/classroom/drill");
    fireEvent.click(rcSwitch());
    first.unmount();

    renderHub("/classroom/drill?section=lr");
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("drops the launcher stage on the way across — an LR stage has no RC twin", () => {
    renderHub("/classroom/drill?stage=type-drill");
    expect(screen.getByRole("region", { name: "Unified LR drill builder" })).toBeInTheDocument();
    fireEvent.click(rcSwitch());
    expect(url().get("stage")).toBeNull();
    expect(screen.queryByRole("region", { name: "Unified LR drill builder" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("switches silently — a half-built LR set is discarded with no prompt", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHub("/classroom/drill?stage=type-drill");
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
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "go back" }));
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });

  it("keeps Assigned work mounted across the toggle because assignments span sections", () => {
    renderHub("/classroom/drill");
    const before = screen.getByRole("region", { name: "Assigned work" });
    fireEvent.click(rcSwitch());
    expect(screen.getByRole("region", { name: "Assigned work" })).toBe(before);
  });

  it("switches LR and RC in place without remounting or animating the surfaces", () => {
    renderHub("/classroom/drill?section=lr");
    const hero = screen.getByText("Build the drill you need.").closest(".drill-observatory-hero");
    const practiceBay = screen.getByRole("region", { name: "Practice and insight workspace" });

    expect(hero).not.toHaveClass("drill-observatory-section-flip-face");
    expect(practiceBay).not.toHaveClass("drill-observatory-section-flip-face");

    fireEvent.click(rcSwitch());

    expect(screen.getByText("Build the reading set you need.").closest(".drill-observatory-hero")).toBe(hero);
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBe(practiceBay);
  });

  it("opens the RC builder from the console, and Cancel returns to the RC section", () => {
    renderHub("/classroom/drill?section=rc");
    fireEvent.click(screen.getByRole("button", { name: "Set up an RC drill" }));
    expect(screen.getByRole("region", { name: "RC drill builder" })).toBeInTheDocument();
    expect(url().get("stage")).toBe("type-drill");

    fireEvent.click(screen.getByRole("button", { name: "Cancel RC" }));
    expect(url().get("stage")).toBeNull();
    expect(url().get("section")).toBe("rc");
  });

  it("RC Smart Drill asks the builder for one untimed passage and starts it", () => {
    renderHub("/classroom/drill?section=rc");
    fireEvent.click(screen.getByRole("button", { name: "Smart Drill" }));
    const q = url();
    expect(q.get("section")).toBe("rc");
    expect(q.get("stage")).toBe("type-drill");
    expect(q.get("count")).toBe("1");
    expect(q.get("timing")).toBe("untimed");
    expect(q.get("reveal")).toBe("per_passage");
    expect(q.get("start")).toBe("1");
  });

  it("moves between the two options on the arrow keys", () => {
    renderHub("/classroom/drill");
    fireEvent.keyDown(lrSwitch(), { key: "ArrowRight" });
    expect(url().get("section")).toBe("rc");
    fireEvent.keyDown(rcSwitch(), { key: "ArrowLeft" });
    expect(url().get("section")).toBe("lr");
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
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
  });
});

describe("AcademyMainhub — Escape leaves a stage", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
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
    expect(screen.getByRole("region", { name: "Practice and insight workspace" })).toBeInTheDocument();
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
