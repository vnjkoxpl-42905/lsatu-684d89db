import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryScroll, StorySection } from "./story-scroll";

const mockMatchMedia = (reducedMotion: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StoryScroll", () => {
  it("stacks landing panels as accessible, sticky, z-ordered cards", () => {
    mockMatchMedia(false);

    render(
      <StoryScroll aria-label="Landing story">
        <StorySection aria-label="Hero">Hero content</StorySection>
        <StorySection aria-label="Preview">Preview content</StorySection>
      </StoryScroll>,
    );

    const story = screen.getByRole("main", { name: "Landing story" });
    const hero = screen.getByRole("region", { name: "Hero" });
    const preview = screen.getByRole("region", { name: "Preview" });

    expect(story).toHaveAttribute("data-story-scroll");

    // Panels are injected with their stacking index and pin to the viewport top.
    expect(hero).toHaveAttribute("data-story-index", "0");
    expect(preview).toHaveAttribute("data-story-index", "1");
    expect(hero).toHaveClass("sticky", "min-h-screen");
    expect(preview).toHaveClass("sticky", "min-h-screen");

    // Later panels render above earlier ones so they cover them as they slide up.
    expect((hero as HTMLElement).style.zIndex).toBe("1");
    expect((preview as HTMLElement).style.zIndex).toBe("2");

    // The base panel is flush; every panel after it gets the soft card edge.
    expect(hero).not.toHaveClass("rounded-t-[28px]");
    expect(preview).toHaveClass("rounded-t-[28px]");

    expect(screen.getByText("Hero content")).toBeInTheDocument();
    expect(screen.getByText("Preview content")).toBeInTheDocument();
  });

  it("collapses to normal document flow under reduced motion", () => {
    mockMatchMedia(true);

    render(
      <StoryScroll aria-label="Landing story">
        <StorySection aria-label="Hero">Hero content</StorySection>
        <StorySection aria-label="Preview">Preview content</StorySection>
      </StoryScroll>,
    );

    const hero = screen.getByRole("region", { name: "Hero" });
    const preview = screen.getByRole("region", { name: "Preview" });

    expect(hero).toHaveClass("relative");
    expect(hero).not.toHaveClass("sticky");
    expect(preview).not.toHaveClass("sticky");
    expect((hero as HTMLElement).style.zIndex).toBe("");
    expect(screen.getByText("Preview content")).toBeInTheDocument();
  });
});
