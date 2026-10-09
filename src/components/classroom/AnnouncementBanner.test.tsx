import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnouncementBannerView } from "./AnnouncementBanner";

// Split out of ClassroomHomeCards.test.tsx when that component was retired
// with the Home rebuild. The banner itself still sits on Home, so its cases
// travel here rather than being deleted alongside it.
describe("AnnouncementBannerView", () => {
  it("renders nothing when there is no announcement", () => {
    const { container } = render(
      <AnnouncementBannerView announcement={null} onOpen={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the post and opens it", () => {
    const onOpen = vi.fn();
    render(
      <AnnouncementBannerView
        announcement={{
          id: "abc",
          title: "New: full section timer",
          description: "Every drill can now run on a section clock.",
          created_at: "2026-08-01T12:00:00Z",
        }}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByText("New: full section timer"));
    expect(onOpen).toHaveBeenCalledWith("abc");
  });
});
