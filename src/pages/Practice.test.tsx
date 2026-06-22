import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PracticeHubContent } from "./Practice";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "student-1",
      email: "student@example.com",
      user_metadata: { display_name: "Student User" },
    },
    authReady: true,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/QuestionBankContext", () => ({
  useQuestionBank: () => ({
    manifest: null,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
  }),
}));

vi.mock("@/hooks/useClassId", () => ({
  useClassId: () => ({ classId: "student-1", loading: false }),
}));

vi.mock("@/hooks/useLastActivity", () => ({
  useLastActivity: () => ({ data: null }),
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({
    has_waj_access: true,
    has_flagged_access: true,
    has_analytics_access: true,
  }),
}));

vi.mock("@/components/dashboard/RecentPerformanceWidget", () => ({
  RecentPerformanceWidget: () => <div>Recent performance</div>,
}));

vi.mock("@/components/ui/splite", () => ({
  SplineScene: () => <div aria-hidden="true" />,
}));

vi.mock("@/integrations/supabase/client", () => {
  const makeChain = (table: string) => {
    const chain: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      maybeSingle: ReturnType<typeof vi.fn>;
    } = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => (table === "attempts" ? Promise.resolve({ data: [] }) : chain)),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { display_name: "Student User" } })),
    };
    return chain;
  };

  return {
    supabase: {
      from: vi.fn((table: string) => makeChain(table)),
    },
  };
});

const renderPractice = (embedded = false) =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <PracticeHubContent embedded={embedded} onBackToMainHub={embedded ? vi.fn() : undefined} />
    </MemoryRouter>,
  );

describe("PracticeHubContent", () => {
  it("renders the standalone Practice header on /practice", async () => {
    renderPractice(false);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back to Main Hub/i })).toBeInTheDocument();
    expect(screen.getByText("LR Smart Drill")).toBeInTheDocument();
    expect(screen.getByText("Full Section")).toBeInTheDocument();
    expect(await screen.findByText("No attempts yet.")).toBeInTheDocument();
  });

  it("omits the standalone header when embedded in Main Hub", async () => {
    renderPractice(true);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.getByText("LR Smart Drill")).toBeInTheDocument();
    expect(screen.getByText("Smart Builder")).toBeInTheDocument();
    expect(screen.getByText("Study Tools")).toBeInTheDocument();
    expect(await screen.findByText("No attempts yet.")).toBeInTheDocument();
  });
});
