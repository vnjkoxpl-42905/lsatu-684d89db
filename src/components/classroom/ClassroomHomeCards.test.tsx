import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarClock, RotateCcw, Target } from "lucide-react";
import { ClassroomHomeCardsView, type HomeCard } from "./ClassroomHomeCards";
import { AnnouncementBannerView } from "./AnnouncementBanner";

const cards: HomeCard[] = [
  {
    key: "session",
    icon: CalendarClock,
    title: "Next session",
    stat: "Tuesday, 4 August, 5:00 p.m.",
    action: "View booking",
    route: "/booking",
  },
  {
    key: "drilling",
    icon: Target,
    title: "Drilling",
    stat: "Start a set",
    action: "Timed and untimed question practice",
    route: "/classroom/drill",
  },
  {
    key: "wrong",
    icon: RotateCcw,
    title: "Wrong answers",
    stat: "23 waiting",
    action: "Work back through them",
    route: "/journal",
  },
];

describe("ClassroomHomeCardsView", () => {
  it("renders each card and routes on click", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeCardsView cards={cards} onOpen={onOpen} />);
    expect(screen.getByText("Next session")).toBeTruthy();
    expect(screen.getByText("23 waiting")).toBeTruthy();
    fireEvent.click(screen.getByText("Drilling"));
    expect(onOpen).toHaveBeenCalledWith("/classroom/drill");
  });

  it("keeps a three-card row three-up, and squares off at four", () => {
    const { container, rerender } = render(
      <ClassroomHomeCardsView cards={cards} onOpen={vi.fn()} />,
    );
    expect(container.querySelector(".classroom-quick-cards-two")).toBeNull();

    rerender(
      <ClassroomHomeCardsView
        cards={[...cards, { ...cards[0], key: "bootcamps", title: "Bootcamps" }]}
        onOpen={vi.fn()}
      />,
    );
    expect(container.querySelector(".classroom-quick-cards-two")).toBeTruthy();
  });
});

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
