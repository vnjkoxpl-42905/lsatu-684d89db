import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AcademyMainhub from "./AcademyMainhub";

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light" }),
}));

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

const todayState = vi.hoisted(() => ({ classroomIsError: false }));

vi.mock("@/hooks/useClassroomItems", () => ({
  useClassroomItems: () => ({
    data: [],
    isLoading: false,
    isError: todayState.classroomIsError,
  }),
}));

vi.mock("@/hooks/useAssignedTodoFeed", () => ({
  useAssignedTodoFeed: () => ({ rows: [], loading: false, failed: false, retry: vi.fn() }),
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

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{`${location.pathname}${location.search}`}</output>;
}

describe("AcademyMainhub", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders Smart Drill, the manual builder, practice, and assigned work", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/classroom/drill"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AcademyMainhub />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Smart Drill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Smart Drill" })).toBeInTheDocument();
    expect(
      screen.getByText("Let Smart Drill choose what would be most useful to practice next."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument();
    // The Spline robot was cut in the 2026-08-01 reskin: the hero is two columns
    // (greeting + finder console) over the horizon image, with no third bay.
    expect(screen.queryByText("Robot scene")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Build the drill you need." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set up an LR drill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open a question" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Advanced/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Practice and insight workspace" }),
    ).toBeInTheDocument();
    // One door to the builder: the hero console. The "Build a Set" tile and
    // the carousel's "Build targeted set" were two more doors to the same room.
    expect(screen.getByText("Your practice")).toBeInTheDocument();
    expect(screen.queryByText("Build a Set")).not.toBeInTheDocument();
    // Sitting a section is the Testing Centre's job. Two doors to the same
    // thing is what made this hub feel packed.
    expect(screen.queryByText("Full Section")).not.toBeInTheDocument();
    // Insights are a static list now, not a rotating carousel.
    expect(screen.getByRole("list", { name: "Insights" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Insight slides" })).not.toBeInTheDocument();
    // The Question finder's second mount. Without it, a student standing on the
    // page that exists for picking questions has to go back to Home to search.
    expect(screen.getAllByRole("button", { name: "Open a question" })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Assigned work" })).toBeInTheDocument();
    expect(await screen.findByText("Nothing assigned right now.")).toBeInTheDocument();
    expect(screen.queryByText("Orbital workspace")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Mainhub orbital workspace" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set up an LR drill" }));
    expect(screen.getByRole("region", { name: "Unified LR drill builder" })).toBeInTheDocument();
    // The hero leaves while a stage is open: the launcher carries its own
    // title and Cancel, and a 400px hero above it said "Set up an LR drill"
    // twice on one screen.
    expect(screen.queryByRole("heading", { name: "Build the drill you need." })).not.toBeInTheDocument();
  });

  it("does not render the old personalized dateline", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/classroom/drill"]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <AcademyMainhub />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(document.querySelector(".drill-observatory-date-long")).toBeNull();
    expect(document.querySelector(".drill-observatory-date-short")).toBeNull();
  });

  it("opens Smart Drill from the practice insight action", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/classroom/drill?section=lr"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AcademyMainhub />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Practice today" }));

    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent(
      "/drill?drill=smart-drill&returnTo=%2Fclassroom",
    );
  });

  it("opens the canonical Smart Drill URL from the hero action", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/classroom/drill?section=lr"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <AcademyMainhub />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Smart Drill" }));

    expect(screen.getByRole("status", { name: "Current route" })).toHaveTextContent(
      "/drill?drill=smart-drill&returnTo=%2Fclassroom",
    );
  });
});

describe("AcademyMainhub — Smart Drill explanation", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
  });

  function renderHub() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={["/classroom/drill"]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <AcademyMainhub />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("explains Smart Drill in plain language", async () => {
    renderHub();
    expect(
      await screen.findByText("Let Smart Drill choose what would be most useful to practice next."),
    ).toBeInTheDocument();
  });

  it("does not expose mechanical selection language", async () => {
    renderHub();
    expect(screen.queryByText(/question types you miss most often/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fresh/i)).not.toBeInTheDocument();
  });
});
