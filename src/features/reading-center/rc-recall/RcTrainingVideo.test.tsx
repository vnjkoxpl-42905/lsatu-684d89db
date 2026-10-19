import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RcTrainingVideo from "./RcTrainingVideo";

describe("RC Training video", () => {
  it("uses local media with user-controlled playback and a written alternative", () => {
    const { container } = render(<MemoryRouter><RcTrainingVideo compact /></MemoryRouter>);
    const video = screen.getByLabelText("RC Training demonstration");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).not.toHaveAttribute("autoplay");
    expect(container.querySelector("source")).toHaveAttribute("src", "/media/rc-training-demo.mp4");
    expect(container.querySelector("track")).toHaveAttribute("kind", "captions");
    expect(screen.getByRole("link", { name: "Read the written steps" })).toHaveAttribute("href", "/reading-center/rc-recall/instructions#rc-instructions-steps");
    expect(video).toHaveAccessibleDescription(/not a practice time limit/i);
  });

  it("provides the written route when the video cannot load", () => {
    render(<MemoryRouter><RcTrainingVideo /></MemoryRouter>);
    fireEvent.error(screen.getByLabelText("RC Training demonstration"));
    expect(screen.getByRole("status")).toHaveTextContent(/could not be loaded/);
    expect(screen.getByRole("link", { name: "Read the written steps" })).toBeInTheDocument();
  });
});
