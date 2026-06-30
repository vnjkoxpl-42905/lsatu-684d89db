import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StudentShell from "./StudentShell";

const mockNavigate = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "student-1", email: "student@example.com" },
    authReady: true,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => new Promise(() => {}),
        }),
      }),
    }),
  },
}));

vi.mock("@/components/mainhub/GuidedTour", () => ({
  hasSeenTour: () => true,
  startTour: vi.fn(),
}));

vi.mock("@/components/mainhub/MainhubSidebar", () => ({
  default: () => <nav>Sidebar</nav>,
}));

vi.mock("@/components/mainhub/MainhubDock", () => ({
  default: () => <div>Dock</div>,
}));

vi.mock("@/components/mainhub/StudySidecar", () => ({
  default: ({ width, open }: { width?: number; open: boolean }) =>
    open ? <aside data-testid="study-sidecar" style={{ width }} /> : null,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/mainhub"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route element={<StudentShell />}>
          <Route path="/mainhub" element={<div>Mainhub content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("StudentShell sidecar resizing", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollTo = vi.fn();
    window.localStorage.clear();
    mockNavigate.mockReset();
    vi.stubGlobal("innerWidth", 1440);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("resizes the docked communication rail and persists the chosen width", async () => {
    renderShell();

    expect(screen.getByTestId("study-sidecar")).toHaveStyle({ width: "420px" });

    const handle = screen.getByRole("button", { name: "Resize communication rail" });
    act(() => {
      handle.dispatchEvent(
        new MouseEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 900,
        }),
      );
      window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 720 }));
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });

    expect(screen.getByTestId("study-sidecar")).toHaveStyle({ width: "600px" });
    await waitFor(() => {
      expect(window.localStorage.getItem("lsatu:sidecarWidth")).toBe("600");
    });

    fireEvent.doubleClick(handle);

    expect(screen.getByTestId("study-sidecar")).toHaveStyle({ width: "420px" });
  });
});
