import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryScroll, StorySection } from "./story-scroll";

describe("StoryScroll", () => {
  it("renders existing landing sections as accessible, unclipped story panels", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(
      <StoryScroll aria-label="Landing story">
        <StorySection aria-label="Hero" settle={false}>
          Hero content
        </StorySection>
        <StorySection aria-label="Preview" pin={false}>
          Preview content
        </StorySection>
      </StoryScroll>,
    );

    const story = screen.getByRole("main", { name: "Landing story" });
    const hero = screen.getByRole("region", { name: "Hero" });
    const preview = screen.getByRole("region", { name: "Preview" });
    const heroInner = hero.querySelector("[data-story-inner]");

    expect(story).toHaveAttribute("data-story-scroll");
    expect(story).toHaveClass("bg-inherit");
    expect(hero).toHaveClass("overflow-hidden", "bg-inherit");
    expect(heroInner).toHaveClass("flex", "justify-center");
    expect(hero).toHaveAttribute("data-story-settle", "false");
    expect(preview).toHaveAttribute("data-story-pin", "false");
    expect(screen.getByText("Hero content")).toBeInTheDocument();
    expect(screen.getByText("Preview content")).toBeInTheDocument();
  });
});
