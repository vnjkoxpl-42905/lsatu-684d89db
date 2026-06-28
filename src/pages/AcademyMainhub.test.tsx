import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
      sidebar: ["/classroom", "/bootcamps", "/inbox", "/practice", "/activities", "/schedule"],
    },
  }),
}));

vi.mock("@/hooks/useClassroomItems", () => ({
  useClassroomItems: () => ({ data: [] }),
}));

vi.mock("@/hooks/useLastActivity", () => ({
  useLastActivity: () => ({ data: null }),
}));

vi.mock("@/contexts/OrbitalActiveContext", () => ({
  useOrbitalActive: () => ({ setActive: vi.fn() }),
}));

vi.mock("@/hooks/useInbox", () => ({
  useConversationMessages: () => ({ messages: [], loading: false, refresh: vi.fn() }),
}));

vi.mock("@/lib/joshuaThread", () => ({
  startJoshuaConversation: vi.fn(),
}));

vi.mock("@/components/mainhub/GuidedTour", () => ({
  hasSeenTour: () => true,
  startTour: vi.fn(),
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

describe("AcademyMainhub", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders the robot hero, existing orbital ring, and limited practice actions", () => {
    render(
      <MemoryRouter initialEntries={["/mainhub"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AcademyMainhub />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "LR Smart Drill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Smart Drill" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mainhub orbital workspace" })).toBeInTheDocument();
    expect(screen.getByText("Orbital workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Full Section/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Build a Set/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Orbit" })).not.toBeInTheDocument();
    expect(screen.queryByText("Existing ring")).not.toBeInTheDocument();
    expect(screen.queryByText("Smart Builder")).not.toBeInTheDocument();
    expect(screen.queryByText("My Sets")).not.toBeInTheDocument();
    expect(screen.queryByText("Study Tools")).not.toBeInTheDocument();
  });
});
