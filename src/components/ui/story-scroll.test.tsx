import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryScroll, StorySection } from "./story-scroll";

describe("StoryScroll", () => {
  it("renders existing landing sections as accessible story panels", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(
      <StoryScroll aria-label="Landing story">
        <StorySection aria-label="Hero">Hero content</StorySection>
        <StorySection aria-label="Preview">Preview content</StorySection>
      </StoryScroll>,
    );

    expect(screen.getByRole("main", { name: "Landing story" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Hero" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByText("Hero content")).toBeInTheDocument();
    expect(screen.getByText("Preview content")).toBeInTheDocument();
  });
});
