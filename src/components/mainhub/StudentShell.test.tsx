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
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 2000,
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

  it("caps the drag so the center stage keeps its full-template width", () => {
    // 1680px window: max sidecar = 1680 - 240 sidebar - 24 chrome - 980 stage = 436.
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1680 });
    renderShell();

    const handle = screen.getByRole("button", { name: "Resize communication rail" });
    act(() => {
      handle.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, clientX: 900 }),
      );
      window.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 400 }));
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });

    expect(screen.getByTestId("study-sidecar")).toHaveStyle({ width: "436px" });
  });

  it("auto-hides the docked rail on narrow windows and opens it as a floating overlay", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1440 });
    renderShell();

    // No docked sidecar and no resize handle in the narrow band.
    expect(screen.queryByTestId("study-sidecar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Resize communication rail" })).toBeNull();

    // The header toggle opens the floating overlay instead.
    fireEvent.click(screen.getByRole("button", { name: "Open LSAT U chat" }));
    const sidecar = screen.getByTestId("study-sidecar");
    expect(sidecar).not.toHaveStyle({ width: "420px" });
  });
});
